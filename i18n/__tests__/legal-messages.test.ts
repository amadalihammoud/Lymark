/**
 * A mesma guarda de `messages.test.ts`, para o catálogo jurídico.
 *
 * Vale a repetição porque o risco aqui é maior. Um texto de interface que perde
 * uma chave aparece torto na tela e alguém percebe; a Política de Privacidade e
 * os Termos de Uso são documentos juridicamente operantes, servidos em doze
 * idiomas, e ninguém relê os doze a cada mudança. Se o alemão perder o item da
 * limitação de responsabilidade, nada acusa — exceto isto.
 *
 * A checagem de marcações não existe no catálogo principal e existe aqui pelo
 * mesmo motivo: `<strong>` no texto jurídico marca a frase que o leitor precisa
 * enxergar, e uma tradução que perde a marca perde ênfase que foi decidida de
 * propósito. Pior: uma tradução que **inventa** uma marca — ou erra o nome —
 * derruba a renderização, porque `t.rich` só conhece as cinco de
 * `site/components/legal-tags.tsx`.
 */

import fs from 'fs';
import path from 'path';

import { DEFAULT_LOCALE, LOCALES } from '../locales';

const LEGAL_DIR = path.join(__dirname, '..', 'messages', 'legal');

/** As marcações que `LEGAL_TAGS` sabe renderizar. Uma sexta quebraria a página. */
const KNOWN_TAGS = ['strong', 'em', 'email', 'privacy', 'terms'] as const;

function load(locale: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(LEGAL_DIR, `${locale}.json`), 'utf-8'));
}

function flatten(value: unknown, prefix = ''): Record<string, string> {
  if (typeof value === 'string') return { [prefix]: value };

  const out: Record<string, string> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    Object.assign(out, flatten(child, prefix ? `${prefix}.${key}` : key));
  }
  return out;
}

/** Os nomes de marcação abertos num texto, na ordem em que aparecem. */
function tagsIn(text: string): string[] {
  return [...text.matchAll(/<([a-zA-Z]+)>/g)].map((m) => m[1]!);
}

const catalogs = new Map(LOCALES.map((locale) => [locale, flatten(load(locale))]));
const reference = catalogs.get(DEFAULT_LOCALE)!;
const referenceKeys = Object.keys(reference).sort();

/**
 * Trechos que são iguais em qualquer idioma porque não são texto: identificador
 * de pacote, razão social, CNPJ, endereço de e-mail e as siglas das leis. Ficam
 * de fora da checagem de "não traduzido" — e é proposital que continuem
 * idênticos, porque traduzir um CNPJ o inutiliza.
 */
const LITERALS = [
  'com.lycosteam.lymark',
  '29.015.357 AMAD ALI HAMMOUD',
  '29.015.357/0001-25',
  'contato@lymark.app',
  'Avenida Ana Costa, 433, Gonzaga, Santos - SP',
];

describe('catálogo jurídico', () => {
  it('tem um arquivo para cada idioma declarado', () => {
    const onDisk = fs
      .readdirSync(LEGAL_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''))
      .sort();

    expect(onDisk).toEqual([...LOCALES].sort());
  });

  it('mantém os dados do controlador intactos no português', () => {
    const tudo = Object.values(reference).join(' ');
    for (const literal of LITERALS) {
      expect(tudo).toContain(literal);
    }
  });

  describe.each(LOCALES)('%s', (locale) => {
    const messages = catalogs.get(locale)!;

    it('tem exatamente as mesmas chaves do português', () => {
      expect(Object.keys(messages).sort()).toEqual(referenceKeys);
    });

    it('não tem texto vazio', () => {
      const empty = Object.keys(messages).filter((k) => messages[k]!.trim() === '');
      expect(empty).toEqual([]);
    });

    it('usa as mesmas marcações do português, na mesma ordem', () => {
      const divergentes = referenceKeys.filter(
        (k) => tagsIn(messages[k]!).join(',') !== tagsIn(reference[k]!).join(','),
      );
      expect(divergentes).toEqual([]);
    });

    it('não inventa marcação que a página não sabe renderizar', () => {
      const desconhecidas = new Set<string>();
      for (const k of referenceKeys) {
        for (const tag of tagsIn(messages[k]!)) {
          if (!(KNOWN_TAGS as readonly string[]).includes(tag)) desconhecidas.add(tag);
        }
      }
      expect([...desconhecidas]).toEqual([]);
    });

    it('preserva a razão social, o CNPJ e o endereço de contato', () => {
      const tudo = Object.values(messages).join(' ');
      for (const literal of LITERALS) {
        expect(tudo).toContain(literal);
      }
    });

    it('não deixou texto por traduzir', () => {
      if (locale === DEFAULT_LOCALE) return;

      const untranslated = referenceKeys.filter(
        (k) => reference[k]!.length > 25 && messages[k] === reference[k],
      );
      expect(untranslated).toEqual([]);
    });
  });
});
