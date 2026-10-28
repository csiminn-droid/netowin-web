'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { buscarTodos } from '@/lib/supabase/todos';
import Busca from '@/components/Busca';
import Relatorio from '@/components/Relatorio';
import { Cabecalho } from '@/components/ui';
import { B_REP } from '@/lib/entidades';
import { data as fData, hojeISO, numero } from '@/lib/formato';
import type { Linha } from '@/lib/tipos';

export default function Vendas() {
  const hoje = hojeISO();
  const [ini, setIni] = useState(hoje.slice(0, 8) + '01');
  const [fim, setFim] = useState(hoje);
  const [rep, setRep] = useState<Linha | null>(null);
  const [resumo, setResumo] = useState<Linha[] | null>(null);
  const [pedidos, setPedidos] = useState<Linha[] | null>(null);

  useEffect(() => {
    setResumo(null); setPedidos(null);
    const sb = supabase();
    sb.rpc('rel_vendas', { ini, fim, cod: rep?.codigo ?? null }).then(({ data }) => setResumo(data || []));
    buscarTodos(() => { let q = sb.from('pedidos').select('pedido,data,cliente,fornecedor,total,comissao,vrcomissao').gte('data', ini).lte('data', fim).or('s.is.null,s.neq.C').order('data').order('pedido'); if (rep) q = q.eq('codfor', rep.codigo); return q; }).then(setPedidos);
  }, [ini, fim, rep]);

  const sub = `${fData(ini)} a ${fData(fim)}${rep ? ' · ' + rep.nome : ''}`;
  const soma = (l: Linha[] | null, c: string) => (l || []).reduce((a, x) => a + numero(x[c]), 0);
  return (
    <div className="space-y-4">
      <Cabecalho titulo="Vendas por período" />
      <div className="cartao p-4 grid sm:grid-cols-4 gap-3">
        <div><label className="rotulo">De</label><input type="date" className="campo" value={ini} onChange={(e) => setIni(e.target.value)} /></div>
        <div><label className="rotulo">Até</label><input type="date" className="campo" value={fim} onChange={(e) => setFim(e.target.value)} /></div>
        <div className="sm:col-span-2"><label className="rotulo">Representada (opcional)</label><Busca config={B_REP} valor={rep?.codigo} texto={rep?.nome} onEscolher={setRep} placeholder="Todas" /></div>
      </div>
      <Relatorio titulo="Resumo de vendas por representada" subtitulo={sub} arquivo="ResumoVendas.pdf" linhas={resumo}
        colunas={[{ titulo: 'Representada', campo: 'fornecedor' }, { titulo: 'Pedidos', campo: 'pedidos', tipo: 'numero' }, { titulo: 'Total vendido', campo: 'total', tipo: 'moeda' }, { titulo: 'Comissão', campo: 'comissao', tipo: 'moeda' }]}
        totais={{ pedidos: soma(resumo, 'pedidos'), total: soma(resumo, 'total'), comissao: soma(resumo, 'comissao') }} />
      <Relatorio titulo="Pedidos do período" subtitulo={sub} arquivo="PedidosPeriodo.pdf" linhas={pedidos}
        colunas={[{ titulo: 'Data', campo: 'data', tipo: 'data' }, { titulo: 'Pedido', campo: 'pedido' }, { titulo: 'Cliente', campo: 'cliente' }, { titulo: 'Representada', campo: 'fornecedor' },
          { titulo: 'Total', campo: 'total', tipo: 'moeda' }, { titulo: '%', campo: 'comissao', tipo: 'percentual' }, { titulo: 'Comissão', campo: 'vrcomissao', tipo: 'moeda' }]}
        totais={{ total: soma(pedidos, 'total'), vrcomissao: soma(pedidos, 'vrcomissao') }} />
    </div>
  );
}
