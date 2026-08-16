// Importados pelo caminho de cada peso, e não pelo índice do pacote. O índice
// faz `require` dos 20 pesos do Barlow, e o Metro não descarta asset não usado:
// pelo barril iam 1,9 MB para dentro do APK, contra 196 KB assim.
import { Barlow_400Regular } from '@expo-google-fonts/barlow/400Regular';
import { Barlow_500Medium } from '@expo-google-fonts/barlow/500Medium';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium';
import { PathwayGothicOne_400Regular } from '@expo-google-fonts/pathway-gothic-one/400Regular';
import { SpaceGrotesk_400Regular } from '@expo-google-fonts/space-grotesk/400Regular';
import { SpaceGrotesk_500Medium } from '@expo-google-fonts/space-grotesk/500Medium';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk/700Bold';

/**
 * As fontes embutidas no aplicativo.
 *
 * São dois conjuntos, com razões diferentes para existir — e é por isso que o
 * Manual de Marca alcança um e não o outro.
 *
 * ## A interface: Space Grotesk e IBM Plex Mono
 *
 * As do manual. Space Grotesk em títulos e interface; IBM Plex Mono restrita a
 * rótulos curtos em caixa alta, números, códigos e legendas técnicas — nunca em
 * texto corrido. São as mesmas do site, e por isso as duas telas do produto
 * falam com a mesma voz.
 *
 * Aqui a interface deixa de herdar a fonte do sistema. Vale dizer o que isso
 * **não** muda: o corpo do texto continua acompanhando o ajuste de tamanho de
 * fonte do aparelho, que é a preferência que importa para quem precisa dela. O
 * que passa a ser fixo é o desenho da letra, e desenho de letra é identidade.
 *
 * Cada peso é uma família própria — no React Native `fontWeight` não escolhe
 * entre arquivos registrados separadamente, então quem mapeia peso para
 * família é `typography`, e não o sistema.
 *
 * ## O carimbo: Pathway Gothic One e Barlow
 *
 * Estas **não** mudam com o manual, e a razão é que elas não são a identidade
 * do Lymark: são o desenho de um carimbo que o produto precisa reproduzir.
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
 * Trocá-las pelas do manual redesenharia o carimbo de toda foto já exportada
 * daqui em diante, desfazendo a medição — e faria isso para ganhar coerência
 * numa peça que é da empresa que assina o registro, não do Lymark.
 *
 * As cinco famílias são licenciadas sob a SIL Open Font License, que permite
 * embutir e redistribuir. A licença acompanha cada pacote, no arquivo
 * `LICENSE_FONT`.
 */

/** Passado a `useFonts` na raiz. Só os pesos usados, para não inflar o bundle. */
export const watermarkFontAssets = {
  PathwayGothicOne_400Regular,
  Barlow_400Regular,
  Barlow_500Medium,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
  IBMPlexMono_500Medium,
};

export const fontFamily = {
  /** Hora — condensada e alta, o elemento dominante do carimbo. */
  stamp: 'PathwayGothicOne_400Regular',
  /** Data, dia da semana e endereço. */
  stampBody: 'Barlow_400Regular',
  /** Código de foto: um passo acima do corpo, para leitura de sequência. */
  stampCode: 'Barlow_500Medium',

  /** Interface, nos três pesos do manual. */
  uiRegular: 'SpaceGrotesk_400Regular',
  uiMedium: 'SpaceGrotesk_500Medium',
  uiBold: 'SpaceGrotesk_700Bold',
  /** Só rótulo curto em caixa alta, número, código ou legenda técnica. */
  uiMono: 'IBMPlexMono_500Medium',
} as const;
