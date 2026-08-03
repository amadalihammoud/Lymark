import { Canvas, Picture, createPicture } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import type { CaptureMetadata, WatermarkPreferences } from '@/types';

import { buildWatermarkContent } from './build-content';
import { createStampRenderer, useStampFontProvider, useStampImages } from './skia-stamp';
import { buildStampGeometry } from './stamp-layout';

/**
 * O carimbo desenhado sobre a foto, na tela.
 *
 * É o **mesmo** desenho que a exportação usa: a geometria não sabe a diferença
 * entre um preview de 355 px e um arquivo de 4000, só recebe uma largura
 * diferente. Isso é o que faz o que se vê na tela ser literalmente o que sai
 * no arquivo — antes o preview era uma reprodução em componentes, e o arquivo,
 * uma fotografia dela.
 */

export function StampCanvas({
  metadata,
  preferences,
  width,
  height,
}: {
  metadata: CaptureMetadata;
  preferences: WatermarkPreferences;
  width: number;
  height: number;
}) {
  const provider = useStampFontProvider();
  const images = useStampImages(preferences.brandLogoPath);

  const picture = useMemo(() => {
    if (!provider || width <= 0 || height <= 0) return null;

    const renderer = createStampRenderer(provider, images);
    const geometry = buildStampGeometry({
      content: buildWatermarkContent(metadata, preferences),
      preferences,
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

    return createPicture((canvas) => renderer.draw(canvas, geometry), {
      x: 0,
      y: 0,
      width,
      height,
    });
  }, [provider, images, metadata, preferences, width, height]);

  if (!picture) return null;

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Picture picture={picture} />
    </Canvas>
  );
}
