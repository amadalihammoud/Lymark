import type { GalleryEntry } from '@/types';

import { filterGalleryEntries, normalizeSearchText } from '../gallery-search';

/**
 * Uma vistoria produz dezenas de fotos, e quem procura digita do jeito que
 * lembra — sem acento, em minúscula, um pedaço só. A busca que exige a grafia
 * exata não é busca.
 */
const entry = (over: Partial<GalleryEntry['metadata']> & { id: string }): GalleryEntry => ({
  id: over.id,
  path: `exports/${over.id}.jpg`,
  exportedAt: '2026-08-02T22:50:00.000Z',
  stampedFields: [],
  metadata: {
    time: '22:50',
    date: '02 ago. 2026',
    weekday: 'Dom',
    address: 'Av. Santos Dumont, 1271 - Sítio Paecara, Guarujá - SP',
    code: '36456CBDE516D3',
    ...over,
  },
});

const entries = [
  entry({ id: 'a' }),
  entry({ id: 'b', address: 'R. Casper Líbero, 24 - José Menino, Santos - SP' }),
  entry({ id: 'c', address: '', code: '77FDDE4DA4D03E', date: '15 set. 2026' }),
];

describe('filterGalleryEntries', () => {
  it('devolve tudo quando não há busca', () => {
    expect(filterGalleryEntries(entries, '')).toHaveLength(3);
    expect(filterGalleryEntries(entries, '   ')).toHaveLength(3);
  });

  it('acha sem acento o que foi gravado com acento', () => {
    expect(filterGalleryEntries(entries, 'guaruja').map((e) => e.id)).toEqual(['a']);
    expect(filterGalleryEntries(entries, 'libero').map((e) => e.id)).toEqual(['b']);
  });

  it('ignora a caixa, inclusive no código', () => {
    expect(filterGalleryEntries(entries, '77fdde').map((e) => e.id)).toEqual(['c']);
    expect(filterGalleryEntries(entries, 'SANTOS').map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('busca por data', () => {
    expect(filterGalleryEntries(entries, 'set').map((e) => e.id)).toEqual(['c']);
  });

  it('acha por trecho no meio do texto', () => {
    expect(filterGalleryEntries(entries, 'paecara').map((e) => e.id)).toEqual(['a']);
  });

  it('devolve vazio quando nada casa', () => {
    expect(filterGalleryEntries(entries, 'curitiba')).toHaveLength(0);
  });

  it('não quebra com registro sem endereço', () => {
    expect(filterGalleryEntries(entries, '77FDDE4DA4D03E')).toHaveLength(1);
  });
});

describe('normalizeSearchText', () => {
  it('remove acentos e caixa', () => {
    expect(normalizeSearchText('  Guarujá — SÃO Paulo ')).toBe('guaruja — sao paulo');
  });
});
