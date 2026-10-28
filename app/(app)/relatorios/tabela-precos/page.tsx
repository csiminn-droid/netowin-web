'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { buscarTodos } from '@/lib/supabase/todos';
import Busca from '@/components/Busca';
import { Cabecalho, Carregando, Vazio } from '@/components/ui';
import { useCompartilhar } from '@/components/Compartilhar';
import { B_REP } from '@/lib/entidades';
import { moeda } from '@/lib/formato';
import { pdfTabelaPrecos } from '@/lib/pdf';
import type { Linha } from '@/lib/tipos';

export default function TabelaPrecos() {
  const sp = useSearchParams();
  const compartilhar = useCompartilhar();
  const [rep, setRep] = useState<Linha | null>(null);
  const [produtos, setProdutos] = useState<Linha[] | null>([]);
  const [precos, setPrecos] = useState<number[]>([1, 2, 3]);
  const [tipo, setTipo] = useState('');
  const [obs, setObs] = useState('');
  useEffect(() => { const r = sp.get('rep'); if (r) supabase().from('fornecedores').select('*').eq('codigo', Number(r)).maybeSingle().then(({ data }) => data && setRep(data)); }, [sp]);
  useEffect(() => {
    if (!rep) { setProdutos([]); return; }
    setProdutos(null);
    buscarTodos(() => supabase().from('produtos').select('*').eq('fornecedor', rep.codigo).eq('ativo', true).order('produto').order('codigo')).then(setProdutos);
  }, [rep]);
  const tiposDisponiveis = Array.from(new Set((produtos || []).map((p) => p.tipo).filter(Boolean))).sort();
  const lista = (produtos || []).filter((p) => !tipo || p.tipo === tipo);
  const gerar = async () => {
    if (!rep) return;
    const blob = await pdfTabelaPrecos(rep, lista, precos.length ? precos : [1], obs);
    compartilhar({ blob, arquivo: `tabelaprecos${rep.codigo}.pdf`, titulo: `Tabela de preços - ${rep.nome}`, texto: `Segue a tabela de preços atualizada da ${rep.nome}.` });
  };
  return (
    <div className="space-y-4">
      <Cabecalho titulo="Tabela de preços" />
      <div className="cartao p-4 grid sm:grid-cols-4 gap-3 items-end">
        <div className="sm:col-span-2"><label className="rotulo">Representada</label><Busca config={B_REP} valor={rep?.codigo} texto={rep?.nome} onEscolher={setRep} autoFocus={!rep} /></div>
        <div><label className="rotulo">Tipo de produto</label><select className="campo" value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="">Todos</option>{tiposDisponiveis.map((t) => <option key={t}>{t}</option>)}</select></div>
        <div>
          <span className="rotulo">Preços na tabela</span>
          <div className="flex gap-3 h-[46px] items-center">{[1, 2, 3, 4, 5].map((k) => (
            <label key={k} className="flex items-center gap-1"><input type="checkbox" className="h-4 w-4 accent-marca" checked={precos.includes(k)} onChange={(e) => setPrecos(e.target.checked ? [...precos, k].sort() : precos.filter((x) => x !== k))} />{k}</label>
          ))}</div>
        </div>
        <div className="sm:col-span-3"><label className="rotulo">Observações no rodapé</label><input className="campo" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: preços válidos até..., pedido mínimo..." /></div>
        <button className="botao-primario" disabled={!rep || !lista.length} onClick={gerar}>Gerar PDF / enviar</button>
      </div>
      {rep && (
        <section className="cartao overflow-x-auto">
          {produtos === null ? <Carregando /> : lista.length === 0 ? <Vazio texto="Nenhum produto ativo" /> : (
            <table className="tabela">
              <thead><tr><th>Código</th><th>Descrição</th><th>Unid.</th>{precos.map((k) => <th key={k} className="text-right">Preço {k}</th>)}<th className="text-right">IPI</th><th>Embal.</th><th>Cód. fáb.</th></tr></thead>
              <tbody>{lista.map((p) => (
                <tr key={p.codigo}><td>{p.codigo}</td><td>{p.produto}</td><td>{p.unid}</td>{precos.map((k) => <td key={k} className="num">{p['valor' + k] != null ? moeda(p['valor' + k]) : ''}</td>)}<td className="num">{p.ipi ?? 0}</td><td>{p.embal}</td><td>{p.codfor}</td></tr>
              ))}</tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
