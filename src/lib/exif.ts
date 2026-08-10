/**
 * Leitura de metadados EXIF de arquivos de imagem.
 *
 * Esta camada abstrai a leitura de EXIF entre plataformas:
 * - Web: usa exifreader para ler do File/Blob
 * - Mobile: usa expo-image-picker que já devolve EXIF
 * - Desktop: usa exifreader para ler do fs.readFileSync
 */

import * as exifreader from 'exifreader';

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
 * @param file - O arquivo a ser lido. Na web: File do input. No desktop: Buffer ou string path.
 * @returns Promessa com os dados de data/hora, ou undefined se não encontrado.
 */
export async function extractDateTimeFromExif(
  file: File | Buffer | string,
): Promise<ExifDateTime | undefined> {
  try {
    let buffer: Buffer;

    if (typeof file === 'string') {
      // Desktop: path do arquivo
      const fs = await import('fs');
      buffer = fs.readFileSync(file);
    } else if (file instanceof File) {
      // Web: File do input
      buffer = Buffer.from(await file.arrayBuffer());
    } else if (Buffer.isBuffer(file)) {
      // Buffer direto
      buffer = file;
    } else {
      return undefined;
    }

    // Ler tags EXIF
    const tags = exifreader.load(buffer);

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
 * Extrai apenas a data no formato que o app espera.
 *
 * O app usa o formato "DD MMM. YYYY" (ex: "01 ago. 2026")
 *
 * @param file - O arquivo a ser lido
 * @returns Promessa com a data formatada, ou undefined
 */
export async function extractDateFromExif(
  file: File | Buffer | string,
): Promise<string | undefined> {
  const dateTime = await extractDateTimeFromExif(file);
  
  if (!dateTime?.dateTime) {
    return undefined;
  }

  // Formatar como "DD MMM. YYYY"
  const day = dateTime.dateTime.getDate();
  const month = dateTime.dateTime.toLocaleString('pt-BR', { month: 'short' });
  const year = dateTime.dateTime.getFullYear();

  return `${day} ${month}. ${year}`;
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
  file: File | Buffer | string,
): Promise<string | undefined> {
  const dateTime = await extractDateTimeFromExif(file);
  
  if (!dateTime?.time) {
    return undefined;
  }

  // Formatar como "HH:MM" (remover segundos)
  return dateTime.time.split(':').slice(0, 2).join(':');
}
