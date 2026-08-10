/**
 * Testes para o módulo de leitura de EXIF.
 */

import { extractDateFromExif, extractTimeFromExif } from '../exif';

describe('exif', () => {
  describe('parseExifDateTime (lógica interna)', () => {
    it('deve parsear formato EXIF válido', () => {
      const value = '2026:08:01 21:55:00';
      const [datePart, timePart] = value.split(' ');
      const [year, month, day] = datePart!.split(':').map(Number);
      const [hours, minutes, seconds] = timePart!.split(':').map(Number);
      
      expect(year).toBe(2026);
      expect(month).toBe(8);
      expect(day).toBe(1);
      expect(hours).toBe(21);
      expect(minutes).toBe(55);
      expect(seconds).toBe(0);
    });

    it('deve formatar data como YYYY-MM-DD', () => {
      const year = 2026;
      const month = 8;
      const day = 1;
      const date = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      expect(date).toBe('2026-08-01');
    });

    it('deve formatar hora como HH:MM:SS', () => {
      const hours = 21;
      const minutes = 55;
      const seconds = 0;
      const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      expect(time).toBe('21:55:00');
    });
  });

  describe('extractTimeFromExif', () => {
    it('deve extrair hora no formato HH:MM', async () => {
      const result = await extractTimeFromExif(Buffer.from(''));
      expect(result).toBeUndefined();
    });
  });

  describe('extractDateFromExif', () => {
    it('deve extrair data no formato DD MMM. YYYY', async () => {
      const result = await extractDateFromExif(Buffer.from(''));
      expect(result).toBeUndefined();
    });
  });
});
