import type { SupabaseClient } from '@supabase/supabase-js';
import { parseParadox } from './paradox';
import { DESTINOS, ARQUIVO_SISTEMA, converterLinhas, converterSistema, type Linha } from './importar';

export type ArquivoEntrada = { name: string; data: ArrayBuffer };
export type Progresso = (msg: string, pct: number) => void;

export function arquivosReconhecidos(nomes: string[]) {
  const set = new Set(nomes.map((n) => n.toLowerCase()));
  const esperados = [...DESTINOS.flatMap((d) => d.fontes.map((f) => f.arquivo)), ARQUIVO_SISTEMA];
  return { encontrados: esperados.filter((e) => set.has(e)), faltando: esperados.filter((e) => !set.has(e)) };
}

export async function importarTudo(sb: SupabaseClient, arquivos: ArquivoEntrada[], progresso: Progresso) {
  const porNome = new Map(arquivos.map((a) => [a.name.toLowerCase(), a]));
  const lotes: { tabela: string; linhas: Linha[] }[] = [];
  progresso('Lendo os arquivos do sistema antigo...', 1);
  for (const d of [...DESTINOS].sort((a, b) => a.ordem - b.ordem)) {
    const linhas: Linha[] = [];
    for (const f of d.fontes) {
      const a = porNome.get(f.arquivo);
      if (!a) continue;
      const t = parseParadox(a.data);
      linhas.push(...converterLinhas(d, f, t.rows));
    }
    lotes.push({ tabela: d.tabela, linhas });
  }
  const total = lotes.reduce((s, l) => s + l.linhas.length, 0) || 1;

  progresso('Apagando os dados atuais do sistema novo...', 3);
  const { error: e1 } = await sb.rpc('limpar_dados');
  if (e1) throw new Error('Não foi possível limpar os dados: ' + e1.message);

  let feitos = 0;
  const resumo: Record<string, number> = {};
  for (const l of lotes) {
    const TAM = 1000;
    for (let i = 0; i < l.linhas.length; i += TAM) {
      const parte = l.linhas.slice(i, i + TAM);
      const { error } = await sb.from(l.tabela).insert(parte);
      if (error) throw new Error(`Erro ao gravar ${l.tabela}: ${error.message}`);
      feitos += parte.length;
      progresso(`Gravando ${l.tabela} (${Math.min(i + TAM, l.linhas.length)} de ${l.linhas.length})`, 3 + Math.round((feitos / total) * 94));
    }
    resumo[l.tabela] = l.linhas.length;
  }

  const sis = porNome.get(ARQUIVO_SISTEMA);
  if (sis) {
    const s = converterSistema(parseParadox(sis.data).rows[0]);
    if (s) await sb.from('sistema').upsert(s);
  }
  progresso('Ajustando numeração...', 98);
  const { error: e2 } = await sb.rpc('ajustar_sequencias');
  if (e2) throw new Error('Erro ao ajustar numeração: ' + e2.message);
  progresso('Importação concluída', 100);
  return resumo;
}
