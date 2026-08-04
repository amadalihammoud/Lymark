/**
 * Monta o manual de uso publicável a partir da fonte em `docs/`.
 *
 * O manual é composto nas **mesmas fontes do carimbo** — cada medida sai na
 * Pathway Gothic One, a mesma que desenha "21:55" em toda foto exportada. Numa
 * página publicada isso obriga a embutir as fontes como `data:` URI, porque a
 * política de segurança do destino recusa pedido a servidor externo.
 *
 * Só que 246 KB de fonte em base64 gravados no repositório voltariam a ser
 * gravados por inteiro a cada correção de uma vírgula do texto. Então o que o
 * repositório guarda é o manual legível, e este script produz a versão com as
 * fontes embutidas na hora de publicar — lendo-as de `node_modules`, onde elas
 * já estão.
 *
 *   node scripts/build-manual.js [saída.html]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const NM = path.join(ROOT, 'node_modules');
const SOURCE = path.join(ROOT, 'docs', 'manual-de-uso.html');
const OUT = process.argv[2] || path.join(ROOT, 'docs', 'manual-de-uso.build.html');

/** As três faces do carimbo, com o nome que o CSS do manual espera. */
const FACES = [
  {
    family: 'LymarkClock',
    weight: 400,
    file: `${NM}/@expo-google-fonts/pathway-gothic-one/400Regular/PathwayGothicOne_400Regular.ttf`,
  },
  {
    family: 'LymarkBody',
    weight: 400,
    file: `${NM}/@expo-google-fonts/barlow/400Regular/Barlow_400Regular.ttf`,
  },
  {
    family: 'LymarkBody',
    weight: 500,
    file: `${NM}/@expo-google-fonts/barlow/500Medium/Barlow_500Medium.ttf`,
  },
];

const faceRules = FACES.map(({ family, weight, file }) => {
  const data = fs.readFileSync(file).toString('base64');
  return (
    `@font-face{font-family:"${family}";` +
    `src:url(data:font/ttf;base64,${data}) format("truetype");` +
    `font-weight:${weight};font-display:block}`
  );
}).join('\n');

const head =
  '<title>Lymark — Manual de uso</title>\n' + `<style>\n${faceRules}\n</style>\n`;

fs.writeFileSync(OUT, head + fs.readFileSync(SOURCE, 'utf8'));

const kb = Math.round(fs.statSync(OUT).size / 1024);
console.log(`manual montado com ${FACES.length} faces embutidas: ${OUT} (${kb} KB)`);
