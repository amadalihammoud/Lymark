/**
 * Em que tamanho o logotipo é de fato desenhado, por resolução de foto.
 *
 * O manual precisa dizer que arquivo enviar, e "use um PNG grande" não é
 * resposta. Estes números saem da geometria de verdade — a mesma que desenha
 * a foto —, rodada nas resoluções que as câmeras dos telefones produzem.
 *
 *   npx tsc -p tsconfig.calib.json && node scripts/measure-logo-sizes.js
 */
const path = require('path');
const Module = require('module');

const BUILD = process.env.LYMARK_CALIB_BUILD || '/tmp/lymark-build';

const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request.startsWith('@/')) {
    return resolve.call(this, path.join(BUILD, 'src', request.slice(2)), ...rest);
  }
  return resolve.call(this, request, ...rest);
};

const { buildStampGeometry } = require(path.join(BUILD, 'src/features/watermark/stamp-layout.js'));
const { DEFAULT_WATERMARK_PREFERENCES } = require(
  path.join(BUILD, 'src/features/watermark/preferences.js'),
);

/**
 * Medidor aproximado, e de propósito.
 *
 * A largura do texto não muda a **altura** do logotipo, que é o que este script
 * mede: ela sai do corpo do nome e do complemento. Carregar as fontes reais
 * aqui só somaria dependência sem mudar o resultado.
 */
const measure = (text, size, font) =>
  font === 'clock' ? (text.length * size * 1.554) / 5 : text.length * size * 0.53;

const CONTENT = {
  time: '21:55',
  date: '01 ago. 2026',
  weekday: 'Sáb',
  address: 'Av. Puglisi, 490 - Centro, Guarujá - SP, 11410-002',
  code: '98926A73655DC1',
  showRule: true,
  isEmpty: false,
};

/** As resoluções que as câmeras de telefone entregam hoje. */
const FRAMES = [
  { label: '12 MP retrato', width: 3024, height: 4032 },
  { label: '12 MP paisagem', width: 4032, height: 3024 },
  { label: '48 MP retrato', width: 6000, height: 8000 },
  { label: '8 MP retrato', width: 2448, height: 3264 },
  { label: 'HD paisagem', width: 1920, height: 1080 },
];

const SCALES = ['small', 'medium', 'large'];

function logoRect(frame, scale, aspect) {
  const geometry = buildStampGeometry({
    content: CONTENT,
    preferences: {
      ...DEFAULT_WATERMARK_PREFERENCES,
      scale,
      brandPlacement: 'header',
      brandMode: 'custom',
      brandParts: [
        { text: 'AUTO', color: '#FFFFFF' },
        { text: 'GLASS', color: '#F5B60D' },
      ],
      brandComplement: 'Vidros e vistorias',
      brandLogoPath: 'brand/00000000-0000-4000-8000-000000000000.png',
      brandLogoAspect: aspect,
    },
    frame,
    measure,
    allowGrowth: true,
  });

  return geometry.images[0];
}

console.log('=== altura do logotipo desenhado, em pixels ===\n');
console.log(
  'resolução'.padEnd(18),
  SCALES.map((s) => s.padStart(9)).join(''),
  '   fração da altura da foto',
);

let worst = 0;

for (const frame of FRAMES) {
  const heights = SCALES.map((scale) => logoRect(frame, scale, 1).height);
  worst = Math.max(worst, ...heights);

  console.log(
    frame.label.padEnd(18),
    heights.map((h) => String(h).padStart(9)).join(''),
    `   ${((heights[2] / frame.height) * 100).toFixed(1)}% (grande)`,
  );
}

console.log('\n=== largura, por proporção do arquivo (12 MP retrato, grande) ===\n');

const frame = FRAMES[0];
for (const aspect of [0.5, 1, 1.5, 2, 2.4, 3, 4]) {
  const rect = logoRect(frame, 'large', aspect);
  const limited = aspect > 2.4;

  console.log(
    `${aspect.toFixed(1)}:1`.padEnd(8),
    `${rect.width} x ${rect.height} px`.padEnd(18),
    limited ? '← limitado em 2,4:1' : '',
  );
}

console.log(
  `\nMaior altura desenhada em qualquer caso: ${worst} px.`,
  `\nO arquivo é guardado com no máximo 1024 px no lado maior, então um`,
  `\noriginal a partir de ${Math.ceil(worst / 100) * 100} px no lado maior nunca é ampliado.`,
);
