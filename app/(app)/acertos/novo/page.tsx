'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { buscarTodos } from '@/lib/supabase/todos';
import Busca from '@/components/Busca';
import Selecao from '@/components/Selecao';
import { Cabecalho, useConfirmar, useToast } from '@/components/ui';
import { useCompartilhar } from '@/components/Compartilhar';
import { B_REP } from '@/lib/entidades';
import { arred, hojeISO, moeda, numero } from '@/lib/formato';
import { imprimirAcerto } from '@/lib/acoes';
import type { Linha } from '@/lib/tipos';

const BANCO_VAZIO = { banconome: '', bancocpfcnpj: '', bancobanco: '', bancoagencia: '', bancoconta: '', bancotexto: '' };

export default function NovoAcerto() {
  const router = useRouter();
  const sp = useSearchParams();
  const avisar = useToast();
  const confirmar = useConfirmar();
  const compartilhar = useCompartilhar();
  const [rep, setRep] = useState<Linha | null>(null);
  const [vendas, setVendas] = useState<Linha[]>([]);
  const [dcs, setDcs] = useState<Linha[]>([]);
  const [selV, setSelV] = useState<Set<any>>(new Set());
  const [selD, setSelD] = useState<Set<any>>(new Set());
  const [contas, setContas] = useState<Linha[]>([]);
  const [banco, setBanco] = useState<Linha>(BANCO_VAZIO);
  const [dataAc, setDataAc] = useState(hojeISO());
  const [obs, setObs] = useState(['', '', '']);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    supabase().from('contas').select('*').order('descricao').then(({ data }) => {
      setContas(data || []);
      if (data?.[0]) { const { id, descricao, ...b } = data[0]; void id; void descricao; setBanco({ ...BANCO_VAZIO, ...b }); }
    });
    const r = sp.get('rep');
    if (r) supabase().from('fornecedores').select('*').eq('codigo', Number(r)).maybeSingle().then(({ data }) => data && setRep(data));
  }, [sp]);

  useEffect(() => {
    if (!rep) { setVendas([]); setDcs([]); return; }
    const sb = supabase();
    buscarTodos(() => sb.from('controlevendas').select('*').eq('codfor', rep.codigo).is('codacerto', null).order('data').order('id')).then((data) => { setVendas(data); setSelV(new Set()); });
    sb.from('debitocredito').select('*').eq('codfor', rep.codigo).is('codacerto', null).order('data').then(({ data }) => { setDcs(data || []); setSelD(new Set()); });
  }, [rep]);

  const tot = useMemo(() => {
    const v = vendas.filter((l) => selV.has(l.id));
    const d = dcs.filter((l) => selD.has(l.id));
    const vendasT = v.reduce((a, l) => a + numero(l.total), 0);
    const com = v.reduce((a, l) => a + numero(l.vrcomissao), 0);
    const dc = d.reduce((a, l) => a + numero(l.total), 0);
    return { vendasT, com, dc, receber: arred(com + dc, 2) };
  }, [vendas, dcs, selV, selD]);

  const fazer = async () => {
    if (!rep) return;
    if (selV.size === 0 && selD.size === 0) { avisar('Marque pelo menos um lançamento', 'erro'); return; }
    if (!(await confirmar(`Fazer o acerto com ${rep.nome}?`, { detalhe: `Valor a receber: ${moeda(tot.receber, true)}. Os lançamentos marcados saem da lista de "em aberto".`, ok: 'Fazer acerto' }))) return;
    setSalvando(true);
    const p = { ...banco, data: dataAc, obs1: obs[0], obs2: obs[1], obs3: obs[2], fornecedor: rep.nome };
    const { data, error } = await supabase().rpc('fazer_acerto', { cod: rep.codigo, vendas_ids: Array.from(selV), dc_ids: Array.from(selD), p });
    setSalvando(false);
    if (error) { avisar('Erro: ' + error.message, 'erro'); return; }
    avisar(`Acerto ${data} registrado`);
    await imprimirAcerto(data as number, { compartilhar, avisar });
    router.push('/c/acertos');
  };

  return (
    <div className="pb-24">
      <Cabecalho titulo="Fazer acerto com representada" descricao="Escolha a representada, marque as vendas e os débitos/créditos que entram neste acerto." />
      <section className="cartao p-4 mb-4 grid sm:grid-cols-4 gap-3">
        <div className="sm:col-span-3"><label className="rotulo">Representada</label><Busca config={B_REP} valor={rep?.codigo} texto={rep?.nome} onEscolher={setRep} autoFocus={!rep} /></div>
        <div><label className="rotulo">Data do acerto</label><input type="date" className="campo" value={dataAc} onChange={(e) => setDataAc(e.target.value)} /></div>
      </section>

      {rep && (<>
        <Selecao titulo="Vendas em aberto" linhas={vendas} marcados={selV} onMudar={setSelV} vazio="Nenhuma venda em aberto para esta representada"
          extra={<button className="botao-secundario botao-pequeno" onClick={() => setSelV(new Set(vendas.filter((l) => numero(l.entrega) > 0).map((l) => l.id)))}>Marcar só os faturados</button>}
          colunas={[{ nome: 'data', rotulo: 'Data', tipo: 'data' }, { nome: 'ref', rotulo: 'Pedido / NF' }, { nome: 'cliente', rotulo: 'Cliente' }, { nome: 'cidade', rotulo: 'Cidade' },
            { nome: 'total', rotulo: 'Valor', tipo: 'moeda' }, { nome: 'comissao', rotulo: '%', tipo: 'percentual' }, { nome: 'vrcomissao', rotulo: 'Comissão', tipo: 'moeda' }, { nome: 'entrega', rotulo: 'Faturado', tipo: 'moeda' }]} />
        <Selecao titulo="Débitos e créditos em aberto" linhas={dcs} marcados={selD} onMudar={setSelD} vazio="Nenhum débito ou crédito em aberto"
          colunas={[{ nome: 'data', rotulo: 'Data', tipo: 'data' }, { nome: 'historico', rotulo: 'Histórico' }, { nome: 'total', rotulo: 'Valor', tipo: 'moeda' }]} />

        <div className="grid md:grid-cols-2 gap-4">
          <section className="cartao p-4">
            <h2 className="font-semibold mb-3">Conta para depósito da comissão</h2>
            {contas.length > 0 && (
              <select className="campo mb-3" onChange={(e) => { const c = contas.find((x) => String(x.id) === e.target.value); if (c) { const { id, descricao, ...b } = c; void id; void descricao; setBanco({ ...BANCO_VAZIO, ...b }); } else setBanco(BANCO_VAZIO); }} aria-label="Escolher conta">
                {contas.map((c) => <option key={c.id} value={c.id}>{c.descricao}</option>)}
                <option value="">Nenhuma / digitar</option>
              </select>
            )}
            <div className="grid grid-cols-2 gap-2">
              {[['banconome', 'Titular'], ['bancocpfcnpj', 'CPF/CNPJ'], ['bancobanco', 'Banco'], ['bancoagencia', 'Agência'], ['bancoconta', 'Conta'], ['bancotexto', 'Texto extra / PIX']].map(([k, r]) => (
                <div key={k}><label className="rotulo">{r}</label><input className="campo" value={banco[k] || ''} onChange={(e) => setBanco({ ...banco, [k]: e.target.value })} /></div>
              ))}
            </div>
            <label className="rotulo mt-3">Observações</label>
            {obs.map((o, i) => <input key={i} className="campo mb-2" value={o} onChange={(e) => setObs(obs.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`Observação ${i + 1}`} />)}
          </section>
          <section className="cartao p-4 self-start">
            <h2 className="font-semibold mb-3">Resumo</h2>
            <div className="flex justify-between py-1.5"><span>Vendas</span><span className="tabular-nums">{moeda(tot.vendasT, true)}</span></div>
            <div className="flex justify-between py-1.5"><span>Comissão</span><span className="tabular-nums">{moeda(tot.com, true)}</span></div>
            <div className="flex justify-between py-1.5"><span>Débitos / créditos</span><span className={`tabular-nums ${tot.dc < 0 ? 'text-alerta' : ''}`}>{moeda(tot.dc, true)}</span></div>
            <div className="flex justify-between py-2 mt-1 border-t border-papel-linha text-lg"><strong>A receber</strong><strong className="tabular-nums text-marca">{moeda(tot.receber, true)}</strong></div>
          </section>
        </div>
      </>)}

      {rep && (
        <div className="fixed bottom-0 inset-x-0 lg:left-64 z-20 bg-white/95 border-t border-papel-linha px-4 py-3 flex justify-end gap-2">
          <span className="mr-auto self-center text-sm text-tinta-suave hidden sm:block">A receber {moeda(tot.receber, true)}</span>
          <button className="botao-primario" disabled={salvando} onClick={fazer}>{salvando ? 'Registrando...' : 'Fazer acerto e imprimir'}</button>
        </div>
      )}
    </div>
  );
}
