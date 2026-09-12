import { Canvas, Picture, createPicture } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { colors } from '@/theme';
import type { CaptureMetadata, WatermarkPreferences } from '@/types';

import { buildWatermarkContent } from './build-content';
import {
  HANDLE_SIZE,
  hitLogo,
  hitsHandle,
  movedBy,
  resizedBy,
  scaledBy,
  type FreeLogoPatch,
} from './logo-gestures';
import { createStampRenderer, useStampTypefaces } from './skia-stamp';
import { useStampImages } from './stamp-images';
import { scriptForStamp } from './stamp-script';
import { buildStampGeometry, type StampImage } from './stamp-layout';

/**
 * O carimbo desenhado sobre a foto, na tela.
 *
 * É o **mesmo** desenho que a exportação usa: a geometria não sabe a diferença
 * entre um preview de 355 px e um arquivo de 4000, só recebe uma largura
 * diferente. Isso é o que faz o que se vê na tela ser literalmente o que sai
 * no arquivo — antes o preview era uma reprodução em componentes, e o arquivo,
 * uma fotografia dela.
 *
 * Com `onLogoChange`, os logotipos ganham o dedo: um toque seleciona, o
 * arraste move, a pinça ou a alça do canto redimensionam. Mexer num logotipo
 * é soltá-lo — ele passa a livre, onde o dedo o deixou. Durante o gesto o
 * ajuste vive aqui, num rascunho; só no fim ele é gravado, senão cada quadro
 * do arraste iria para o disco.
 */

/** O ajuste de um logotipo no meio de um gesto. */
type Draft = { index: number; patch: FreeLogoPatch };

