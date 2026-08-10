import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
import { createStampRenderer, useStampFontProvider } from '@/features/watermark/skia-stamp';
import { useAddressLookup, type AddressLookupStatus } from '@/hooks/use-address-lookup';
import { isDesktop } from '@/lib/file-storage';
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

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [picking, setPicking] = useState(false);
  const fontProvider = useStampFontProvider();
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
    if (!photo || !fontProvider) {
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
        renderer: createStampRenderer(fontProvider),
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

  return (
    <Screen>
      <AppHeader tagline="Marca d’água com hora, data e local" />

      <PhotoPreview
        photo={draft.photo}
        metadata={draft.metadata}
        preferences={preferences}
      />

      <CaptureActions
        busy={busy || picking}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
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
