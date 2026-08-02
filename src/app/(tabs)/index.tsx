import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/brand/app-header';
import { CaptureActions } from '@/components/capture/capture-actions';
import { MetadataForm } from '@/components/capture/metadata-form';
import { PhotoPreview } from '@/components/capture/photo-preview';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { useCapture } from '@/contexts/capture-context';
import { useGallery } from '@/contexts/gallery-context';
import { useSettings } from '@/contexts/settings-context';
import {
  pickPhotoFromLibrary,
  takePhotoWithCamera,
  type PhotoPickResult,
} from '@/features/capture/photo-source';
import { buildWatermarkContent } from '@/features/watermark/build-content';
import {
  generateWatermarkedPhoto,
  saveToDeviceGallery,
  shareWatermarkedPhoto,
} from '@/features/watermark/export-photo';
import { useAddressLookup, type AddressLookupStatus } from '@/hooks/use-address-lookup';
import { colors, spacing, typography } from '@/theme';
import { WATERMARK_FIELD_KEYS } from '@/types';

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
  const { draft, hasPhoto, setPhoto, setField, regenerateCode, syncDateTime, resetDraft } =
    useCapture();
  const { preferences } = useSettings();
  const { addEntry } = useGallery();
  const { lookup, status: lookupStatus, isLoading: locating } = useAddressLookup();

  const previewRef = useRef<View>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const busy = pending !== null;

  /**
   * Identifica a busca de endereço em curso.
   *
   * O GPS pode demorar segundos dentro de um galpão. Sem este controle, a
   * resposta atrasada sobrescreveria em silêncio um endereço que o usuário
   * digitou à mão enquanto esperava — dado errado carimbado em prova
   * documental — ou reapareceria dentro de uma captura já reiniciada.
   */
  const lookupToken = useRef(0);
  const addressRef = useRef(draft.metadata.address);
  useEffect(() => {
    addressRef.current = draft.metadata.address;
  }, [draft.metadata.address]);

  // O que efetivamente vai para a foto: campo ligado nas preferências **e**
  // com conteúdo. É a mesma função que o carimbo usa, então não diverge.
  const content = buildWatermarkContent(draft.metadata, preferences);
  const stampedFields = WATERMARK_FIELD_KEYS.filter((key) => content[key] !== null);

  const applyPickResult = (result: PhotoPickResult) => {
    switch (result.status) {
      case 'selected': {
        // Só realinha o relógio na primeira foto. Trocar a foto de uma
        // captura em andamento não pode apagar uma hora que o usuário
        // corrigiu à mão — para isso existe o botão "Agora".
        const isFirstPhoto = !hasPhoto;
        setPhoto(result.photo);
        if (isFirstPhoto) syncDateTime();
        break;
      }
      case 'denied':
        Alert.alert(
          'Permissão necessária',
          'Libere o acesso em Configurações › Permissões para continuar.',
        );
        break;
      case 'failed':
        Alert.alert('Não deu certo', 'Não foi possível abrir a foto. Tente novamente.');
        break;
      case 'cancelled':
        break;
    }
  };

  const handleLocate = async () => {
    const token = lookupToken.current + 1;
    lookupToken.current = token;

    const addressWhenRequested = addressRef.current;
    const address = await lookup();

    // Outra busca começou, ou a captura foi reiniciada: a resposta caducou.
    if (token !== lookupToken.current) return;

    if (!address) {
      Alert.alert(
        'Endereço não obtido',
        LOOKUP_MESSAGES[lookupStatus] || LOOKUP_MESSAGES.unavailable,
      );
      return;
    }

    // O usuário digitou enquanto o GPS respondia. O que ele escreveu vale
    // mais que uma aproximação — mas ele decide.
    if (addressRef.current !== addressWhenRequested && addressRef.current.trim()) {
      Alert.alert('Substituir o endereço digitado?', `O GPS encontrou:\n\n${address}`, [
        { text: 'Manter o meu', style: 'cancel' },
        { text: 'Usar o do GPS', onPress: () => setField('address', address) },
      ]);
      return;
    }

    setField('address', address);
  };

  const handleReset = useCallback(() => {
    // Único caminho do app que descarta trabalho ainda não exportado, e logo
    // abaixo dos botões de ação. Confirmar não é excesso de zelo.
    Alert.alert(
      'Começar nova captura?',
      'A foto escolhida e os campos preenchidos serão descartados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: () => {
            // Invalida qualquer busca pendente: a resposta não pode cair na
            // captura nova.
            lookupToken.current += 1;
            resetDraft();
          },
        },
      ],
    );
  }, [resetDraft]);

  const runAction = async (action: PendingAction) => {
    setPending(action);
    try {
      const path = await generateWatermarkedPhoto(previewRef);
      // O histórico registra sempre, em qualquer das duas ações: é a rede de
      // segurança contra perder uma captura por causa de uma permissão negada
      // ou de um compartilhamento cancelado.
      addEntry({ path, metadata: draft.metadata, stampedFields });

      if (action === 'save') {
        const saved = await saveToDeviceGallery(path);
        Alert.alert(
          saved ? 'Foto salva' : 'Salva apenas no Lymark',
          saved
            ? 'A imagem está na galeria do aparelho e no histórico do Lymark.'
            : 'A imagem entrou no histórico do Lymark, mas o acesso às fotos foi negado — ela existe apenas dentro do app.',
        );
        return;
      }

      const shared = await shareWatermarkedPhoto(path);
      if (!shared) {
        Alert.alert(
          'Compartilhamento indisponível',
          'Este aparelho não oferece a folha de compartilhamento. A imagem ficou no histórico do Lymark.',
        );
      }
    } catch (error) {
      Alert.alert(
        'Falha ao gerar a imagem',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    } finally {
      setPending(null);
    }
  };

  const requestAction = (action: PendingAction) => {
    if (!hasPhoto || busy) return;

    if (content.isEmpty) {
      Alert.alert(
        'A foto sairá sem marca d’água',
        'Nenhum campo tem conteúdo para carimbar. Preencha os campos ou reveja Configurações › Campos e posição.',
        [
          { text: 'Voltar', style: 'cancel' },
          { text: 'Continuar assim', onPress: () => void runAction(action) },
        ],
      );
      return;
    }

    void runAction(action);
  };

  return (
    <Screen>
      <AppHeader tagline="Marca d’água com hora, data e local" />

      <PhotoPreview
        ref={previewRef}
        photo={draft.photo}
        metadata={draft.metadata}
        preferences={preferences}
      />

      <CaptureActions
        busy={busy}
        onTakePhoto={async () => applyPickResult(await takePhotoWithCamera())}
        onPickFromLibrary={async () => applyPickResult(await pickPhotoFromLibrary())}
      />

      <MetadataForm
        metadata={draft.metadata}
        visibleFields={preferences.visibleFields}
        onChangeField={setField}
        onSyncDateTime={syncDateTime}
        onRegenerateCode={regenerateCode}
        onLocate={handleLocate}
        locating={locating}
        // Mexer nos campos durante a captura nativa faria o carimbo da
        // imagem divergir do que está na tela.
        disabled={busy}
      />

      {content.isEmpty ? (
        <Text style={styles.warning}>
          Nenhum dado será carimbado — a foto sairá sem marca d’água.
        </Text>
      ) : null}

      {/* Duas ações, dois destinos. "Exportar" não dizia para onde a foto ia. */}
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
          variant="primaryAlt"
          onPress={() => requestAction('share')}
          disabled={!hasPhoto || pending === 'save'}
          loading={pending === 'share'}
          style={styles.action}
        />
      </View>

      {hasPhoto ? (
        <Button
          label="Começar nova captura"
          icon="refresh"
          variant="ghost"
          onPress={handleReset}
          // Desmontar o preview no meio da captura derrubaria a geração e o
          // usuário perderia a foto e o rascunho de uma vez.
          disabled={busy}
        />
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
