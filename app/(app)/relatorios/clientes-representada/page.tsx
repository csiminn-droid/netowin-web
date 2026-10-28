'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { buscarTodos } from '@/lib/supabase/todos';
import Busca from '@/components/Busca';
import Relatorio from '@/components/Relatorio';
import { Cabecalho } from '@/components/ui';
import { B_REP } from '@/lib/entidades';
import { numero } from '@/lib/formato';
import type { Linha } from '@/lib/tipos';
import type { ColunaPdf } from '@/lib/pdf';

export default function ClientesRepresentada() {
  const [rep, setRep] = useState<Linha | null>(null);
  const [dados, setDados] = useState<Linha[] | null>([]);
  const [anos, setAnos] = useState(5);
  useEffect(() => {
    if (!rep) { setDados([]); return; }
    setDados(null);
    buscarTodos(() => supabase().rpc('rel_clientes_representada_ano', { cod: rep.codigo })).then(setDados);
  }, [rep]);
  const { linhas, colunas, totais } = useMemo(() => {
    const atual = new Date().getFullYear();
    const lista = Array.from({ length: anos }, (_, i) => atual - anos + 1 + i);
    const mapa = new Map<number, Linha>();
    for (const d of dados || []) {
      if (!lista.includes(d.ano)) continue;
      const l = mapa.get(d.codcli) || { codcli: d.codcli, cliente: d.cliente, cidade: d.cidade, total: 0 };
      l['a' + d.ano] = numero(d.total); l.total += numero(d.total);
      mapa.set(d.codcli, l);
    }
    const linhas = Array.from(mapa.values()).sort((a, b) => b.total - a.total);
    const colunas: ColunaPdf[] = [{ titulo: 'Cód.', campo: 'codcli' }, { titulo: 'Cliente', campo: 'cliente' }, { titulo: 'Cidade', campo: 'cidade' },
      ...lista.map((a) => ({ titulo: String(a), campo: 'a' + a, tipo: 'moeda' as const })), { titulo: 'Total', campo: 'total', tipo: 'moeda' }];
    const totais: Record<string, number> = { total: linhas.reduce((s, l) => s + l.total, 0) };
    for (const a of lista) totais['a' + a] = linhas.reduce((s, l) => s + numero(l['a' + a]), 0);
    return { linhas: dados === null ? null : linhas, colunas, totais };
  }, [dados, anos]);
  return (
    <div className="space-y-4">
      <Cabecalho titulo="Clientes por representada e ano" />
      <div className="cartao p-4 grid sm:grid-cols-4 gap-3">
        <div className="sm:col-span-3"><label className="rotulo">Representada</label><Busca config={B_REP} valor={rep?.codigo} texto={rep?.nome} onEscolher={setRep} autoFocus /></div>
        <div><label className="rotulo">Últimos anos</label><select className="campo" value={anos} onChange={(e) => setAnos(Number(e.target.value))}>{[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n} anos</option>)}</select></div>
      </div>
      {rep && <Relatorio titulo="Clientes que compram por representada x ano" subtitulo={`${rep.codigo} - ${rep.nome}`} arquivo={`ClientesRepresentada${rep.codigo}.pdf`} linhas={linhas} colunas={colunas} totais={totais} paisagem />}
    </div>
  );
}
