import { Barlow_400Regular, Barlow_500Medium } from '@expo-google-fonts/barlow';
import { PathwayGothicOne_400Regular } from '@expo-google-fonts/pathway-gothic-one';

/**
 * Tipografia da marca d'água.
 *
 * A fonte do carimbo é embutida no app, e não herdada do sistema. Duas
 * razões, ambas de produto:
 *
 * 1. **Fidelidade.** A hora usa Pathway Gothic One. A escolha não foi por
 *    gosto: a referência foi medida e comparada com oito condensadas por
 *    dois critérios objetivos, com todas normalizadas à mesma largura —
 *    a razão altura/largura do bloco "21:55" (referência 0,498) e a
 *    densidade de traço (referência 0,339). Pathway Gothic One dá 0,498 e
 *    0,318; a segunda colocada erra a proporção em 10%.
 *
 *    Contra-intuitivo: a fonte da referência é **leve**. Ela parece pesada
 *    porque os dígitos são muito altos para a largura que ocupam. Escolher
 *    pelo "parece bold" levava a Oswald ou Anton, ambas erradas.
 *
 *    Nenhuma fonte padrão de Android ou iOS tem esse desenho.
 * 2. **Constância.** O carimbo faz parte da imagem exportada. Herdar a fonte
 *    do sistema faria a mesma vistoria sair com desenhos diferentes conforme
 *    o aparelho e a versão do OS.
 *
 * A interface do app continua com a fonte do sistema — ali o certo é
 * respeitar a preferência de quem usa.
 *
 * Pathway Gothic One e Barlow são licenciadas sob a SIL Open Font License,
 * que permite embutir e redistribuir. A licença acompanha cada pacote, no
 * arquivo `LICENSE_FONT`.
 */

/** Passado a `useFonts` na raiz. Só os pesos usados, para não inflar o bundle. */
export const watermarkFontAssets = {
  PathwayGothicOne_400Regular,
  Barlow_400Regular,
  Barlow_500Medium,
};

export const fontFamily = {
  /** Hora — condensada e alta, o elemento dominante do carimbo. */
  stamp: 'PathwayGothicOne_400Regular',
  /** Data, dia da semana e endereço. */
  stampBody: 'Barlow_400Regular',
  /** Código de foto: um passo acima do corpo, para leitura de sequência. */
  stampCode: 'Barlow_500Medium',
} as const;
