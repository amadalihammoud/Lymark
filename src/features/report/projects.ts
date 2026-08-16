import type { GalleryEntry } from '@/types';

/**
 * Projetos (obras) — o agrupamento que transforma a galeria em relatório.
 *
 * O app já pede um "Código de Foto" no carimbo, e é ele que o pessoal de
 * campo usa para amarrar cada foto a uma obra, OS ou contrato. O projeto não
 * é uma entidade nova com cadastro próprio: é a leitura agrupada do que a
 * galeria já sabe. Nada para criar, sincronizar ou migrar — quem carimbou
 * com código já tem projetos.
 */

export type Project = {
  /** O código compartilhado pelas fotos, ou `''` para as sem código. */
  code: string;
  /** Fotos do projeto, da mais antiga para a mais nova — ordem de leitura de um relatório. */
  entries: GalleryEntry[];
};

/**
 * Agrupa o histórico por código de foto.
 *
 * Códigos são comparados após `trim()`, porque um espaço a mais no campo não
 * é um projeto diferente. Projetos nomeados vêm primeiro, em ordem
 * alfabética; as fotos sem código formam um último grupo, com `code: ''`.
 */
export function groupByProject(entries: GalleryEntry[]): Project[] {
  const byCode = new Map<string, GalleryEntry[]>();

  for (const entry of entries) {
    const code = entry.metadata.code.trim();
    const bucket = byCode.get(code);
    if (bucket) bucket.push(entry);
    else byCode.set(code, [entry]);
  }

  const projects = [...byCode.entries()].map(([code, group]) => ({
    code,
    entries: [...group].sort((a, b) => a.exportedAt.localeCompare(b.exportedAt)),
  }));

  return projects.sort((a, b) => {
    if (a.code === '') return 1;
    if (b.code === '') return -1;
    return a.code.localeCompare(b.code);
  });
}
