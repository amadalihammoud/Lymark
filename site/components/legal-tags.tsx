import { Link } from '../i18n/navigation';

/**
 * As marcações que aparecem dentro do texto dos documentos jurídicos.
 *
 * Os nomes descrevem o que a marca **significa**, e não como ela aparece —
 * `<privacy>` em vez de `<a>` —, que é a convenção já usada no catálogo
 * principal em `site.data.note` e `site.availability.contact`. Quem traduz move
 * a marca junto com a palavra a que ela pertence, sem precisar saber para onde
 * o endereço aponta; e mudar o destino de um link não mexe em doze traduções.
 *
 * `<strong>` e `<em>` são exceção proposital: ali a marca já é o significado.
 * O `<em>` carrega os termos estrangeiros do RGPD — *controller*, *processor*,
 * *Data Protection Officer* —, que continuam em inglês em todos os idiomas
 * porque é assim que o Regulamento os nomeia.
 */
export const LEGAL_TAGS = {
  strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
  em: (chunks: React.ReactNode) => <em>{chunks}</em>,
  email: (chunks: React.ReactNode) => <a href="mailto:contato@lymark.app">{chunks}</a>,
  privacy: (chunks: React.ReactNode) => <Link href="/privacidade">{chunks}</Link>,
  terms: (chunks: React.ReactNode) => <Link href="/termos">{chunks}</Link>,
} as const;
