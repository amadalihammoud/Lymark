import { displayDimensions, rotationDegrees, swapsAxes } from '../video-rotation';

/**
 * As amostras não são inventadas: saíram do próprio ffmpeg empacotado (7.0.2)
 * sondando arquivos gerados para este teste. O caso do retrato foi conferido
 * ponta a ponta — o filtro entrega 1080x1920, exatamente o que
 * `displayDimensions` passou a devolver.
 */
const PORTRAIT = `
  Duration: 00:00:01.00, start: 0.000000, bitrate: 190 kb/s
  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(progressive), 1920x1080 [SAR 1:1 DAR 16:9], 183 kb/s, 10 fps, 10 tbr, 10240 tbn (default)
      Metadata:
        handler_name     : VideoHandler
        displaymatrix: rotation of 90.00 degrees
`;

const LANDSCAPE = `
  Duration: 00:00:01.00, start: 0.000000, bitrate: 190 kb/s
  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(progressive), 1920x1080 [SAR 1:1 DAR 16:9], 183 kb/s, 10 fps, 10 tbr, 10240 tbn (default)
`;

/** Arquivos mais antigos declaram a rotação nos metadados do stream. */
const LEGACY = `
  Stream #0:0(und): Video: h264, yuv420p, 1280x720, 30 fps
      Metadata:
        rotate          : 270
`;

describe('a rotação declarada no vídeo', () => {
  it('lê o displaymatrix do ffmpeg atual e a grafia antiga', () => {
    expect(rotationDegrees(PORTRAIT)).toBe(90);
    expect(rotationDegrees(LEGACY)).toBe(270);
    expect(rotationDegrees(LANDSCAPE)).toBe(0);
  });

  it('só um quarto de volta troca os eixos', () => {
    expect(swapsAxes(90)).toBe(true);
    expect(swapsAxes(-90)).toBe(true);
    expect(swapsAxes(270)).toBe(true);
    expect(swapsAxes(180)).toBe(false);
    expect(swapsAxes(0)).toBe(false);
  });

  it('retrato: devolve o quadro EXIBIDO, que é o que o filtro recebe', () => {
    // Conferido com ffmpeg real: o filtro entrega 1080x1920. Devolver o
    // codificado (1920x1080) desenhava o carimbo em paisagem sobre um quadro
    // em retrato — deslocado para o meio e cortado na largura.
    expect(displayDimensions(PORTRAIT)).toEqual({ width: 1080, height: 1920 });
  });

  it('sem rotação, as dimensões passam intactas', () => {
    expect(displayDimensions(LANDSCAPE)).toEqual({ width: 1920, height: 1080 });
  });

  it('a grafia antiga também gira', () => {
    expect(displayDimensions(LEGACY)).toEqual({ width: 720, height: 1280 });
  });

  it('saída sem dimensões reconhecíveis não é vídeo que saibamos ler', () => {
    expect(displayDimensions('nada aqui')).toBeNull();
  });
});
