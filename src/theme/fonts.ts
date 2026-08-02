import { Barlow_400Regular, Barlow_500Medium } from '@expo-google-fonts/barlow';
import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed';

/**
 * Tipografia da marca d'água.
 *
 * A fonte do carimbo é embutida no app, e não herdada do sistema. Duas
 * razões, ambas de produto:
 *
 * 1. **Fidelidade.** A hora usa um desenho condensado — dígitos altos e
 *    estreitos. Nenhuma fonte padrão de Android ou iOS tem essa proporção, e
 *    é ela que dá ao carimbo a aparência de instrumento de registro.
 * 2. **Constância.** O carimbo faz parte da imagem exportada. Herdar a fonte
 *    do sistema faria a mesma vistoria sair com desenhos diferentes conforme
 *    o aparelho e a versão do OS.
 *
 * A interface do app continua com a fonte do sistema — ali o certo é
 * respeitar a preferência de quem usa.
 *
 * Barlow é licenciada sob a SIL Open Font License, que permite embutir e
 * redistribuir. A licença acompanha cada pacote, no arquivo `LICENSE_FONT`.
 */

/** Passado a `useFonts` na raiz. Só os pesos usados, para não inflar o bundle. */
export const watermarkFontAssets = {
  BarlowCondensed_700Bold,
  Barlow_400Regular,
  Barlow_500Medium,
};

export const fontFamily = {
  /** Hora — condensada e pesada, o elemento dominante do carimbo. */
  stamp: 'BarlowCondensed_700Bold',
  /** Data, dia da semana e endereço. */
  stampBody: 'Barlow_400Regular',
  /** Código de foto: um passo acima do corpo, para leitura de sequência. */
  stampCode: 'Barlow_500Medium',
} as const;
