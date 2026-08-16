import { Skia, type SkImage } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';

import { resolveLogoUri } from './logo-file';

/**
 * O logotipo da empresa, decodificado para o desenho.
 *
 * Vive fora de `skia-stamp.ts` de propósito: o harness de fidelidade compila
 * o desenhista para Node, onde não existe `expo-file-system`. Aqui fica o que
 * depende do sistema de arquivos; lá, só o Skia.
 */

/**
 * Decodifica o logotipo guardado, para o desenho poder ser síncrono.
 *
 * Devolve sempre um mapa — vazio enquanto carrega, ou quando não há logotipo.
 * Nunca `null`, porque o carimbo inteiro não deve esperar por um elemento
 * opcional dele.
 */
export async function loadStampImages(path: string | null): Promise<Map<string, SkImage>> {
  const images = new Map<string, SkImage>();
  if (!path) return images;

  try {
    const data = await Skia.Data.fromURI(resolveLogoUri(path));
    const image = Skia.Image.MakeImageFromEncoded(data);
    if (image) images.set(path, image);
  } catch (error) {
    // O arquivo pode ter sumido numa restauração de backup. A foto sai sem o
    // logotipo, e não deixa de sair.
    console.warn('[marca] não foi possível ler o logotipo.', error);
  }

  return images;
}

/** A versão de tela: recarrega quando o logotipo escolhido muda. */
export function useStampImages(path: string | null): Map<string, SkImage> {
  const [images, setImages] = useState<Map<string, SkImage>>(EMPTY_IMAGES);

  useEffect(() => {
    let active = true;

    void loadStampImages(path).then((loaded) => {
      if (active) setImages(loaded);
      else for (const image of loaded.values()) image.dispose();
    });

    return () => {
      active = false;
    };
  }, [path]);

  return images;
}

/** Uma instância só: um `new Map()` a cada render refaria o `useMemo` do carimbo. */
const EMPTY_IMAGES = new Map<string, SkImage>();
