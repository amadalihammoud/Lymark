/**
 * Tetos de comprimento dos campos do carimbo.
 *
 * Não são preciosismo de formulário: a geometria dimensiona o carimbo a
 * partir do texto, e texto sem limite produz carimbo sem limite. Medido com o
 * layout real, num quadro de 4000x3000, colar 100 mil caracteres no campo
 * HORA empurra o bloco para `x ≈ 12,9 milhões` — o carimbo sai inteiro para
 * fora da foto, e o arquivo é gravado como sucesso, sem aviso nenhum.
 *
 * Os valores são folgados em relação ao uso real (a data cabe em 12
 * caracteres, o dia em 3) para não atrapalhar quem digita, e apertados o
 * bastante para que nenhum deles descaracterize o desenho.
 *
 * Mora em módulo próprio porque há dois formulários agora — o empilhado do
 * celular e a régua da tela larga —, e um teto que valesse só num deles seria
 * um buraco por onde o mesmo defeito volta.
 */
export const FIELD_MAX_LENGTH = {
  time: 8,
  date: 24,
  weekday: 16,
  /** Endereço completo com CEP cabe folgado; é o único que quebra em linhas. */
  address: 200,
} as const;
