import { isRtl, type Locale } from '@i18n/locales';

/**
 * Diz ao navegador em que idioma a página está.
 *
 * O `<html lang>` não é enfeite de marcação. É o que faz um leitor de tela
 * escolher a voz e a pronúncia certas — sem ele, uma interface em russo é lida
 * com fonemas portugueses, o que não é sotaque, é ininteligível. É também o
 * que orienta a hifenização, o corretor ortográfico dos campos de texto e a
 * seleção de glifo em fontes que servem a mais de um idioma.
 *
 * O `dir` vai junto porque separá-los não faria sentido: em árabe, o navegador
 * precisa saber que o texto corre da direita para a esquerda para alinhar
 * parágrafos, posicionar a pontuação no fim da frase e ordenar os trechos
 * numa linha que mistura árabe e números.
 *
 * **Por que em tempo de execução.** O shell da exportação web (`+html.tsx`) é
 * gerado uma vez, no servidor, e serve as doze línguas — o Expo publica uma
 * aplicação de página única, e o idioma só é conhecido quando o aparelho
 * responde ou o disco devolve a escolha da pessoa. O valor do shell é o padrão;
 * este é o valor certo.
 *
 * Recebe o documento por parâmetro, em vez de alcançar o global, para poder
 * ser testado sem simular um navegador inteiro — e porque no Android e no iOS
 * ele simplesmente não existe.
 */

/** O mínimo do documento que interessa aqui. */
export type DocumentRoot = {
  documentElement?: { lang: string; dir: string } | null;
};

export function applyDocumentLanguage(
  doc: DocumentRoot | null | undefined,
  locale: Locale,
): void {
  const root = doc?.documentElement;

  // No Android e no iOS não há documento — e não é erro, é a plataforma.
  if (!root) return;

  root.lang = locale;
  root.dir = isRtl(locale) ? 'rtl' : 'ltr';
}
