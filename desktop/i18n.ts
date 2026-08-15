/**
 * Traduções do processo principal.
 *
 * O que a pessoa vê no desktop vem de dois lugares. A interface é o próprio
 * build web, e já se traduz sozinha pelo `use-intl`. Mas o menu do sistema e
 * os diálogos de arquivo são desenhados pelo Electron, fora da página — e é
 * só disso que este módulo cuida.
 *
 * O catálogo é lido em tempo de execução, e não importado: o `tsconfig` do
 * desktop tem `rootDir` na própria pasta, e um `import` de fora dela mudaria
 * a estrutura de saída do `tsc` — que o electron-builder mapeia para dentro
 * do asar. Ler do disco mantém o empacotamento como está e continua usando o
 * mesmo catálogo do site e do aplicativo, sem cópia.
 */

import fs from 'fs';
import path from 'path';

import { app } from 'electron';

/** O idioma de origem, e o destino de qualquer coisa que falte. */
export const DEFAULT_LOCALE = 'pt';

/**
 * Onde os catálogos ficam.
 *
 * Empacotado, vão para `resources/i18n/messages` por `extraResources`. Fora
 * do pacote, o nível depende de quem está executando: o `main.js` compilado
 * roda em `desktop/dist`, e o Jest roda o `.ts` direto de `desktop/`. Fixar
 * um único `../..` funcionava no aplicativo e falhava nos testes — e uma
 * diferença dessas só aparece quando alguém vai procurar.
 *
 * Por isso a busca é por candidatos: o primeiro caminho que existir vence.
 */
function messagesDir(): string {
  if (app.isPackaged) return path.join(process.resourcesPath, 'i18n', 'messages');

  const candidates = [
    path.join(__dirname, '../../i18n/messages'), // desktop/dist → raiz
    path.join(__dirname, '../i18n/messages'), // desktop/ → raiz
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

type Messages = Record<string, unknown>;

const cache = new Map<string, Messages>();

/**
 * Os idiomas disponíveis, deduzidos dos próprios arquivos.
 *
 * Repetir a lista aqui criaria uma segunda fonte da verdade — exatamente o
 * problema que o catálogo único veio resolver. Um idioma novo é um arquivo
 * novo, e o desktop passa a conhecê-lo sem alteração de código.
 */
export function availableLocales(): string[] {
  try {
    return fs
      .readdirSync(messagesDir())
      .filter((name) => name.endsWith('.json'))
      .map((name) => name.replace(/\.json$/, ''));
  } catch (error) {
    console.warn('[i18n] não foi possível listar os catálogos.', error);
    return [DEFAULT_LOCALE];
  }
}

function load(locale: string): Messages | null {
  const cached = cache.get(locale);
  if (cached) return cached;

  try {
    const raw = fs.readFileSync(path.join(messagesDir(), `${locale}.json`), 'utf-8');
    const parsed = JSON.parse(raw) as Messages;
    cache.set(locale, parsed);
    return parsed;
  } catch (error) {
    console.warn(`[i18n] falha ao ler o catálogo "${locale}".`, error);
    return null;
  }
}

function lookup(messages: Messages | null, key: string): string | null {
  let node: unknown = messages;

  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return null;
    node = (node as Messages)[part];
  }

  return typeof node === 'string' ? node : null;
}

/**
 * O texto de uma chave, com dois degraus de queda: o idioma pedido, depois o
 * português, e por último a própria chave.
 *
 * Devolver a chave é feio de propósito. Um menu com `desktop.menu.file` à
 * mostra denuncia o problema na primeira execução; um menu vazio, ou que
 * derruba o app na inicialização, não.
 */
export function translate(locale: string, key: string): string {
  return lookup(load(locale), key) ?? lookup(load(DEFAULT_LOCALE), key) ?? key;
}
