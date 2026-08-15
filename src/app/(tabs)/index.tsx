import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useTranslations } from 'use-intl';

import { AppHeader } from '@/components/brand/app-header';
import { CaptureActions } from '@/components/capture/capture-actions';
import { MetadataForm } from '@/components/capture/metadata-form';
import { PhotoPreview } from '@/components/capture/photo-preview';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { useCapture } from '@/contexts/capture-context';
import { useEntitlement } from '@/contexts/entitlement-context';
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
import { scriptForStamp } from '@/features/watermark/stamp-script';
import { useAddressLookup, type AddressLookupStatus } from '@/hooks/use-address-lookup';
import {
  WatermarkControls,
  WatermarkFieldToggles,
  CodePlacementControl,
} from '@/components/settings/watermark-controls';
import { useLayoutMode } from '@/lib/breakpoints';
import { canUseDeviceCamera, isDesktop } from '@/lib/file-storage';
import { colors, spacing, typography } from '@/theme';
import { WATERMARK_FIELD_KEYS, type WatermarkFieldKey } from '@/types';

/**
 * A chave de catálogo para cada motivo de falha do GPS.
 *
 * Chave, e não texto: uma constante de módulo é avaliada uma vez, na carga, e
 * congelaria as mensagens no idioma daquele instante. Trocar de idioma sem
 * reiniciar o app deixaria estes avisos — justamente os que a pessoa lê em
 * campo — na língua anterior.
 */
