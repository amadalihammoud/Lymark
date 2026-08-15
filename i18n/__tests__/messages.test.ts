/**
 * A guarda contra a divergência.
 *
 * O problema que derrubou o i18n da primeira vez não foi tradução errada: foi
 * o catálogo de cada plataforma seguir seu próprio caminho até ninguém mais
 * saber qual estava certo. Um idioma ganhava uma chave, outro perdia a
 * acentuação, e nada acusava.
 *
 * Estes testes falham no CI antes de a divergência chegar ao produto.
 */

import fs from 'fs';
import path from 'path';

import { DEFAULT_LOCALE, LOCALES, LOCALE_NAMES } from '../locales';

const MESSAGES_DIR = path.join(__dirname, '..', 'messages');

type Messages = Record<string, unknown>;

function load(locale: string): Messages {
  return JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), 'utf-8'));
}

/** Achata `{ a: { b: 'x' } }` em `{ 'a.b': 'x' }`. */
function flatten(value: unknown, prefix = ''): Record<string, string> {
  if (typeof value === 'string') return { [prefix]: value };

  const out: Record<string, string> = {};
  for (const [key, child] of Object.entries(value as Messages)) {
    Object.assign(out, flatten(child, prefix ? `${prefix}.${key}` : key));
  }
  return out;
}

/**
 * Coincidências legítimas: texto que é idêntico ao português por acaso, não por
 * esquecimento. Cada entrada precisa de justificativa — a lista existe para ser
 * pequena, e uma entrada nova é motivo para conferir a tradução, não para
 * silenciar o teste.
 */
const IDENTICAL_ON_PURPOSE: Record<string, readonly string[]> = {
  // "Registro fotográfico de campo" se escreve igual em português e espanhol.
  es: ['site.hero.eyebrow'],
};

const catalogs = new Map(LOCALES.map((locale) => [locale, flatten(load(locale))]));
const reference = catalogs.get(DEFAULT_LOCALE)!;
const referenceKeys = Object.keys(reference).sort();

describe('catálogo de traduções', () => {
  it('tem um arquivo para cada idioma declarado', () => {
    const onDisk = fs
      .readdirSync(MESSAGES_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''))
      .sort();

    expect(onDisk).toEqual([...LOCALES].sort());
  });

  it('nomeia cada idioma no seletor', () => {
    for (const locale of LOCALES) {
      expect(LOCALE_NAMES[locale]).toBeTruthy();
    }
  });

  describe.each(LOCALES)('%s', (locale) => {
    const messages = catalogs.get(locale)!;

    it('tem exatamente as mesmas chaves do português', () => {
      expect(Object.keys(messages).sort()).toEqual(referenceKeys);
    });

    it('não tem texto vazio', () => {
      const empty = Object.keys(messages).filter((k) => messages[k].trim() === '');
      expect(empty).toEqual([]);
    });

    it('não deixou texto por traduzir', () => {
      if (locale === DEFAULT_LOCALE) return;

      // Nomes próprios são iguais em todo idioma; o resto, não. Um texto longo
      // idêntico ao português é sinal de chave esquecida, não de coincidência.
      const allowed = IDENTICAL_ON_PURPOSE[locale] ?? [];
      const untranslated = referenceKeys.filter(
        (k) =>
          reference[k].length > 25 && messages[k] === reference[k] && !allowed.includes(k),
      );
      expect(untranslated).toEqual([]);
    });
  });
});
