// A API clássica de caminhos e strings: é o contrato que o módulo nativo
// espera (caminhos simples), e a mesma que o resto do app usa.
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
// NÃO importar expo-media-library aqui em cima: na web o módulo lança na
// carga ("Cannot find native module 'ExpoMediaLibraryNext'") e derrubava a
// rota /video inteira — tela branca. Ele entra por import dinâmico, apenas
// no fluxo do celular, que é o único que salva na galeria por ele.
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useTranslations } from 'use-intl';

import { isVideoStampAvailable, stampVideo } from '@modules/video-stamp';

import { sealExportedVideo } from '@/features/attest/seal';

import { Button } from '@/components/ui/button';
import { FieldRow } from '@/components/ui/field-row';
import { Note } from '@/components/ui/note';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { useEntitlement } from '@/contexts/entitlement-context';
import { useFeedback } from '@/contexts/feedback-context';
import { useLocalePreference } from '@/contexts/locale-context';
import { useSettings } from '@/contexts/settings-context';
import { probeVideoFile, stampVideoInBrowser } from '@/features/video/stamp-video';
import { composeStampOverlay } from '@/features/watermark/render-overlay';
import { createStampRenderer, useStampTypefaces } from '@/features/watermark/skia-stamp';
import { loadStampImages } from '@/features/watermark/stamp-images';
import { scriptForStamp } from '@/features/watermark/stamp-script';
import { bytesToBase64 } from '@/lib/base64';
import { formatDate, formatTime, formatWeekday } from '@/lib/datetime';
import { isDesktop } from '@/lib/file-storage';
import { colors, spacing, typography } from '@/theme';
import type { CaptureMetadata, TimeFormat, WatermarkFieldKey } from '@/types';
import { STAMP_LOCALE } from '@i18n/calendar';

/**
 * Vídeo carimbado — desktop e web, cada um pelo seu caminho.
 *
 * O carimbo é o MESMO da foto nas duas rotas: desenhado pelo mesmo código,
 * com as mesmas preferências, num PNG transparente do tamanho do quadro
 * (`render-overlay.ts`). O que muda é quem compõe sobre o vídeo:
 *
 * - **Desktop**: o ffmpeg, no processo principal — rápido, MP4, vídeo longo.
 * - **Web**: o navegador, reproduzindo para um canvas e gravando em tempo
 *   real (`stamp-video.web.ts`) — WebM, e um vídeo de dois minutos leva dois
 *   minutos. O limite está dito na tela, com o desktop como saída.
 *
 * No celular o plano é outro — gravar já com o carimbo — e tem fase própria.
 *
 * Data, hora e dia da semana vêm preenchidos da data do arquivo — o análogo
 * do EXIF do lote — e continuam editáveis, como tudo.
 */

/** Os campos de texto livre; data, hora e dia são preenchidos do arquivo. */
const SHARED_FIELDS: WatermarkFieldKey[] = ['code', 'address'];

const EMPTY_METADATA: CaptureMetadata = { code: '', address: '', date: '', time: '', weekday: '' };

export default function VideoScreen() {
  if (isDesktop()) return <DesktopVideoScreen />;
  if (Platform.OS === 'web') return <WebVideoScreen />;
  return <MobileVideoScreen />;
}

/**
 * O relógio do arquivo vira os três campos do carimbo — do MESMO `Date`,
 * para data e dia da semana nunca se contradizerem no documento.
 */
type StampLocaleValue = (typeof STAMP_LOCALE)[keyof typeof STAMP_LOCALE];

function metadataFromFileClock(
  current: CaptureMetadata,
  modifiedMs: number | undefined,
  stampLocale: StampLocaleValue,
  timeFormat: TimeFormat,
): CaptureMetadata {
  if (!modifiedMs) return current;
  const modified = new Date(modifiedMs);
  return {
    ...current,
    date: formatDate(modified, stampLocale),
    time: formatTime(modified, timeFormat),
    weekday: formatWeekday(modified, stampLocale),
  };
}

