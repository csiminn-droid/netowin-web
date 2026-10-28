/**
 * O Supabase devolve no máximo 1000 linhas por consulta.
 * Esta função busca em partes até trazer tudo (até o limite de segurança).
 */
export async function buscarTodos<T = any>(consulta: () => any, maximo = 100000, tamanho = 1000): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < maximo; i += tamanho) {
    const { data, error } = await consulta().range(i, i + tamanho - 1);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < tamanho) break;
  }
  return out;
}
