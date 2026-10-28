'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Busca from '@/components/Busca';
import Selecao from '@/components/Selecao';
import { Cabecalho, useConfirmar, useToast } from '@/components/ui';
import { useCompartilhar } from '@/components/Compartilhar';
import { B_REP } from '@/lib/entidades';
import { hojeISO, moeda, numero } from '@/lib/formato';
import { imprimirRemessa } from '@/lib/acoes';
import type { Linha } from '@/lib/tipos';

type Doc = { banco: string; numero: string; datavenc: string; valor: string; obs: string };
const docVazio = (): Doc => ({ banco: '', numero: 'deposito', datavenc: hojeISO(), valor: '', obs: '' });

export default function Remessa() {
  const router = useRouter();
  const avisar = useToast();
  const confirmar = useConfirmar();
  const compartilhar = useCompartilhar();
  const [rep, setRep] = useState<Linha | null>(null);
  const [titulos, setTitulos] = useState<Linha[]>([]);
  const [sel, setSel] = useState<Set<any>>(new Set());
  const [contas, setContas] = useState<Linha[]>([]);
  const [dep, setDep] = useState<Linha>({ depnome: '', depbanco: '', depagencia: '', depconta: '', deptexto: 'DEPOSITO EM C/C' });
  const [docs, setDocs] = useState<Doc[]>([docVazio()]);
  const [dataR, setDataR] = useState(hojeISO());
  const [juros, setJuros] = useState('');
  const [obs, setObs] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!rep) { setTitulos([]); setContas([]); return; }
    const sb = supabase();
    sb.from('cobranca').select('*').eq('codfor', rep.codigo).is('cobranca', null).order('vencimento').then(({ data }) => { setTitulos(data || []); setSel(new Set()); });
    sb.from('fornecedorescontas').select('*').eq('representada', rep.codigo).then(({ data }) => {
      setContas(data || []);
      const c = data?.[0];
      if (c) setDep((d) => ({ ...d, depnome: c.nome || '', depbanco: c.banco || '', depagencia: c.agencia || '', depconta: c.conta || '' }));
    });
  }, [rep]);

  const soma = useMemo(() => titulos.filter((t) => sel.has(t.id)).reduce((a, t) => a + numero(t.valor), 0) + numero(juros), [titulos, sel, juros]);
  const somaDocs = docs.reduce((a, d) => a + numero(d.valor), 0);

  useEffect(() => {
    // Preenche o valor do primeiro documento com o total, enquanto houver só um
    setDocs((ds) => (ds.length === 1 ? [{ ...ds[0], valor: soma ? String(soma.toFixed(2)).replace('.', ',') : '' }] : ds));
  }, [soma]);

  const registrar = async () => {
    if (!rep || sel.size === 0) { avisar('Marque os títulos recebidos', 'erro'); return; }
    if (Math.abs(somaDocs - soma) > 0.009 && !(await confirmar('O total dos cheques/depósitos é diferente do total dos títulos. Registrar mesmo assim?', { detalhe: `Títulos: ${moeda(soma, true)} · Documentos: ${moeda(somaDocs, true)}` }))) return;
    setSalvando(true);
    const p = { ...dep, data: dataR, vjuros: numero(juros), obs1: obs };
    const d = docs.filter((x) => numero(x.valor) || x.numero).map((x) => ({ ...x, valor: numero(x.valor) }));
    const { data, error } = await supabase().rpc('registrar_remessa', { titulo_ids: Array.from(sel), p, docs: d });
    setSalvando(false);
    if (error) { avisar('Erro: ' + error.message, 'erro'); return; }
    avisar(`Remessa ${data} registrada`);
    await imprimirRemessa(data as number, { compartilhar, avisar });
    router.push('/c/remessas');
  };

  return (
    <div className="pb-24">
      <Cabecalho titulo="Registrar remessa de cobrança" descricao="Marque os títulos que o cliente pagou e informe os cheques ou depósitos que você está repassando à representada." />
      <section className="cartao p-4 mb-4 grid sm:grid-cols-4 gap-3">
        <div className="sm:col-span-3"><label className="rotulo">Representada</label><Busca config={B_REP} valor={rep?.codigo} texto={rep?.nome} onEscolher={setRep} autoFocus /></div>
        <div><label className="rotulo">Data</label><input type="date" className="campo" value={dataR} onChange={(e) => setDataR(e.target.value)} /></div>
      </section>
      {rep && (<>
        <Selecao titulo="Títulos em aberto" linhas={titulos} marcados={sel} onMudar={setSel} vazio="Nenhum título em aberto desta representada. Cadastre em Cobrança > Títulos a receber."
          colunas={[{ nome: 'vencimento', rotulo: 'Vencimento', tipo: 'data' }, { nome: 'cliente', rotulo: 'Cliente' }, { nome: 'ref', rotulo: 'Referência' }, { nome: 'boletocarteira', rotulo: 'Forma' }, { nome: 'valor', rotulo: 'Valor', tipo: 'moeda' }]} />

        <section className="cartao p-4 mb-4">
          <h2 className="font-semibold mb-3">Cheques e depósitos</h2>
          <div className="space-y-2">
            {docs.map((d, i) => (
              <div key={i} className="grid grid-cols-2 sm:grid-cols-[5rem_1fr_10rem_9rem_1fr_auto] gap-2 items-end">
                <div><label className="rotulo">Banco</label><input className="campo" value={d.banco} onChange={(e) => setDocs(docs.map((x, j) => (j === i ? { ...x, banco: e.target.value } : x)))} placeholder="341" /></div>
                <div><label className="rotulo">Nº do cheque / documento</label><input className="campo" value={d.numero} onChange={(e) => setDocs(docs.map((x, j) => (j === i ? { ...x, numero: e.target.value } : x)))} /></div>
                <div><label className="rotulo">Data</label><input type="date" className="campo" value={d.datavenc} onChange={(e) => setDocs(docs.map((x, j) => (j === i ? { ...x, datavenc: e.target.value } : x)))} /></div>
                <div><label className="rotulo">Valor</label><input className="campo text-right" inputMode="decimal" value={d.valor} onChange={(e) => setDocs(docs.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x)))} /></div>
                <div><label className="rotulo">Obs.</label><input className="campo" value={d.obs} onChange={(e) => setDocs(docs.map((x, j) => (j === i ? { ...x, obs: e.target.value } : x)))} /></div>
                <button className="botao-perigo px-3" onClick={() => setDocs(docs.filter((_, j) => j !== i))} disabled={docs.length === 1} aria-label="Remover">✕</button>
              </div>
            ))}
          </div>
          <button className="botao-secundario botao-pequeno mt-3" onClick={() => setDocs([...docs, { ...docVazio(), valor: '' }])}>+ Adicionar cheque/depósito</button>
        </section>

        <div className="grid md:grid-cols-2 gap-4">
          <section className="cartao p-4 grid grid-cols-2 gap-2">
            <h2 className="font-semibold col-span-2">Depositado na conta</h2>
            {contas.length > 1 && (
              <select className="campo col-span-2" onChange={(e) => { const c = contas[Number(e.target.value)]; if (c) setDep({ ...dep, depnome: c.nome || '', depbanco: c.banco || '', depagencia: c.agencia || '', depconta: c.conta || '' }); }} aria-label="Escolher conta da representada">
                {contas.map((c, i) => <option key={c.id} value={i}>{c.nome} - {c.banco} {c.conta}</option>)}
              </select>
            )}
            {[['depnome', 'Favorecido'], ['depbanco', 'Banco'], ['depagencia', 'Agência'], ['depconta', 'Conta'], ['deptexto', 'Tipo (ex.: depósito em C/C)']].map(([k, r]) => (
              <div key={k}><label className="rotulo">{r}</label><input className="campo" value={dep[k] || ''} onChange={(e) => setDep({ ...dep, [k]: e.target.value })} /></div>
            ))}
            <div className="col-span-2"><label className="rotulo">Observação</label><input className="campo" value={obs} onChange={(e) => setObs(e.target.value)} /></div>
          </section>
          <section className="cartao p-4 self-start">
            <div className="flex justify-between items-center py-1.5 gap-2"><span>Juros</span><input className="campo w-32 text-right" inputMode="decimal" value={juros} onChange={(e) => setJuros(e.target.value)} aria-label="Juros" /></div>
            <div className="flex justify-between py-1.5"><span>Total dos títulos</span><strong className="tabular-nums">{moeda(soma, true)}</strong></div>
            <div className="flex justify-between py-1.5"><span>Total dos documentos</span><strong className={`tabular-nums ${Math.abs(somaDocs - soma) > 0.009 ? 'text-alerta' : 'text-marca'}`}>{moeda(somaDocs, true)}</strong></div>
          </section>
        </div>
        <div className="fixed bottom-0 inset-x-0 lg:left-64 z-20 bg-white/95 border-t border-papel-linha px-4 py-3 flex justify-end">
          <button className="botao-primario" disabled={salvando || sel.size === 0} onClick={registrar}>{salvando ? 'Registrando...' : 'Registrar remessa e imprimir'}</button>
        </div>
      </>)}
    </div>
  );
}
