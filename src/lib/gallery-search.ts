import type { GalleryEntry } from '@/types';

/**
 * Busca no histórico.
 *
 * Vive fora da tela porque é regra, não interface: quem procura "guaruja"
 * precisa achar "Guarujá", e quem digita um trecho do código não vai lembrar
 * de maiúsculas. Fora da tela, também dá para testar.
 */

/** Remove acentos e caixa, dos dois lados da comparação. */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export function filterGalleryEntries(entries: GalleryEntry[], query: string): GalleryEntry[] {
  const term = normalizeSearchText(query);
  if (!term) return entries;

  return entries.filter((entry) => {
    const haystack = [
      entry.metadata.address,
      entry.metadata.date,
      entry.metadata.time,
      entry.metadata.weekday,
      entry.metadata.code,
    ].join(' ');

    return normalizeSearchText(haystack).includes(term);
  });
}
