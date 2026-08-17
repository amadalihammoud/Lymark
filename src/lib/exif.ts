/**
 * Leitura de metadados EXIF de arquivos de imagem.
 *
 * Esta camada abstrai a leitura de EXIF entre plataformas:
 * - Web: usa exifreader para ler do File/Blob
 * - Mobile: usa expo-image-picker que já devolve EXIF
 * - Desktop: usa exifreader para ler do fs.readFileSync
 */

import * as exifreader from 'exifreader';

import { formatDate, formatTime } from '@/lib/datetime';
import type { TimeFormat } from '@/types';
import { DEFAULT_LOCALE, type Locale } from '@i18n/locales';

/**
 * De onde o EXIF pode ser lido.
 *
 * `Buffer` não aparece aqui de propósito: ele é um `Uint8Array`, então
 * continua aceito, mas o tipo não obriga ninguém a produzi-lo — e no
 * renderer do Electron (sandbox) ele nem existe.
 */
export type ExifSource = File | Uint8Array | string;

/**
 * Dados de data/hora extraídos do EXIF.
 */
export interface ExifDateTime {
  /** Data no formato YYYY-MM-DD */
  date?: string;
  /** Hora no formato HH:MM:SS */
  time?: string;
  /** Data/hora completa como Date */
  dateTime?: Date;
}

/**
 * Extrai a data e hora do EXIF de um arquivo.
 *
 * No mobile, o expo-image-picker já devolve a data no asset.exif.
 * Na web e desktop, precisamos ler do arquivo.
 *
 * @param file - O arquivo a ser lido: `File` (web), `Uint8Array` de bytes já
 *   em memória (o caminho do desktop, onde a foto vem por `media://`), ou um
 *   caminho de disco (Node, usado pelos testes).
 * @returns Promessa com os dados de data/hora, ou undefined se não encontrado.
 */
export async function extractDateTimeFromExif(
  file: ExifSource,
): Promise<ExifDateTime | undefined> {
  try {
    /*
     * `Uint8Array` é a moeda comum, e não `Buffer`.
     *
     * A janela do Electron roda com `nodeIntegration: false` e `sandbox:
     * true`: ali **não existe `Buffer` global**, e o bundle do Expo não traz
     * polyfill — tocar em `Buffer` no renderer lança `ReferenceError`. O
     * `exifreader` aceita `Uint8Array` direto, então o tipo do Node só
     * aparece no ramo de caminho de disco, que só roda em Node.
     */
    let bytes: Uint8Array;

    if (typeof file === 'string') {
      // Caminho de disco: só alcançável em Node (testes e scripts).
      const fs = await import('fs');
      bytes = new Uint8Array(fs.readFileSync(file));
    } else if (typeof File !== 'undefined' && file instanceof File) {
      // Web: File do input
      bytes = new Uint8Array(await file.arrayBuffer());
    } else if (file instanceof Uint8Array) {
      // Bytes já em memória (inclui `Buffer`, que é um `Uint8Array`).
      bytes = file;
    } else {
      return undefined;
    }

    /*
     * Ler as tags a partir de um `ArrayBuffer` que contém EXATAMENTE estes
     * bytes — os tipos do `exifreader` aceitam `ArrayBuffer`, e é a forma
     * que funciona nos dois runtimes.
     *
     * A cópia é feita com `new Uint8Array(bytes)`, e não com `bytes.slice()`:
     * um `Buffer` do Node é uma janela sobre um pool compartilhado de 8 KB, e
     * `Buffer.prototype.slice` NÃO copia — devolve outra janela sobre o mesmo
     * pool. O `.buffer` daí sai com os 8192 bytes do pool inteiro, e o
     * leitor procura o cabeçalho EXIF no lixo em volta: nenhuma tag é
     * encontrada, e a data da foto some sem erro nenhum.
     */
    const copy = new Uint8Array(bytes);
    const tags = exifreader.load(copy.buffer as ArrayBuffer);

    // Tentar extrair DateTimeOriginal (prioridade)
    if (tags['DateTimeOriginal']) {
      const value = Array.isArray(tags['DateTimeOriginal'].value) 
        ? tags['DateTimeOriginal'].value[0]
        : tags['DateTimeOriginal'].value;
      if (value && typeof value === 'string') {
        return parseExifDateTime(value);
      }
    }

    // Tentar DateTime
    if (tags['DateTime']) {
      const value = Array.isArray(tags['DateTime'].value) 
        ? tags['DateTime'].value[0]
        : tags['DateTime'].value;
      if (value && typeof value === 'string') {
        return parseExifDateTime(value);
      }
    }

    // Tentar DateTimeDigitized
    if (tags['DateTimeDigitized']) {
      const value = Array.isArray(tags['DateTimeDigitized'].value) 
        ? tags['DateTimeDigitized'].value[0]
        : tags['DateTimeDigitized'].value;
      if (value && typeof value === 'string') {
        return parseExifDateTime(value);
      }
    }

    return undefined;
  } catch (error) {
    console.warn('[exif] Falha ao ler EXIF:', error);
    return undefined;
  }
}

