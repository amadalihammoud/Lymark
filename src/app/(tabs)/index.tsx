import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Link, useRouter } from 'expo-router';

import { AppHeader } from '@/components/brand/app-header';
import { CaptureActions } from '@/components/capture/capture-actions';
import { MetadataForm } from '@/components/capture/metadata-form';
import { PhotoPreview } from '@/components/capture/photo-preview';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { useCapture } from '@/contexts/capture-context';
import { useFeedback } from '@/contexts/feedback-context';
import { useGallery } from '@/contexts/gallery-context';
import { useSettings } from '@/contexts/settings-context';
import {
  pickPhotoFromLibrary,
  takePhotoWithCamera,
  type PhotoPickResult,
} from '@/features/capture/photo-source';
import { buildWatermarkContent } from '@/features/watermark/build-content';
import { saveToDeviceGallery, shareWatermarkedPhoto } from '@/features/watermark/export-photo';
import { renderStampedPhoto } from '@/features/watermark/render-photo';
import { STAMP_COLORS } from '@/features/watermark/stamp-canvas';
import { createStampRenderer, useStampTypefaces } from '@/features/watermark/skia-stamp';
import { useAddressLookup, type AddressLookupStatus } from '@/hooks/use-address-lookup';
import { canUseDeviceCamera, isDesktop } from '@/lib/file-storage';
import { colors, spacing, typography } from '@/theme';
import { WATERMARK_FIELD_KEYS, type WatermarkFieldKey } from '@/types';

/** Mensagem específica para cada motivo de falha do GPS. */
const LOOKUP_MESSAGES: Record<AddressLookupStatus, string> = {
  idle: '',
  loading: '',
  success: '',
  denied: 'Libere a localização em Configurações › Permissões, ou digite o endereço.',
  disabled: 'A localização do aparelho está desligada. Ligue nos ajustes rápidos e tente de novo.',
  timeout: 'O GPS não respondeu a tempo. Dentro de prédios costuma falhar — digite o endereço.',
  unavailable: 'Não foi possível resolver o endereço nesta posição. Digite manualmente.',
};

/** Qual ação está em curso — as duas geram imagem e não podem se sobrepor. */
type PendingAction = 'save' | 'share';

/**
 * A partir desta largura a tela vira duas colunas.
 *
 * Abaixo dela não há espaço para dividir sem espremer o formulário, e a coluna
 * única rolável — o desenho pensado para o celular — continua sendo o certo.
 */
const WIDE_LAYOUT_MIN_WIDTH = 900;

/**
 * Capturar — a tela inicial.
 *
 * Todo o estado mostrado aqui vem do `CaptureProvider`, na raiz. A tela em si
 * guarda apenas o que é efêmero e não faz sentido sobreviver à navegação: a
 * ação em andamento, a referência da view a ser capturada e o controle de qual
 * busca de endereço ainda é válida.
 */