const LOOKUP_KEYS: Record<AddressLookupStatus, string | null> = {
  idle: null,
  loading: null,
  success: null,
  denied: 'lookup.denied',
  disabled: 'lookup.disabled',
  timeout: 'lookup.timeout',
  unavailable: 'lookup.unavailable',
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
  const t = useTranslations('app.capture');
  const tCommon = useTranslations('app.common');
  const tPlan = useTranslations('app.plan');
  const tApp = useTranslations('app');
  const router = useRouter();
  const { draft, hasPhoto, setPhoto, setField, regenerateCode, syncDateTime, resetDraft } =
    useCapture();
  const { preferences } = useSettings();
  const { addEntry } = useGallery();
  const { notify, ask } = useFeedback();
  const { access, recordExport } = useEntitlement();
  const { lookup, isLoading: locating } = useAddressLookup();

  const mode = useLayoutMode();
  const wide = mode !== 'phone';

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [picking, setPicking] = useState(false);
  /*
   * O alfabeto vem do conteúdo, e não do idioma escolhido: o endereço chega
   * do geocodificador no alfabeto do país onde a foto foi tirada. Interface
   * em português com endereço em cirílico é caso real.
   */
  const stampTypefaces = useStampTypefaces(scriptForStamp(draft.metadata, preferences));
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
          title: t('permissionTitle'),
          message: t('permissionMessage'),
          actions: [{ label: tCommon('gotIt') }],
        });
        break;
      case 'failed':
        notify(t('openFailed'), 'warning');
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
        title: t('addressFailedTitle'),
        message: t(LOOKUP_KEYS[status] ?? 'lookup.unavailable'),
        actions: [{ label: tCommon('gotIt') }],
      });
      return;
    }

    if (addressRef.current !== addressWhenRequested && addressRef.current.trim()) {
      ask({
        title: t('replaceAddressTitle'),
        message: t('replaceAddressMessage', { address }),
        actions: [
          { label: t('useGpsAddress'), onPress: () => setField('address', address) },
          { label: t('keepMyAddress'), variant: 'ghost' },
        ],
      });
      return;
    }

    setField('address', address);
  };

  const handleReset = useCallback(() => {
    ask({
      title: t('resetTitle'),
      message: t('resetMessage'),
      actions: [
        {
          label: t('resetConfirm'),
          destructive: true,
          onPress: () => {
            lookupToken.current += 1;
            codeEdited.current = false;
            resetDraft();
          },
        },
        { label: tCommon('cancel'), variant: 'ghost' },
      ],
    });
  }, [ask, resetDraft]);

  const handleBatchProcessing = useCallback(() => {
    router.push('/batch');
  }, [router]);

  /**
   * A foto já contabilizada nesta captura.
   *
   * Salvar e depois compartilhar a mesma foto é uma exportação, não duas —
   * são duas formas de entregar o mesmo registro. Comparar pela URI resolve
   * também o caso de a pessoa exportar de novo depois de mexer num campo: a
   * foto de origem é a mesma, e a cota não deve cobrar por isso.
   */
  const countedPhoto = useRef<string | null>(null);

  const runAction = async (action: PendingAction) => {
    const photo = draft.photo;
    if (!photo || !stampTypefaces) {
      notify(t('stampNotReady'), 'warning');
      return;
    }

    // O único caso em que o aplicativo recusa exportar. Documento vencido,
    // tolerância estourada e relógio adulterado rebaixam para o plano grátis
    // e passam por aqui com cota — quem barra é a cota, não a falha.
    if (!access.canExport && countedPhoto.current !== photo.uri) {
      ask({
        title: tPlan('exhausted'),
        message: tPlan('exhaustedMessage'),
        actions: [{ label: tCommon('gotIt') }],
      });
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

      // Conta depois de o carimbo existir, e nunca antes: uma falha de
      // renderização não pode consumir a cota de quem não recebeu foto
      // nenhuma.
      if (countedPhoto.current !== photo.uri) {
        countedPhoto.current = photo.uri;
        recordExport();
      }

      if (action === 'save') {
        const outcome = await saveToDeviceGallery(path);
        if (outcome.status === 'saved') {
          notify(t('saved'));
        } else if (outcome.status === 'denied') {
          ask({
            title: t('savedAppOnlyTitle'),
            message:
              t('galleryDenied'),
            actions: [{ label: tCommon('gotIt') }],
          });
        } else {
          ask({
            title: t('savedAppOnlyTitle'),
            message:
              t('galleryFailed'),
            actions: [{ label: tCommon('gotIt') }],
          });
        }
        return;
      }

      const outcome = await shareWatermarkedPhoto(path, {
          title: t('sharedFileTitle'),
          dialogTitle: t('shareDialogTitle'),
        });
      // 'shared' e 'cancelled' não avisam nada, de propósito: num caso deu
      // certo, no outro quem desistiu foi o usuário. Anunciar qualquer coisa
      // aqui seria comentar a própria escolha dele.
      if (outcome.status === 'unavailable') {
        ask({
          title: t('shareUnavailableTitle'),
          message:
            t('shareUnavailableMessage'),
          actions: [{ label: tCommon('gotIt') }],
        });
      } else if (outcome.status === 'failed') {
        ask({
          title: t('shareFailedTitle'),
          message:
            t('shareFailedMessage'),
          actions: [{ label: tCommon('gotIt') }],
        });
      }
    } catch (error) {
      ask({
        title: t('renderFailedTitle'),
        message: error instanceof Error ? error.message : tCommon('tryAgain'),
        actions: [{ label: tCommon('gotIt') }],
      });
    } finally {
      setPending(null);
    }
  };

  const requestAction = (action: PendingAction) => {
    if (!hasPhoto || busy) return;

    if (content.isEmpty) {
      ask({
        title: t('noFieldsTitle'),
        message:
          t('noFieldsMessage'),
        actions: [
          { label: t('noFieldsContinue'), onPress: () => void runAction(action) },
          { label: t('noFieldsBack'), variant: 'ghost' },
        ],
      });
      return;
    }

    void runAction(action);
  };

  const header = <AppHeader tagline={tApp('tagline')} />;

  const preview = (
    <PhotoPreview
      photo={draft.photo}
      metadata={draft.metadata}
      preferences={preferences}
      bounded={wide}
    />
  );

  const captureActions = (
    <CaptureActions
      busy={busy || picking}
      showCamera={canUseDeviceCamera()}
      onTakePhoto={() => void runPick(takePhotoWithCamera)}
      onPickFromLibrary={() => void runPick(pickPhotoFromLibrary)}
    />
  );

  const metadataForm = (
    <>
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
    </>
  );

  const exportActions = (
    <>
      {/* Duas ações, dois destinos. */}
      <View style={styles.actions}>
        <Button
          label={tCommon('save')}
          icon="download"
          variant="accent"
          onPress={() => requestAction('save')}
          disabled={!hasPhoto || pending === 'share'}
          loading={pending === 'save'}
          style={styles.action}
        />
        <Button
          label={tCommon('share')}
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
            label={t('newCapture')}
            icon="refresh"
            variant="ghost"
            onPress={handleReset}
            disabled={busy}
          />
          {isDesktop() && (
            <Button
              label={tApp('nav.batch')}
              icon="images"
              variant="primaryAlt"
              onPress={handleBatchProcessing}
              style={styles.batchButton}
            />
          )}
        </>
      ) : (
        <Text style={styles.hint}>{t('pickPhotoHint')}</Text>
      )}
    </>
  );

  // Em tela larga cada coluna responde a uma pergunta diferente, e é essa
  // divisão que decide o que vai onde: o OBJETO e o que age sobre ele, os
  // DADOS que entram no carimbo, e a APARÊNCIA dele.
  //
  // Por isso escolher, salvar e compartilhar ficam sob a foto, e não no meio
  // junto do formulário: agem sobre a imagem, não sobre os campos. De quebra
  // ocupam o vazio que sobrava embaixo do quadro, que numa foto deitada é
  // grande.
  //
  // A partir de 1280 entra a terceira coluna, com as preferências da marca
  // d'água. O ganho não é ocupar espaço: é ver o efeito de cada interruptor na
  // pré-visualização real no mesmo instante, em vez de ir a outra aba e voltar.
  //
  // O cabeçalho não aparece aqui: na tela larga ele é a barra que atravessa a
  // janela, montada em `(tabs)/_layout`.
  if (wide) {
    return (
      <Screen scrollable={false} contentStyle={styles.wide}>
        <View style={styles.previewColumn}>
          {preview}
          <View style={styles.photoActions}>
            {captureActions}
            {exportActions}
          </View>
        </View>

        {/* Cada coluna de controles rola por si só quando a janela é baixa
            demais. Assim a barra aparece só onde falta espaço, nunca na
            página inteira. */}
        <ScrollView
          style={styles.formColumn}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {metadataForm}

          {/* Os interruptores de campo ficam aqui, e não com as demais
              preferências: cada um liga um campo que está logo acima. O de
              "Hora" ao lado do valor da hora se explica sozinho; a duas
              colunas de distância, não. */}
          {mode === 'ultra' ? (
            <>
              <WatermarkFieldToggles />
              <CodePlacementControl />
            </>
          ) : null}
        </ScrollView>

        {mode === 'ultra' ? (
          <ScrollView
            style={styles.settingsColumn}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <WatermarkControls includeFields={false} includeReset={false} />
          </ScrollView>
        ) : null}
      </Screen>
    );
  }

  // No celular a ordem é a original: escolher, preencher, exportar. A divisão
  // em colunas não se aplica, e reordenar aqui mudaria o fluxo de quem já usa.
  return (
    <Screen>
      {header}
      {preview}
      {captureActions}
      {metadataForm}
      {exportActions}
    </Screen>
  );
}