/**
 * Parseia uma string de data/hora do EXIF.
 *
 * Formato EXIF: "YYYY:MM:DD HH:MM:SS"
 *
 * @param value - String no formato EXIF
 * @returns Objeto com date, time e dateTime
 */
function parseExifDateTime(value: string): ExifDateTime {
  // Formato: "YYYY:MM:DD HH:MM:SS"
  const [datePart, timePart] = value.split(' ');

  if (!datePart || !timePart) {
    return {};
  }

  // Parse date: YYYY:MM:DD
  const [year, month, day] = datePart.split(':').map(Number);
  // Parse time: HH:MM:SS
  const [hours, minutes, seconds] = timePart.split(':').map(Number);

  // Validar
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) ||
      !Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    return {};
  }

  // Formatar como YYYY-MM-DD e HH:MM:SS
  const date = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Criar Date objeto
  const dateTime = new Date(year, month - 1, day, hours, minutes, seconds);

  return { date, time, dateTime };
}

/**
 * Extrai apenas a data, já no formato que o carimbo imprime.
 *
 * A formatação é a mesma de `formatDate` — as tabelas de `i18n/calendar.ts`,
 * sem `Intl`. Esta função já montou a data por conta própria, com
 * `toLocaleString('pt-BR')`, e isso produzia dois defeitos: a foto vinda do
 * EXIF saía em português mesmo com a interface em outro idioma, e o mês vinha
 * do ICU do aparelho — que devolve "ago." em uma versão e "ago" em outra,
 * fazendo o ponto do molde virar "ago..". Numa foto de comprovação, a data do
 * lote precisa sair idêntica à data digitada à mão.
 *
 * @param file - O arquivo a ser lido
 * @param locale - Idioma do carimbo (não o da interface — ver `STAMP_LOCALE`)
 * @returns Promessa com a data formatada, ou undefined
 */
export async function extractDateFromExif(
  file: ExifSource,
  locale: Locale = DEFAULT_LOCALE,
): Promise<string | undefined> {
  const dateTime = await extractDateTimeFromExif(file);

  if (!dateTime?.dateTime) {
    return undefined;
  }

  return formatDate(dateTime.dateTime, locale);
}

/**
 * Extrai apenas a hora no formato que o app espera.
 *
 * O app usa o formato "HH:MM" (ex: "21:55")
 *
 * @param file - O arquivo a ser lido
 * @returns Promessa com a hora formatada, ou undefined
 */
export async function extractTimeFromExif(
  file: ExifSource,
  timeFormat: TimeFormat = '24h',
): Promise<string | undefined> {
  const dateTime = await extractDateTimeFromExif(file);

  if (!dateTime?.dateTime) {
    return undefined;
  }

  // Pelo mesmo `formatTime` do resto do app, no formato preferido.
  return formatTime(dateTime.dateTime, timeFormat);
}