export default function CaptureScreen() {
  const router = useRouter();
  const { draft, hasPhoto, setPhoto, setField, regenerateCode, syncDateTime, resetDraft } =
    useCapture();
  const { preferences } = useSettings();
  const { addEntry } = useGallery();
  const { notify, ask } = useFeedback();
  const { lookup, isLoading: locating } = useAddressLookup();

  const { width: windowWidth } = useWindowDimensions();
  const wide = windowWidth >= WIDE_LAYOUT_MIN_WIDTH;

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [picking, setPicking] = useState(false);
  const stampTypefaces = useStampTypefaces();
  const busy = pending !== null;

  /** Identifica a busca de endereço em curso. */
  const lookupToken = useRef(0);

  /** O usuário digitou o próprio código. */
  const codeEdited = useRef(false);
  const addressRef = useRef(draft.metadata.address);
  useEffect(() => {
    addressRef.current = draft.metadata.address;
  }, [draft.metadata.address]);

  const content = buildWatermarkContent(draft.metadata, preferences);
  const stampedFields = WATERMARK_FIELD_KEYS.filter((key) => content[key] !== null);

  const applyPickResult = (result: PhotoPickResult) => {
    switch (result.status) {
      case 'selected': {
        const isFirstPhoto = !hasPhoto;
        setPhoto(result.photo);
        if (isFirstPhoto) {
          syncDateTime();
        } else if (!codeEdited.current) {
          regenerateCode();
        }
        break;
      }
      case 'denied':
        ask({
          title: 'Permissão necessária',
          message: 'Libere o acesso em Configurações › Permissões para continuar.',
          actions: [{ label: 'Entendi' }],
        });
        break;
      case 'failed':
        notify('Não foi possível abrir a foto. Tente novamente.', 'warning');
        break;
      case 'cancelled':
        break;
    }
  };

  const handleChangeField = (key: WatermarkFieldKey, value: string) => {
    if (key === 'code') codeEdited.current = true;
    setField(key, value);
  };

  const runPick = async (open: () => Promise<PhotoPickResult>) => {
    if (picking || busy) return;
    setPicking(true);
    try {
      applyPickResult(await open());
    } finally {
      setPicking(false);
    }
  };

  const handleLocate = async () => {
    const token = lookupToken.current + 1;
    lookupToken.current = token;

    const addressWhenRequested = addressRef.current;
    const { status, address } = await lookup();

    if (token !== lookupToken.current) return;

    if (!address) {
      ask({
        title: 'Endereço não obtido',
        message: LOOKUP_MESSAGES[status] || LOOKUP_MESSAGES.unavailable,
        actions: [{ label: 'Entendi' }],
      });
      return;
    }

    if (addressRef.current !== addressWhenRequested && addressRef.current.trim()) {
      ask({
        title: 'Substituir o endereço digitado?',
        message: `O GPS encontrou:\n\n${address}`,
        actions: [
          { label: 'Usar o do GPS', onPress: () => setField('address', address) },
          { label: 'Manter o meu', variant: 'ghost' },
        ],
      });
      return;
    }

    setField('address', address);
  };

  const handleReset = useCallback(() => {
    ask({
      title: 'Começar nova captura?',
      message: 'A foto escolhida e os campos preenchidos serão descartados.',
      actions: [
        {
          label: 'Descartar',
          destructive: true,
          onPress: () => {
            lookupToken.current += 1;
            codeEdited.current = false;
            resetDraft();
          },
        },
        { label: 'Cancelar', variant: 'ghost' },
      ],
    });
  }, [ask, resetDraft]);

  const handleBatchProcessing = useCallback(() => {
    router.push('/batch');
  }, [router]);

  const runAction = async (action: PendingAction) => {
    const photo = draft.photo;
    if (!photo || !stampTypefaces) {
      notify('O carimbo ainda está sendo preparado.', 'warning');
      return;
    }

    lookupToken.current += 1;
    setPending(action);
    try {
      const path = await renderStampedPhoto({
        photoUri: photo.uri,
        metadata: draft.metadata,
        preferences,
        colors: STAMP_COLORS,
        renderer: createStampRenderer(stampTypefaces),
      });
      addEntry({ path, metadata: draft.metadata, stampedFields });

      if (action === 'save') {
        const outcome = await saveToDeviceGallery(path);
        if (outcome.status === 'saved') {
          notify('Foto salva na galeria do aparelho e no histórico.');
        } else if (outcome.status === 'denied') {
          ask({
            title: 'Salva apenas no Lymark',
            message:
              'O acesso às fotos foi negado, então a imagem existe só dentro do app. Libere em Configurações › Permissões para salvar na galeria.',
            actions: [{ label: 'Entendi' }],
          });
        } else {
          ask({
            title: 'Salva apenas no Lymark',
            message:
              'A imagem entrou no histórico, mas o aparelho recusou gravá-la na galeria. Verifique o espaço livre e tente de novo.',
            actions: [{ label: 'Entendi' }],
          });
        }
        return;
      }

      const outcome = await shareWatermarkedPhoto(path);
      // 'shared' e 'cancelled' não avisam nada, de propósito: num caso deu
      // certo, no outro quem desistiu foi o usuário. Anunciar qualquer coisa
      // aqui seria comentar a própria escolha dele.
      if (outcome.status === 'unavailable') {
        ask({
          title: 'Compartilhamento indisponível',
          message:
            'Este aparelho não oferece a folha de compartilhamento. A imagem ficou no histórico do Lymark.',
          actions: [{ label: 'Entendi' }],
        });
      } else if (outcome.status === 'failed') {
        ask({
          title: 'Não foi possível compartilhar',
          message:
            'A imagem foi gerada e está no histórico do Lymark. Você pode compartilhá-la pela aba Galeria.',
          actions: [{ label: 'Entendi' }],
        });
      }
    } catch (error) {
      ask({
        title: 'Falha ao gerar a imagem',
        message: error instanceof Error ? error.message : 'Tente novamente.',
        actions: [{ label: 'Entendi' }],
      });
    } finally {
      setPending(null);
    }
  };

  const requestAction = (action: PendingAction) => {
    if (!hasPhoto || busy) return;

    if (content.isEmpty) {
      ask({
        title: 'A foto sairá sem marca d’água',
        message:
          'Nenhum campo tem conteúdo para carimbar. Preencha os campos ou reveja Configurações › Campos e posição.',
        actions: [
          { label: 'Continuar assim', onPress: () => void runAction(action) },
          { label: 'Voltar', variant: 'ghost' },
        ],
      });
      return;
    }

    void runAction(action);
  };

  const header = <AppHeader tagline="Marca d’água com hora, data e local" />;

  const preview = (
    <PhotoPreview
      photo={draft.photo}
      metadata={draft.metadata}
      preferences={preferences}
      bounded={wide}
    />
  );

  const controls = (
    <>
      <CaptureActions
        busy={busy || picking}
        showCamera={canUseDeviceCamera()}
        onTakePhoto={() => void runPick(takePhotoWithCamera)}
        onPickFromLibrary={() => void runPick(pickPhotoFromLibrary)}
      />

      <MetadataForm
        metadata={draft.metadata}
        visibleFields={preferences.visibleFields}
        onChangeField={handleChangeField}
        onSyncDateTime={syncDateTime}
        onRegenerateCode={() => {
          codeEdited.current = false;
          regenerateCode();
        }}
        onLocate={handleLocate}
        locating={locating}
        disabled={busy}
      />

      {content.isEmpty ? (
        <Text style={styles.warning}>
          Nenhum dado será carimbado — a foto sairá sem marca d’água.
        </Text>
      ) : null}

      {/* Duas ações, dois destinos. */}
      <View style={styles.actions}>
        <Button
          label="Salvar"
          icon="download"
          variant="accent"
          onPress={() => requestAction('save')}
          disabled={!hasPhoto || pending === 'share'}
          loading={pending === 'save'}
          style={styles.action}
        />
        <Button
          label="Compartilhar"
          icon="share-social"
          variant="primary"
          onPress={() => requestAction('share')}
          disabled={!hasPhoto || pending === 'save'}
          loading={pending === 'share'}
          style={styles.action}
        />
      </View>

      {hasPhoto ? (
        <>
          <Button
            label="Começar nova captura"
            icon="refresh"
            variant="ghost"
            onPress={handleReset}
            disabled={busy}
          />
          {isDesktop() && (
            <Button
              label="Processamento em Lote"
              icon="images"
              variant="primaryAlt"
              onPress={handleBatchProcessing}
              style={styles.batchButton}
            />
          )}
        </>
      ) : (
        <Text style={styles.hint}>Escolha uma foto para habilitar as ações.</Text>
      )}
    </>
  );

  // Em tela larga, foto e controles dividem a janela lado a lado e nada rola.
  // Era a foto esticando junto com a largura que empurrava todo o resto para
  // fora: num quadro de largura cheia, a altura vem da proporção da imagem, e
  // numa janela de 1280 isso dava mais de mil e seiscentos pixels.
  if (wide) {
    return (
      <Screen scrollable={false} contentStyle={styles.wide}>
        <View style={styles.previewColumn}>
          {header}
          {preview}
        </View>

        {/* O formulário rola por si só quando a janela é baixa demais. Assim a
            barra aparece só nele, e só quando não há alternativa. */}
        <ScrollView
          style={styles.formColumn}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {controls}
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      {header}
      {preview}
      {controls}
    </Screen>
  );
}

const styles = StyleSheet.create({
  wide: {
    flexDirection: 'row',
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    // Numa janela muito larga as duas colunas iam para os extremos e abriam um
    // vazio no meio. O teto centralizado mantém foto e formulário próximos,
    // que é o que o uso pede: olha-se de um para o outro o tempo todo.
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
  },
  previewColumn: {
    flex: 1,
    // Permite encolher abaixo do tamanho natural do conteúdo; sem isto a foto
    // volta a ditar a altura da linha.
    minHeight: 0,
    gap: spacing.lg,
  },
  formColumn: {
    flex: 1,
    // Largura de leitura: o formulário não ganha nada em esticar mais.
    maxWidth: 460,
  },
  formContent: {
    gap: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  action: {
    flex: 1,
  },
  batchButton: {
    marginTop: spacing.sm,
  },
  warning: {
    ...typography.caption,
    color: colors.accent,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  hint: {
    ...typography.caption,
    textAlign: 'center',
  },
});
