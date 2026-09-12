// Pela família, e não pelo barril `@expo/vector-icons` (ver `ui/button.tsx`).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEvent } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTranslations } from 'use-intl';

import { colors, radius } from '@/theme';

/**
 * O vídeo escolhido, no mesmo quadro em que a foto aparece.
 *
 * O player fica embaixo, o carimbo (`children`, o mesmo `StampCanvas` da
 * foto) por cima, e o botão de reproduzir por cima de tudo — nessa ordem,
 * para o toque no botão não ser capturado pelo canvas e para o carimbo
 * aparecer sobre o vídeo como vai aparecer no arquivo exportado.
 *
 * Sem controles nativos de propósito: barra de progresso e tela cheia
 * cobririam o carimbo, que é justamente o que a pessoa quer conferir. Um
 * botão só, tocar alterna; em loop, para o carimbo poder ser ajustado com o
 * vídeo rodando. Mudo enquanto é prévia — quem está numa vistoria não quer
 * o áudio da obra tocando ao abrir o app.
 */
export function VideoFrame({ uri, children }: { uri: string; children: ReactNode }) {
  const t = useTranslations('app.capture');
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    instance.muted = true;
  });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  return (
    <>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />
      {children}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? t('pauseVideo') : t('playVideo')}
        onPress={() => (isPlaying ? player.pause() : player.play())}
        style={({ pressed }) => [
          styles.toggle,
          // Rodando, o botão recua para não tapar o vídeo; continua onde
          // estava, para o toque seguinte não precisar procurá-lo.
          isPlaying && styles.togglePlaying,
          pressed && styles.togglePressed,
        ]}>
        <Ionicons name={isPlaying ? 'pause' : 'play'} size={30} color={colors.text} />
      </Pressable>
    </>
  );
}

const TOGGLE = 64;

const styles = StyleSheet.create({
  toggle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -TOGGLE / 2,
    marginLeft: -TOGGLE / 2,
    width: TOGGLE,
    height: TOGGLE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    // O navy mais escuro da paleta, translúcido: legível sobre céu e sobre
    // asfalto sem virar um disco preto no meio da cena.
    backgroundColor: 'rgba(15, 25, 42, 0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  togglePlaying: {
    opacity: 0.55,
  },
  togglePressed: {
    backgroundColor: 'rgba(15, 25, 42, 0.9)',
  },
});
