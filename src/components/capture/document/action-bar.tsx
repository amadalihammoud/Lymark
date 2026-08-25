import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslations } from 'use-intl';

import { Button } from '@/components/ui/button';
import { isDesktop } from '@/lib/file-storage';
import { colors, spacing } from '@/theme';

/**
 * A barra do documento: a ordem do trabalho, da esquerda para a direita.
 *
 * Abrir, conferir, exportar. A origem começa o trabalho e por isso mora à
 * esquerda, onde a leitura começa; só o par de SAÍDA fica à direita, longe
 * dela, para que nada seja clicado por vizinhança.
 *
 * Salvar é o último elemento e o único preenchimento âmbar da tela — a regra
 * do projeto é um acento por tela, reservado à ação principal. Por isso os
 * mapas do painel ao lado anunciam seleção por borda, e não por preenchimento.
 */
export function CaptureActionBar({
  source,
  hasPhoto,
  busy,
  pending,
  onSave,
  onShare,
  onReset,
  onVideo,
  onBatch,
}: {
  /**
   * Os botões de origem, montados pela tela.
   *
   * Vem por encaixe em vez de ser recriado aqui: é o mesmo `CaptureActions`
   * do celular, que já resolve sozinho se mostra a câmera e se o rótulo é
   * "Escolher da galeria" ou "Escolher foto".
   */
  source: ReactNode;
  hasPhoto: boolean;
  busy: boolean;
  pending: 'save' | 'share' | null;
  onSave: () => void;
  onShare: () => void;
  onReset: () => void;
  onVideo: () => void;
  onBatch: () => void;
}) {
  const t = useTranslations('app');
  const tCommon = useTranslations('app.common');

  return (
    <View style={styles.bar}>
      <View style={styles.source}>{source}</View>

      {/* Nova captura é sobre a FONTE — trocar a foto —, por isso fica deste
          lado. Do outro, o par de saída fica puro. */}
      <Button
        label={t('capture.newCapture')}
        icon="refresh"
        iconOnly
        variant="ghost"
        onPress={onReset}
        disabled={!hasPhoto || busy}
      />

      {/*
        O centro é onde o seletor Foto | Vídeo | Lote vai nascer. Por ora são
        as portas que já existem: Vídeo e Lote são ROTAS, não modos — ao
        chegar no destino a barra não existe mais, então um seletor de modo
        aqui hoje anunciaria como "seleção" o que é navegação.
      */}
      <View style={styles.middle}>
        <Button
          label={t('nav.video')}
          icon="film-outline"
          variant="ghost"
          onPress={onVideo}
        />
        {isDesktop() ? (
          <Button
            label={t('nav.batch')}
            icon="images"
            variant="ghost"
            onPress={onBatch}
          />
        ) : null}
      </View>

      <Button
        label={tCommon('share')}
        icon="share-social"
        variant="primary"
        onPress={onShare}
        disabled={!hasPhoto || pending === 'save'}
        loading={pending === 'share'}
      />
      <Button
        label={tCommon('save')}
        icon="download"
        variant="accent"
        onPress={onSave}
        disabled={!hasPhoto || pending === 'share'}
        loading={pending === 'save'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  source: {
    // Teto de largura: os dois botões de origem não ganham nada em esticar, e
    // esticando empurrariam o centro para fora do centro.
    maxWidth: 320,
    flexShrink: 1,
  },
  middle: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
