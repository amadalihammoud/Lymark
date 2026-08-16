import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslations } from 'use-intl';

import { Button } from '@/components/ui/button';
import { FieldRow } from '@/components/ui/field-row';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { useEntitlement } from '@/contexts/entitlement-context';
import { useFeedback } from '@/contexts/feedback-context';
import { useLocalePreference } from '@/contexts/locale-context';
import { useSettings } from '@/contexts/settings-context';
import { composeStampOverlay } from '@/features/watermark/render-overlay';
import { createStampRenderer, useStampTypefaces } from '@/features/watermark/skia-stamp';
import { loadStampImages } from '@/features/watermark/stamp-images';
import { scriptForStamp } from '@/features/watermark/stamp-script';
import { formatDate, formatTime, formatWeekday } from '@/lib/datetime';
import { isDesktop } from '@/lib/file-storage';
import { colors, spacing, typography } from '@/theme';
import type { CaptureMetadata, WatermarkFieldKey } from '@/types';
import { STAMP_LOCALE } from '@i18n/calendar';

/**
 * Vídeo carimbado — desktop, o primeiro degrau do plano.
 *
 * O carimbo é o MESMO da foto: desenhado pelo mesmo código, com as mesmas
 * preferências, num PNG transparente do tamanho do quadro
 * (`render-overlay.ts`). Quem compõe sobre o vídeo é o ffmpeg, no processo
 * principal — e é por isso que a tela só existe no desktop: web e celular
 * têm seus próprios caminhos, cada um com limites próprios, e virão depois.
 *
 * Data, hora e dia da semana vêm preenchidos da data de modificação do
 * arquivo — o análogo do EXIF do lote — e continuam editáveis, como tudo.
 */

type SelectedVideo = {
  path: string;
  name: string;
  width: number;
  height: number;
  durationMs: number;
};

/** Os campos de texto livre; data, hora e dia são preenchidos do arquivo. */
const SHARED_FIELDS: WatermarkFieldKey[] = ['code', 'address'];

const EMPTY_METADATA: CaptureMetadata = { code: '', address: '', date: '', time: '', weekday: '' };

export default function VideoScreen() {
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
    globalThis.window?.lymark?.onVideoProgress?.((percent) => setProgress(percent));
  }, []);

  if (!isDesktop()) {
    return (
      <Screen>
        <Text style={typography.screenTitle}>{t('unavailableTitle')}</Text>
        <Text style={typography.body}>{t('unavailableBody')}</Text>
      </Screen>
    );
  }

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

    // O análogo do EXIF do lote: a data de modificação do arquivo preenche
    // data, hora e dia da semana — do MESMO `Date`, para o carimbo nunca
    // contradizer a si próprio. Continua editável, como tudo.
    const modified = picked.modifiedMs ? new Date(picked.modifiedMs) : null;
    setMetadata((current) => ({
      ...current,
      date: modified ? formatDate(modified, stampLocale) : current.date,
      time: modified ? formatTime(modified) : current.time,
      weekday: modified ? formatWeekday(modified, stampLocale) : current.weekday,
    }));
  };

  const exportVideo = async () => {
    if (!video || busy) return;
    if (!stampTypefaces) {
      notify(tApp('common.error'), 'warning');
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
      <Section title={t('fileSection')}>
        <Button label={t('select')} variant="primary" icon="film-outline" onPress={() => void pick()} />
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
          <Section title={t('fieldsSection')}>
            {SHARED_FIELDS.map((field) => (
              <FieldRow
                key={field}
                label={tApp(`watermark.fields.${field}`)}
                value={metadata[field]}
                onChangeText={(value: string) =>
                  setMetadata((current) => ({ ...current, [field]: value }))
                }
              />
            ))}
            <View style={styles.row}>
              {(['date', 'time', 'weekday'] as const).map((field) => (
                <FieldRow
                  key={field}
                  label={tApp(`watermark.fields.${field}`)}
                  value={metadata[field]}
                  onChangeText={(value: string) =>
                    setMetadata((current) => ({ ...current, [field]: value }))
                  }
                  containerStyle={styles.rowItem}
                />
              ))}
            </View>
          </Section>

          <Section title={t('exportSection')}>
            {!access.canExport ? (
              <Text style={[typography.body, styles.warning]}>{tApp('plan.exhaustedMessage')}</Text>
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