export function StampCanvas({
  metadata,
  preferences,
  width,
  height,
  onLogoChange,
}: {
  metadata: CaptureMetadata;
  preferences: WatermarkPreferences;
  width: number;
  height: number;
  /**
   * Recebe o logotipo posto pelo dedo, no fim do gesto. Sem isto o carimbo
   * é só desenho — o caso do vídeo, que herda a posição da foto.
   */
  onLogoChange?: (index: number, patch: FreeLogoPatch) => void;
}) {
  // O preview precisa desenhar com a mesma fonte da exportação, senão o que
  // a pessoa vê na tela deixa de ser o que sai no arquivo — que é a promessa
  // literal da landing page.
  const typefaces = useStampTypefaces(scriptForStamp(metadata, preferences));
  const images = useStampImages(preferences.brandLogos);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  const shown = useMemo(() => {
    if (!draft || !preferences.brandLogos[draft.index]) return preferences;
    return {
      ...preferences,
      brandLogos: preferences.brandLogos.map((logo, i) =>
        i === draft.index ? { ...logo, ...draft.patch } : logo,
      ),
    };
  }, [preferences, draft]);

  const geometry = useMemo(() => {
    if (!typefaces || width <= 0 || height <= 0) return null;

    const renderer = createStampRenderer(typefaces, images);
    const geometry = buildStampGeometry({
      content: buildWatermarkContent(metadata, shown),
      preferences: shown,
      frame: { width, height },
      measure: renderer.measure,
    });

    if (
      geometry.texts.length === 0 &&
      geometry.rects.length === 0 &&
      geometry.images.length === 0
    ) {
      return null;
    }

    return {
      picture: createPicture((canvas) => renderer.draw(canvas, geometry), {
        x: 0,
        y: 0,
        width,
        height,
      }),
      images: geometry.images,
    };
  }, [typefaces, images, metadata, shown, width, height]);

  /*
   * O que o gesto precisa e não pode ler do estado: o React entrega os
   * callbacks do gesto uma vez, e o estado de um quadro atrás. `live` é o que
   * está na tela AGORA — o retângulo em que o dedo pousou, o quadro, e quem
   * recebe o resultado. Atualizado num efeito, e não no render, porque
   * render é cálculo e isto é efeito colateral. Os gestos são construídos
   * uma vez sobre ele; cada callback lê `live`, nunca o estado do render.
   */
  const [live] = useState(() => new Live());
  const gesture = useMemo(() => buildLogoGesture(live, setSelected, setDraft), [live]);
  useEffect(() => {
    live.sync({
      images: geometry?.images ?? [],
      selected,
      frame: { width, height },
      onLogoChange,
    });
  });

  if (!geometry) return null;

  const selectedRect =
    selected !== null ? geometry.images.find((image) => image.logo === selected) : undefined;

  const canvas = (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Picture picture={geometry.picture} />
    </Canvas>
  );

  if (!onLogoChange) return canvas;

  return (
    <GestureDetector gesture={gesture}>
      <View style={StyleSheet.absoluteFill}>
        {canvas}
        {selectedRect ? (
          <View
            pointerEvents="none"
            style={[
              styles.selection,
              {
                left: selectedRect.x,
                top: selectedRect.y,
                width: selectedRect.width,
                height: selectedRect.height,
              },
            ]}>
            <View style={styles.handle} />
          </View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

/** O que os gestos leem do render, sempre atual — uma caixa, fora do estado. */
class Live {
  images: StampImage[] = [];
  selected: number | null = null;
  frame = { width: 0, height: 0 };
  onLogoChange: ((index: number, patch: FreeLogoPatch) => void) | undefined;

  sync(next: Pick<Live, 'images' | 'selected' | 'frame' | 'onLogoChange'>) {
    this.images = next.images;
    this.selected = next.selected;
    this.frame = next.frame;
    this.onLogoChange = next.onLogoChange;
  }
}

/**
 * Os três gestos, montados sobre o ref: toque seleciona, arraste move (ou
 * redimensiona, pela alça), pinça escala. A pinça e o arraste convivem —
 * dois dedos podem mover e escalar juntos.
 */
function buildLogoGesture(
  live: Live,
  select: (index: number | null) => void,
  draft: (draft: Draft | null) => void,
): ReturnType<typeof Gesture.Simultaneous> {
  let grabbed: { rect: StampImage; mode: 'move' | 'resize' } | null = null;

  // Só no fim do gesto o ajuste é gravado, senão cada quadro iria ao disco.
  const finish = (index: number, patch: FreeLogoPatch) => {
    live.onLogoChange?.(index, patch);
    draft(null);
  };

  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((event) => {
      const hit = hitLogo(live.images, event);
      select(hit ? hit.logo : null);
    });

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(4)
    .onBegin((event) => {
      const { images, selected } = live;
      const chosen = selected !== null ? images.find((image) => image.logo === selected) : null;
      if (chosen && hitsHandle(chosen, event)) {
        grabbed = { rect: chosen, mode: 'resize' };
        return;
      }
      const hit = hitLogo(images, event);
      grabbed = hit ? { rect: hit, mode: 'move' } : null;
    })
    .onUpdate((event) => {
      if (!grabbed) return;
      const { frame } = live;
      select(grabbed.rect.logo);
      draft({
        index: grabbed.rect.logo,
        patch:
          grabbed.mode === 'resize'
            ? resizedBy(grabbed.rect, event.translationX, frame)
            : movedBy(grabbed.rect, event.translationX, event.translationY, frame),
      });
    })
    .onEnd((event) => {
      const grab = grabbed;
      grabbed = null;
      if (!grab) return;
      const { frame } = live;
      finish(
        grab.rect.logo,
        grab.mode === 'resize'
          ? resizedBy(grab.rect, event.translationX, frame)
          : movedBy(grab.rect, event.translationX, event.translationY, frame),
      );
    })
    .onFinalize(() => {
      grabbed = null;
    });

  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onBegin((event) => {
      const { images, selected } = live;
      const chosen =
        (selected !== null ? images.find((image) => image.logo === selected) : null) ??
        hitLogo(images, { x: event.focalX, y: event.focalY });
      grabbed = chosen ? { rect: chosen, mode: 'resize' } : null;
    })
    .onUpdate((event) => {
      if (!grabbed) return;
      select(grabbed.rect.logo);
      draft({ index: grabbed.rect.logo, patch: scaledBy(grabbed.rect, event.scale, live.frame) });
    })
    .onEnd((event) => {
      const grab = grabbed;
      grabbed = null;
      if (!grab) return;
      finish(grab.rect.logo, scaledBy(grab.rect, event.scale, live.frame));
    });

  return Gesture.Simultaneous(Gesture.Race(pan, tap), pinch);
}

const styles = StyleSheet.create({
  selection: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderStyle: 'dashed',
  },
  /** A alça: no canto inferior direito, meio para fora do contorno. */
  handle: {
    position: 'absolute',
    right: -HANDLE_SIZE / 2,
    bottom: -HANDLE_SIZE / 2,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
