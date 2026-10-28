'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { buscarTodos } from '@/lib/supabase/todos';
import Busca from '@/components/Busca';
import Selecao from '@/components/Selecao';
import { Cabecalho, useConfirmar, useToast } from '@/components/ui';
import { useCompartilhar } from '@/components/Compartilhar';
import { B_VEND } from '@/lib/entidades';
import { arred, hojeISO, moeda, numero } from '@/lib/formato';
import { imprimirAcertoPreposto } from '@/lib/acoes';
import type { Linha } from '@/lib/tipos';

export default function AcertoPreposto() {
  const router = useRouter();
  const avisar = useToast();
  const confirmar = useConfirmar();
  const compartilhar = useCompartilhar();
  const [vend, setVend] = useState<Linha | null>(null);
  const [com, setCom] = useState<Linha[]>([]);
  const [vales, setVales] = useState<Linha[]>([]);
  const [selC, setSelC] = useState<Set<any>>(new Set());
  const [selV, setSelV] = useState<Set<any>>(new Set());
  const [dados, setDados] = useState<Linha>({ data: hojeISO(), nome: '', banco: '', agencia: '', conta: '', obs: '' });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!vend) { setCom([]); setVales([]); return; }
    setDados((d) => ({ ...d, nome: vend.nome || '', banco: vend.banco || '', agencia: vend.agencia || '', conta: vend.conta || '' }));
    const sb = supabase();
    buscarTodos(() => sb.from('preposto').select('*').eq('codven', vend.codigo).is('acerto', null).order('data').order('id')).then((data) => { setCom(data); setSelC(new Set()); });
    sb.from('vales').select('*').eq('codven', vend.codigo).is('acerto', null).order('data').then(({ data }) => { setVales(data || []); setSelV(new Set()); });
  }, [vend]);

  const tot = useMemo(() => {
    const c = com.filter((l) => selC.has(l.id)).reduce((a, l) => a + numero(l.comissaoentrega ?? l.vrcomissao), 0);
    const v = vales.filter((l) => selV.has(l.id)).reduce((a, l) => a + numero(l.valor), 0);
    return { c, v, pagar: arred(c + v, 2) };
  }, [com, vales, selC, selV]);

  const fazer = async () => {
    if (!vend) return;
    if (selC.size === 0 && selV.size === 0) { avisar('Marque pelo menos um lançamento', 'erro'); return; }
    if (!(await confirmar(`Fazer o acerto com ${vend.nome}?`, { detalhe: `Valor a pagar: ${moeda(tot.pagar, true)}`, ok: 'Fazer acerto' }))) return;
    setSalvando(true);
    const { data, error } = await supabase().rpc('fazer_acerto_preposto', { cod: vend.codigo, com_ids: Array.from(selC), vale_ids: Array.from(selV), p: dados });
    setSalvando(false);
    if (error) { avisar('Erro: ' + error.message, 'erro'); return; }
    avisar(`Acerto ${data} registrado`);
    await imprimirAcertoPreposto(data as number, { compartilhar, avisar });
    router.push('/c/acertos-prepostos');
  };

  return (
    <div className="pb-24">
      <Cabecalho titulo="Acertar preposto" descricao="Pague as comissões dos vendedores, descontando os vales." />
      <section className="cartao p-4 mb-4 grid sm:grid-cols-4 gap-3">
        <div className="sm:col-span-3"><label className="rotulo">Vendedor / preposto</label><Busca config={B_VEND} valor={vend?.codigo} texto={vend?.nome} onEscolher={setVend} autoFocus /></div>
        <div><label className="rotulo">Data</label><input type="date" className="campo" value={dados.data} onChange={(e) => setDados({ ...dados, data: e.target.value })} /></div>
      </section>
      {vend && (<>
        <Selecao titulo="Comissões em aberto" linhas={com} marcados={selC} onMudar={setSelC} vazio="Nenhuma comissão em aberto"
          colunas={[{ nome: 'data', rotulo: 'Data', tipo: 'data' }, { nome: 'ref', rotulo: 'Pedido' }, { nome: 'cliente', rotulo: 'Cliente' }, { nome: 'fornecedor', rotulo: 'Representada' },
            { nome: 'total', rotulo: 'Valor', tipo: 'moeda' }, { nome: 'comissao', rotulo: '%', tipo: 'percentual' }, { nome: 'comissaoentrega', rotulo: 'Comissão', tipo: 'moeda', render: (l) => moeda(l.comissaoentrega ?? l.vrcomissao) }]} />
        <Selecao titulo="Vales em aberto" linhas={vales} marcados={selV} onMudar={setSelV} vazio="Nenhum vale em aberto"
          colunas={[{ nome: 'data', rotulo: 'Data', tipo: 'data' }, { nome: 'historico', rotulo: 'Histórico' }, { nome: 'valor', rotulo: 'Valor', tipo: 'moeda' }]} />
        <div className="grid md:grid-cols-2 gap-4">
          <section className="cartao p-4 grid grid-cols-2 gap-2">
            <h2 className="font-semibold col-span-2">Dados para pagamento</h2>
            {[['nome', 'Favorecido'], ['banco', 'Banco'], ['agencia', 'Agência'], ['conta', 'Conta / PIX']].map(([k, r]) => (
              <div key={k}><label className="rotulo">{r}</label><input className="campo" value={dados[k] || ''} onChange={(e) => setDados({ ...dados, [k]: e.target.value })} /></div>
            ))}
            <div className="col-span-2"><label className="rotulo">Observação</label><input className="campo" value={dados.obs} onChange={(e) => setDados({ ...dados, obs: e.target.value })} /></div>
          </section>
          <section className="cartao p-4 self-start">
            <div className="flex justify-between py-1.5"><span>Comissões</span><span className="tabular-nums">{moeda(tot.c, true)}</span></div>
            <div className="flex justify-between py-1.5"><span>Vales</span><span className="tabular-nums">{moeda(tot.v, true)}</span></div>
            <div className="flex justify-between py-2 border-t border-papel-linha text-lg"><strong>A pagar</strong><strong className="tabular-nums text-marca">{moeda(tot.pagar, true)}</strong></div>
          </section>
        </div>
        <div className="fixed bottom-0 inset-x-0 lg:left-64 z-20 bg-white/95 border-t border-papel-linha px-4 py-3 flex justify-end">
          <button className="botao-primario" disabled={salvando} onClick={fazer}>{salvando ? 'Registrando...' : 'Fazer acerto e imprimir'}</button>
        </div>
      </>)}
    </div>
  );
}