const styles = StyleSheet.create({
  wide: {
    flexDirection: 'row',
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    // Numa janela muito larga as colunas iam para os extremos e abriam um
    // vazio no meio. O teto centralizado as mantém próximas, que é o que o uso
    // pede: olha-se de uma para a outra o tempo todo.
    width: '100%',
    maxWidth: 1560,
    alignSelf: 'center',
  },
  previewColumn: {
    flex: 1,
    // Permite encolher abaixo do tamanho natural do conteúdo; sem isto a foto
    // volta a ditar a altura da linha.
    minHeight: 0,
    gap: spacing.lg,
  },
  /**
   * As ações da foto, logo abaixo dela.
   *
   * Largura limitada porque a coluna acompanha a foto, que pode ser larga:
   * botões de mil pixels de comprimento não ficam mais fáceis de acertar, só
   * mais difíceis de ler.
   */
  photoActions: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    gap: spacing.md,
  },
  formColumn: {
    flex: 1,
    // Largura de leitura: o formulário não ganha nada em esticar mais.
    maxWidth: 440,
  },
  settingsColumn: {
    flex: 1,
    maxWidth: 380,
  },
  formContent: {
    gap: spacing.lg,
    // Espaço para o último controle não encostar na borda ao rolar.
    paddingBottom: spacing.lg,
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
