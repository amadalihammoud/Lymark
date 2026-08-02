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
import { saveToDeviceGallery, shareWatermarkedPhoto } from '@/features/watermark/export-photo';
import { renderStampedPhoto } from '@/features/watermark/render-photo';
import { STAMP_COLORS } from '@/features/watermark/stamp-canvas';
import { createStampRenderer, useStampFontProvider } from '@/features/watermark/skia-stamp';
import { useAddressLookup, type AddressLookupStatus } from '@/hooks/use-address-lookup';
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
  const { draft, hasPhoto, setPhoto, setField, regenerateCode, syncDateTime, resetDraft } =
    useCapture();
  const { preferences } = useSettings();
  const { addEntry } = useGallery();
  // O `status` do hook serve ao indicador de carregamento; a causa da falha
  // vem do retorno do `lookup`, que é o desfecho daquela chamada.
  const { lookup, isLoading: locating } = useAddressLookup();

  const [pending, setPending] = useState<PendingAction | null>(null);
  /**
   * Câmera ou seletor abertos.
   *
   * Entre o toque e a tela nativa aparecer não há retorno nenhum, e num
   * aparelho lento o usuário toca de novo. A segunda chamada concorre com a
   * primeira e o app avisa "não foi possível abrir a foto" enquanto a câmera
   * está justamente abrindo.
   */
  const [picking, setPicking] = useState(false);
  const fontProvider = useStampFontProvider();
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

  /**
   * O usuário digitou o próprio código.
   *
   * O campo é editável, e quem o preenche à mão costuma estar amarrando a foto
   * a uma ordem de serviço. Ressortear em cima disso destruiria o vínculo sem
   * avisar — então a renovação automática só vale para o código que o próprio
   * app gerou.
   */
  const codeEdited = useRef(false);
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
        if (isFirstPhoto) {
          syncDateTime();
        } else if (!codeEdited.current) {
          // Foto nova, código novo. Sem isto, quem fotografa o segundo item
          // sem passar por "Começar nova captura" exporta duas imagens com o
          // mesmo identificador — e o campo existe justamente para distinguir
          // uma foto da outra fora do app.
          regenerateCode();
        }
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

    // Outra busca começou, ou a captura foi reiniciada: a resposta caducou.
    if (token !== lookupToken.current) return;

    if (!address) {
      // O desfecho vem da própria chamada. Ler o `status` do estado daria a
      // causa da tentativa anterior — o mapa de mensagens existe justamente
      // para dar a saída certa a cada motivo.
      Alert.alert('Endereço não obtido', LOOKUP_MESSAGES[status] || LOOKUP_MESSAGES.unavailable);
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
            codeEdited.current = false;
            resetDraft();
          },
        },
      ],
    );
  }, [resetDraft]);

  const runAction = async (action: PendingAction) => {
    const photo = draft.photo;
    // As fontes do carimbo são as mesmas do desenho na tela; sem elas o
    // arquivo sairia com a tipografia errada, e a geometria foi medida para
    // estas. Melhor não exportar do que exportar torto.
    if (!photo || !fontProvider) {
      Alert.alert('Aguarde um instante', 'O carimbo ainda está sendo preparado.');
      return;
    }

    // Invalida qualquer busca de endereço em curso. A imagem é rasterizada a
    // partir da árvore de views viva: se o GPS respondesse durante a geração,
    // a foto sairia com o endereço novo e o histórico registraria o antigo —
    // divergência inaceitável num registro documental.
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
      // O histórico registra sempre, em qualquer das duas ações: é a rede de
      // segurança contra perder uma captura por causa de uma permissão negada
      // ou de um compartilhamento cancelado.
      addEntry({ path, metadata: draft.metadata, stampedFields });

      if (action === 'save') {
        const outcome = await saveToDeviceGallery(path);
        // Cada desfecho tem uma causa diferente e um remédio diferente. Dizer
        // "permissão negada" para todos mandava o usuário a um ajuste que já
        // estava correto.
        if (outcome.status === 'saved') {
          Alert.alert('Foto salva', 'A imagem está na galeria do aparelho e no histórico.');
        } else if (outcome.status === 'denied') {
          Alert.alert(
            'Salva apenas no Lymark',
            'O acesso às fotos foi negado, então a imagem existe só dentro do app. Libere em Configurações › Permissões para salvar na galeria.',
          );
        } else {
          Alert.alert(
            'Salva apenas no Lymark',
            'A imagem entrou no histórico, mas o aparelho recusou gravá-la na galeria. Verifique o espaço livre e tente de novo.',
          );
        }
        return;
      }

      const outcome = await shareWatermarkedPhoto(path);
      if (outcome.status === 'unavailable') {
        Alert.alert(
          'Compartilhamento indisponível',
          'Este aparelho não oferece a folha de compartilhamento. A imagem ficou no histórico do Lymark.',
        );
      } else if (outcome.status === 'failed') {
        // A imagem existe e já está no histórico. Chamar isto de "falha ao
        // gerar" faria o usuário exportar de novo e duplicar o registro.
        Alert.alert(
          'Não foi possível compartilhar',
          'A imagem foi gerada e está no histórico do Lymark. Você pode compartilhá-la pela aba Galeria.',
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