function FieldsSection({
  metadata,
  onChange,
}: {
  metadata: CaptureMetadata;
  onChange: (next: Partial<CaptureMetadata>) => void;
}) {
  const t = useTranslations('app.video');
  const tApp = useTranslations('app');

  return (
    <Section title={t('fieldsSection')}>
      {SHARED_FIELDS.map((field) => (
        <FieldRow
          key={field}
          label={tApp(`watermark.fields.${field}`)}
          value={metadata[field]}
          onChangeText={(value: string) => onChange({ [field]: value })}
        />
      ))}
      <View style={styles.row}>
        {(['date', 'time', 'weekday'] as const).map((field) => (
          <FieldRow
            key={field}
            label={tApp(`watermark.fields.${field}`)}
            value={metadata[field]}
            onChangeText={(value: string) => onChange({ [field]: value })}
            containerStyle={styles.rowItem}
          />
        ))}
      </View>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Desktop: composição via ffmpeg no processo principal.
// ---------------------------------------------------------------------------

type SelectedVideo = {
  path: string;
  name: string;
  width: number;
  height: number;
  durationMs: number;
};

function DesktopVideoScreen() {
  const t = useTranslations('app.video');
  const tApp = useTranslations('app');
  const { notify } = useFeedback();
  const { preferences } = useSettings();
  const { access, recordExport } = useEntitlement();
  const { locale: uiLocale } = useLocalePreference();
  const stampLocale = STAMP_LOCALE[uiLocale];

  const [video, setVideo] = useState<SelectedVideo | null>(null);
  const [metadata, setMetadata] = useState<CaptureMetadata>(EMPTY_METADATA);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [savedPath, setSavedPath] = useState<string | null>(null);

  const stampTypefaces = useStampTypefaces(scriptForStamp(metadata, preferences));

  useEffect(() => {
    // O retorno cancela a inscrição: sem isso, cada visita à tela deixava um
    // ouvinte vivo chamando `setProgress` de um componente já desmontado.
    const unsubscribe = globalThis.window?.lymark?.onVideoProgress?.((percent) =>
      setProgress(percent),
    );
    return () => unsubscribe?.();
  }, []);

  const pick = async () => {
    const picked = await globalThis.window?.lymark?.pickVideo?.();
    if (!picked || picked.status === 'cancelled') return;
    if (picked.status === 'failed' || !picked.path || !picked.width || !picked.height) {
      notify(t('unreadable'), 'warning');
      return;
    }

    setSavedPath(null);
    setProgress(0);
    setVideo({
      path: picked.path,
      name: picked.name ?? picked.path,
      width: picked.width,
      height: picked.height,
      durationMs: picked.durationMs ?? 0,
    });
    setMetadata((current) => metadataFromFileClock(current, picked.modifiedMs, stampLocale, preferences.timeFormat));
  };

  const exportVideo = async () => {
    if (!video || busy) return;
    if (!stampTypefaces) {
      // As fontes do carimbo carregam de forma assíncrona; "Erro" faria a
      // pessoa achar que algo quebrou, quando basta esperar um instante.
      notify(tApp('capture.stampNotReady'), 'warning');
      return;
    }

    setBusy(true);
    setProgress(0);
    setSavedPath(null);
    try {
      const images = await loadStampImages(preferences.brandLogoPath);
      const overlay = await composeStampOverlay({
        width: video.width,
        height: video.height,
        metadata,
        preferences,
        renderer: createStampRenderer(stampTypefaces, images),
      });

      const result = await globalThis.window?.lymark?.watermarkVideo?.(
        video.path,
        overlay,
        video.durationMs,
      );

      if (result?.status === 'saved' && result.path) {
        // O selo de autenticidade, melhor esforço — o mesmo contrato da
        // foto: sem sessão ou sem rede, o vídeo fica como está.
        await sealExportedVideo(result.path);

        setSavedPath(result.path);
        // Um vídeo consome uma unidade da cota, como uma foto: o que se
        // cobra é o documento carimbado, não o formato dele.
        recordExport();
        notify(t('done'));
      } else if (result?.status === 'failed') {
        notify(t('failed'), 'warning');
      }
    } catch {
      notify(t('failed'), 'warning');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Section title={t('fileSection')} padded>
        {/* Trocar o arquivo no meio da composição deixaria o carimbo de um
            vídeo sobre outro — o botão espera a exportação terminar. */}
        <Button
          label={t('select')}
          variant="primary"
          icon="film-outline"
          onPress={() => void pick()}
          disabled={busy}
        />
        {video ? (
          <Text style={[typography.caption, styles.caption]}>
            {video.name} · {video.width}x{video.height}
          </Text>
        ) : (
          <Text style={[typography.caption, styles.caption]}>{t('none')}</Text>
        )}
      </Section>

      {video ? (
        <>
          <FieldsSection
            metadata={metadata}
            onChange={(next) => setMetadata((current) => ({ ...current, ...next }))}
          />

          <Section title={t('exportSection')} padded>
            {!access.canExport ? (
              <Note tone="critical">{tApp('plan.exhaustedMessage')}</Note>
            ) : null}
            <Button
              label={busy ? t('processing', { percent: progress }) : t('export')}
              variant="accent"
              loading={busy}
              disabled={!access.canExport || busy}
              onPress={() => void exportVideo()}
            />
            {savedPath ? (
              <Text style={[typography.caption, styles.caption]}>
                {t('saved', { path: savedPath })}
              </Text>
            ) : null}
          </Section>
        </>
      ) : null}
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Celular: vídeo da galeria, composto pelo módulo nativo (Media3 no Android).
// ---------------------------------------------------------------------------

type SelectedAsset = {
  uri: string;
  name: string;
  width: number;
  height: number;
};

function MobileVideoScreen() {
  const t = useTranslations('app.video');
  const tApp = useTranslations('app');
  const { notify } = useFeedback();
  const { preferences } = useSettings();
  const { access, recordExport } = useEntitlement();
  const { locale: uiLocale } = useLocalePreference();
  const stampLocale = STAMP_LOCALE[uiLocale];

  const [selected, setSelected] = useState<SelectedAsset | null>(null);
  const [metadata, setMetadata] = useState<CaptureMetadata>(EMPTY_METADATA);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const stampTypefaces = useStampTypefaces(scriptForStamp(metadata, preferences));

  // Sem o módulo (iOS por enquanto, ou Expo Go), a tela explica em vez de
  // quebrar — e aponta os caminhos que já existem.
  if (!isVideoStampAvailable) {
    return (
      <Screen>
        <Text style={typography.screenTitle}>{t('unavailableTitle')}</Text>
        <Text style={typography.body}>{t('unavailableBody')}</Text>
      </Screen>
    );
  }

  const pick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify(t('unreadable'), 'warning');
      return;
    }

    const response = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
    });
    if (response.canceled) return;

    const asset = response.assets?.[0];
    if (!asset || !asset.width || !asset.height) {
      notify(t('unreadable'), 'warning');
      return;
    }

    setSaved(false);
    setSelected({
      uri: asset.uri,
      name: asset.fileName ?? asset.uri.split('/').pop() ?? 'video',
      width: asset.width,
      height: asset.height,
    });

    // A galeria não entrega a data de gravação; o agora entra como ponto de
    // partida — editável, como tudo.
    setMetadata((current) => metadataFromFileClock(current, Date.now(), stampLocale, preferences.timeFormat));
  };

  /**
   * Gravar e carimbar: a câmera do sistema grava, e o vídeo cai NA MESMA
   * esteira do escolhido na galeria — campos preenchidos do relógio de
   * agora (o momento da gravação, desta vez de verdade) e editáveis antes
   * de exportar, que é a grande sacada do app. Desenhar o carimbo AO VIVO
   * sobre a gravação continua sem caminho na geração atual da câmera
   * (VisionCamera 5); gravar-e-carimbar entrega o mesmo resultado final.
   */
  const record = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      notify(t('cameraDenied'), 'warning');
      return;
    }

    const response = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
    });
    if (response.canceled) return;

    const asset = response.assets?.[0];
    if (!asset || !asset.width || !asset.height) {
      notify(t('unreadable'), 'warning');
      return;
    }

    setSaved(false);
    setSelected({
      uri: asset.uri,
      name: asset.fileName ?? asset.uri.split('/').pop() ?? 'video',
      width: asset.width,
      height: asset.height,
    });
    setMetadata((current) => metadataFromFileClock(current, Date.now(), stampLocale, preferences.timeFormat));
  };

  const exportVideo = async () => {
    if (!selected || busy) return;
    if (!stampTypefaces) {
      // As fontes do carimbo carregam de forma assíncrona; "Erro" faria a
      // pessoa achar que algo quebrou, quando basta esperar um instante.
      notify(tApp('capture.stampNotReady'), 'warning');
      return;
    }

    setBusy(true);
    setSaved(false);

    // Declarados fora do `try` para a limpeza no `finally` os alcançar: um
    // carimbo que falha no meio (codec sem suporte, permissão negada) deixava
    // o PNG do quadro inteiro e o MP4 órfãos no cache a cada tentativa.
    const stampBase = `${FileSystem.cacheDirectory}lymark-stamp-${Date.now()}`;
    const overlayUri = `${stampBase}.png`;
    const outputUri = `${stampBase}.mp4`;

    try {
      const images = await loadStampImages(preferences.brandLogoPath);
      const overlay = await composeStampOverlay({
        width: selected.width,
        height: selected.height,
        metadata,
        preferences,
        renderer: createStampRenderer(stampTypefaces, images),
      });

      // O overlay vai ao módulo por arquivo, não por bytes: atravessar a
      // ponte com um PNG de quadro inteiro em array seria cópia atrás de
      // cópia. O Transformer quer caminhos simples, sem esquema `file://`.
      await FileSystem.writeAsStringAsync(overlayUri, bytesToBase64(overlay), {
        encoding: 'base64',
      });

      await stampVideo(
        selected.uri,
        overlayUri.replace('file://', ''),
        outputUri.replace('file://', ''),
      );

      const MediaLibrary = await import('expo-media-library');
      await MediaLibrary.saveToLibraryAsync(outputUri);

      setSaved(true);
      recordExport();
      notify(t('done'));
    } catch {
      notify(t('failed'), 'warning');
    } finally {
      setBusy(false);
      // A cópia da galeria é a que fica — os temporários saem sempre, tenha
      // a exportação dado certo ou não.
      void FileSystem.deleteAsync(overlayUri, { idempotent: true });
      void FileSystem.deleteAsync(outputUri, { idempotent: true });
    }
  };

  return (
    <Screen>
      <Section title={t('fileSection')} padded>
        <Button
          label={t('record')}
          variant="primary"
          icon="videocam-outline"
          onPress={() => void record()}
          disabled={busy}
        />
        <Button
          label={t('select')}
          variant="primary"
          icon="film-outline"
          onPress={() => void pick()}
          disabled={busy}
        />
        {selected ? (
          <Text style={[typography.caption, styles.caption]}>
            {selected.name} · {selected.width}x{selected.height}
          </Text>
        ) : (
          <Text style={[typography.caption, styles.caption]}>{t('none')}</Text>
        )}
      </Section>

      {selected ? (
        <>
          <FieldsSection
            metadata={metadata}
            onChange={(next) => setMetadata((current) => ({ ...current, ...next }))}
          />

          <Section title={t('exportSection')} padded>
            {!access.canExport ? (
              <Note tone="critical">{tApp('plan.exhaustedMessage')}</Note>
            ) : null}
            <Button
              label={busy ? t('processingMobile') : t('export')}
              variant="accent"
              loading={busy}
              disabled={!access.canExport || busy}
              onPress={() => void exportVideo()}
            />
            {saved ? (
              <Text style={[typography.caption, styles.caption]}>{t('savedToGallery')}</Text>
            ) : null}
          </Section>
        </>
      ) : null}
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Web: reprodução para canvas + MediaRecorder, em tempo real.
// ---------------------------------------------------------------------------

type SelectedFile = {
  file: File;
  name: string;
  width: number;
  height: number;
  durationMs: number;
};

function WebVideoScreen() {
  const t = useTranslations('app.video');
  const tApp = useTranslations('app');
  const { notify } = useFeedback();
  const { preferences } = useSettings();
  const { access, recordExport } = useEntitlement();
  const { locale: uiLocale } = useLocalePreference();
  const stampLocale = STAMP_LOCALE[uiLocale];

  const [selected, setSelected] = useState<SelectedFile | null>(null);
  const [metadata, setMetadata] = useState<CaptureMetadata>(EMPTY_METADATA);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [savedName, setSavedName] = useState<string | null>(null);

  const stampTypefaces = useStampTypefaces(scriptForStamp(metadata, preferences));

  const pick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const info = await probeVideoFile(file);
      if (!info) {
        notify(t('unreadable'), 'warning');
        return;
      }
      setSavedName(null);
      setProgress(0);
      setSelected({ file, name: file.name, ...info });
      setMetadata((current) => metadataFromFileClock(current, file.lastModified, stampLocale, preferences.timeFormat));
    };
    input.click();
  };

  const exportVideo = async () => {
    if (!selected || busy) return;
    if (!stampTypefaces) {
      // As fontes do carimbo carregam de forma assíncrona; "Erro" faria a
      // pessoa achar que algo quebrou, quando basta esperar um instante.
      notify(tApp('capture.stampNotReady'), 'warning');
      return;
    }

    setBusy(true);
    setProgress(0);
    setSavedName(null);
    try {
      const images = await loadStampImages(preferences.brandLogoPath);
      const overlay = await composeStampOverlay({
        width: selected.width,
        height: selected.height,
        metadata,
        preferences,
        renderer: createStampRenderer(stampTypefaces, images),
      });

      const result = await stampVideoInBrowser({
        file: selected.file,
        overlay,
        fileName: selected.name,
        onProgress: setProgress,
      });

      if (result.status === 'saved') {
        setSavedName(result.fileName);
        recordExport();
        notify(t('done'));
      } else {
        notify(t('failed'), 'warning');
      }
    } catch {
      notify(t('failed'), 'warning');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Section title={t('fileSection')} padded>
        {/* O limite da web, dito antes do trabalho: tempo real, WebM, e o
            desktop como caminho para vídeo longo. */}
        <Note>{t('webNote')}</Note>
        <Button
          label={t('select')}
          variant="primary"
          icon="film-outline"
          onPress={pick}
          disabled={busy}
        />
        {selected ? (
          <Text style={[typography.caption, styles.caption]}>
            {selected.name} · {selected.width}x{selected.height}
          </Text>
        ) : (
          <Text style={[typography.caption, styles.caption]}>{t('none')}</Text>
        )}
      </Section>

      {selected ? (
        <>
          <FieldsSection
            metadata={metadata}
            onChange={(next) => setMetadata((current) => ({ ...current, ...next }))}
          />

          <Section title={t('exportSection')} padded>
            {!access.canExport ? (
              <Note tone="critical">{tApp('plan.exhaustedMessage')}</Note>
            ) : null}
            <Button
              label={busy ? t('processing', { percent: progress }) : t('export')}
              variant="accent"
              loading={busy}
              disabled={!access.canExport || busy}
              onPress={() => void exportVideo()}
            />
            {savedName ? (
              <Text style={[typography.caption, styles.caption]}>
                {t('saved', { path: savedName })}
              </Text>
            ) : null}
          </Section>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  caption: {
    color: colors.textMuted,
  },
  warning: {
    color: colors.danger,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rowItem: {
    flex: 1,
  },
});
