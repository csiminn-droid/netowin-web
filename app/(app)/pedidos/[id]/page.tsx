'use client';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Busca from '@/components/Busca';
import { Cabecalho, Carregando, useConfirmar, useToast } from '@/components/ui';
import { useCompartilhar } from '@/components/Compartilhar';
import { B_CLIENTE, B_REP, B_TRANSP } from '@/lib/entidades';
import { arred, decimal, hojeISO, linkWhatsApp, moeda, numero, somarDias } from '@/lib/formato';
import { imprimirPedido } from '@/lib/acoes';
import { carregarSistema } from '@/lib/pdf';
import type { Linha } from '@/lib/tipos';

type Item = { chave: string; produto: number | null; nomeproduto: string; unid: string; forn: string; quant: string; valor: string; caixa: string; ipi: string; naoenviado: string | null; quantenviado: string | null };

const novoItemChave = () => Math.random().toString(36).slice(2);
const txt = (v: any, casas = 4) => (v == null ? '' : decimal(v, casas).replace(/\./g, ''));

const CAB_VAZIO: Linha = {
  pedido: null, data: hojeISO(), pedidocliente: '', datapedidocliente: '', comissao: '', codcli: null, cliente: '', codfor: null, fornecedor: '',
  desc1: '', desc2: '', desc3: '', desc4: '', desc5: '', prazo: '', codtransp: null, transportadora: '', vendedor: null,
  obs1: '', obs2: '', obs3: '', entrega: 'IMEDIATO', tipocobr: '', tipovenda: '', s: 'A',
};

export default function PedidoPagina() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const avisar = useToast();
  const confirmar = useConfirmar();
  const compartilhar = useCompartilhar();
  const novo = id === 'novo';

  const [cab, setCab] = useState<Linha>(CAB_VAZIO);
  const [itens, setItens] = useState<Item[]>([]);
  const [cliente, setCliente] = useState<Linha | null>(null);
  const [vendedores, setVendedores] = useState<Linha[]>([]);
  const [preco, setPreco] = useState(1);
  const [lancarPreposto, setLancarPreposto] = useState(false);
  const [comPreposto, setComPreposto] = useState('');
  const [carregado, setCarregado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [alterado, setAlterado] = useState(false);
  const [acertado, setAcertado] = useState(false);
  const quantRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [focar, setFocar] = useState<string | null>(null);

  const mudarCab = (k: string, v: any, extra?: Linha) => { setCab((c) => ({ ...c, [k]: v, ...(extra || {}) })); setAlterado(true); };

  const carregarCliente = useCallback(async (cod: number | null) => {
    if (!cod) { setCliente(null); return; }
    const { data } = await supabase().from('clientes').select('*').eq('codigo', cod).maybeSingle();
    setCliente(data);
  }, []);

  // Carregar pedido existente / cópia
  useEffect(() => {
    (async () => {
      const sb = supabase();
      const { data: vs } = await sb.from('vendedor').select('*').order('nome');
      setVendedores(vs || []);
      const copiar = sp.get('copiar');
      const num = novo ? (copiar ? Number(copiar) : null) : Number(id);
      if (num) {
        const { data: p } = await sb.from('pedidos').select('*').eq('pedido', num).maybeSingle();
        if (!p) { avisar('Pedido não encontrado', 'erro'); router.replace('/c/pedidos'); return; }
        const { data: its } = await sb.from('produtospedido').select('*').eq('pedido', num).order('ordem', { nullsFirst: false }).order('id');
        const c: Linha = { ...CAB_VAZIO };
        for (const k of Object.keys(CAB_VAZIO)) c[k] = p[k] ?? CAB_VAZIO[k];
        for (const k of ['comissao', 'desc1', 'desc2', 'desc3', 'desc4', 'desc5']) c[k] = txt(p[k]);
        if (copiar) { c.pedido = null; c.data = hojeISO(); c.pedidocliente = ''; c.datapedidocliente = ''; c.s = 'A'; }
        setCab(c);
        setItens((its || []).map((i: Linha) => ({ chave: novoItemChave(), produto: i.produto, nomeproduto: i.nomeproduto || '', unid: i.unid || '', forn: i.forn || '',
          quant: txt(i.quant, 3), valor: txt(i.valor), caixa: txt(i.caixa, 2), ipi: txt(i.ipi, 2), naoenviado: copiar ? null : i.naoenviado, quantenviado: copiar ? null : (i.quantenviado == null ? null : txt(i.quantenviado, 3)) })));
        carregarCliente(p.codcli);
        if (!copiar) {
          const { data: pr } = await sb.from('preposto').select('*').eq('pedido', num).limit(1);
          if (pr && pr[0]) { setLancarPreposto(true); setComPreposto(txt(pr[0].comissao)); }
          const { count } = await sb.from('controlevendas').select('id', { count: 'exact', head: true }).eq('pedido', num).not('codacerto', 'is', null);
          setAcertado((count || 0) > 0);
        }
        if (copiar) setAlterado(true);
      } else {
        const cli = sp.get('cliente');
        const c = { ...CAB_VAZIO };
        const { data: ult } = await sb.from('pedidos').select('vendedor').not('vendedor', 'is', null).order('pedido', { ascending: false }).limit(1);
        const padrao = (vs || []).find((v: Linha) => v.codigo === ult?.[0]?.vendedor) || (vs || [])[0];
        if (padrao) c.vendedor = padrao.codigo;
        if (cli) {
          const { data: cl } = await sb.from('clientes').select('*').eq('codigo', Number(cli)).maybeSingle();
          if (cl) { c.codcli = cl.codigo; c.cliente = cl.nome; setCliente(cl); }
        }
        setCab(c);
        if (padrao?.comissao) { setLancarPreposto(true); setComPreposto(txt(padrao.comissao)); }
      }
      setCarregado(true);
    })();
  }, [id, novo, sp, router, avisar, carregarCliente]);

  useEffect(() => {
    if (focar && quantRefs.current[focar]) { quantRefs.current[focar]!.focus(); quantRefs.current[focar]!.select(); setFocar(null); }
  }, [focar, itens]);

  // Avisar antes de sair com alterações
  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => { if (alterado) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', f);
    return () => window.removeEventListener('beforeunload', f);
  }, [alterado]);

  const escolherRepresentada = async (l: Linha | null) => {
    if (!l) { mudarCab('codfor', null, { fornecedor: '' }); return; }
    let com = l.comissao;
    if (com == null) {
      const { data } = await supabase().from('pedidos').select('comissao').eq('codfor', l.codigo).not('comissao', 'is', null).order('pedido', { ascending: false }).limit(1);
      com = data?.[0]?.comissao;
    }
    mudarCab('codfor', l.codigo, { fornecedor: l.nome, ...(com != null && !cab.comissao ? { comissao: txt(com) } : {}) });
  };

  const escolherCliente = async (l: Linha | null) => {
    mudarCab('codcli', l?.codigo ?? null, { cliente: l?.nome ?? '' });
    setCliente(l);
    if (l && !cab.prazo) {
      const { data } = await supabase().from('pedidos').select('prazo,tipocobr,codtransp,transportadora').eq('codcli', l.codigo).order('pedido', { ascending: false }).limit(1);
      const u = data?.[0];
      if (u) setCab((c) => ({ ...c, prazo: c.prazo || u.prazo || '', tipocobr: c.tipocobr || u.tipocobr || '', codtransp: c.codtransp ?? u.codtransp, transportadora: c.transportadora || u.transportadora || '' }));
    }
  };

  const adicionarProduto = (p: Linha | null) => {
    if (!p) return;
    const ch = novoItemChave();
    const valor = p['valor' + preco] ?? p.valor1;
    setItens((its) => [...its, { chave: ch, produto: p.codigo, nomeproduto: p.produto || '', unid: p.unid || '', forn: p.codfor || '', quant: '', valor: txt(valor), caixa: '', ipi: txt(p.ipi, 2), naoenviado: null, quantenviado: null }]);
    setAlterado(true); setFocar(ch);
  };

  const mudarItem = (ch: string, k: keyof Item, v: any) => { setItens((its) => its.map((i) => (i.chave === ch ? { ...i, [k]: v } : i))); setAlterado(true); };
  const removerItem = (ch: string) => { setItens((its) => its.filter((i) => i.chave !== ch)); setAlterado(true); };
  const moverItem = (ch: string, d: -1 | 1) => setItens((its) => { const i = its.findIndex((x) => x.chave === ch); const j = i + d; if (j < 0 || j >= its.length) return its; const n = [...its]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const alternarNaoEnviado = (it: Item) => {
    if (it.naoenviado) { setItens((its) => its.map((i) => (i.chave === it.chave ? { ...i, naoenviado: null, quant: i.quantenviado ?? i.quant, quantenviado: null } : i))); }
    else setItens((its) => its.map((i) => (i.chave === it.chave ? { ...i, naoenviado: 'X', quantenviado: i.quant, quant: '0' } : i)));
    setAlterado(true);
  };

  const totais = useMemo(() => {
    const sub = itens.reduce((a, i) => a + arred(numero(i.quant) * numero(i.valor), 2), 0);
    let t = sub; const descs: number[] = [];
    for (let k = 1; k <= 5; k++) { const d = arred(t * numero(cab['desc' + k]) / 100, 4); descs.push(d); t -= d; }
    const com = arred(t * numero(cab.comissao) / 100, 4);
    const cx = itens.reduce((a, i) => a + numero(i.caixa), 0);
    return { sub, descs, total: t, com, cx, prep: arred(t * numero(comPreposto) / 100, 2) };
  }, [itens, cab, comPreposto]);

  const salvar = async (depois?: (n: number) => void) => {
    if (!cab.codcli) { avisar('Escolha o cliente', 'erro'); return; }
    if (!cab.codfor) { avisar('Escolha a representada', 'erro'); return; }
    if (itens.length === 0 && !(await confirmar('O pedido está sem produtos. Salvar mesmo assim?'))) return;
    setSalvando(true);
    const p: Linha = { ...cab, lancar_preposto: lancarPreposto, comissao_preposto: comPreposto ? numero(comPreposto) : 0 };
    for (const k of ['comissao', 'desc1', 'desc2', 'desc3', 'desc4', 'desc5']) p[k] = cab[k] === '' || cab[k] == null ? null : numero(cab[k]);
    const its = itens.map((i) => ({ produto: i.produto, nomeproduto: i.nomeproduto, unid: i.unid, forn: i.forn, quant: numero(i.quant), valor: numero(i.valor),
      caixa: i.caixa === '' ? null : numero(i.caixa), ipi: i.ipi === '' ? null : numero(i.ipi), naoenviado: i.naoenviado, quantenviado: i.quantenviado == null || i.quantenviado === '' ? null : numero(i.quantenviado) }));
    const { data, error } = await supabase().rpc('salvar_pedido', { p, itens: its });
    setSalvando(false);
    if (error) { avisar('Não foi possível salvar: ' + error.message, 'erro'); return; }
    const n = data as number;
    setAlterado(false);
    avisar(`Pedido ${n} salvo`);
    if (depois) depois(n);
    if (novo) router.replace(`/pedidos/${n}`);
    else setCab((c) => ({ ...c, pedido: n }));
  };

  const imprimir = async () => {
    if (alterado || novo) { await salvar((n) => imprimirPedido(n, { compartilhar, avisar })); return; }
    imprimirPedido(Number(id), { compartilhar, avisar });
  };

  const cancelarOuReativar = async () => {
    const cancelar = cab.s !== 'C';
    if (!(await confirmar(cancelar ? 'Cancelar este pedido?' : 'Reativar este pedido?', { detalhe: cancelar ? 'A comissão em aberto deste pedido sai do controle de vendas.' : 'A comissão volta para o controle de vendas.', perigo: cancelar }))) return;
    setCab((c) => ({ ...c, s: cancelar ? 'C' : 'A' }));
    const p: Linha = { ...cab, s: cancelar ? 'C' : 'A', lancar_preposto: lancarPreposto, comissao_preposto: numero(comPreposto) };
    for (const k of ['comissao', 'desc1', 'desc2', 'desc3', 'desc4', 'desc5']) p[k] = cab[k] === '' ? null : numero(cab[k]);
    const its = itens.map((i) => ({ ...i, quant: numero(i.quant), valor: numero(i.valor), caixa: i.caixa === '' ? null : numero(i.caixa), ipi: i.ipi === '' ? null : numero(i.ipi), quantenviado: i.quantenviado ? numero(i.quantenviado) : null }));
    const { error } = await supabase().rpc('salvar_pedido', { p, itens: its });
    if (error) avisar(error.message, 'erro'); else { avisar(cancelar ? 'Pedido cancelado' : 'Pedido reativado'); setAlterado(false); }
  };

  const excluir = async () => {
    if (!(await confirmar(`Excluir o pedido ${id}?`, { detalhe: 'O pedido, os produtos e a comissão em aberto serão apagados.', perigo: true, ok: 'Excluir' }))) return;
    const { error } = await supabase().rpc('excluir_pedido', { num: Number(id) });
    if (error) { avisar(error.message, 'erro'); return; }
    setAlterado(false); avisar('Pedido excluído'); router.replace('/c/pedidos');
  };

  const criarCarta = async () => {
    if (alterado || novo) { avisar('Salve o pedido antes de criar a carta', 'erro'); return; }
    const sb = supabase();
    const { data: existente } = await sb.from('cartacobranca').select('id').eq('pedido', Number(id)).limit(1);
    if (existente?.[0]) { router.push(`/c/cartas?abrir=${existente[0].id}`); return; }
    const s = await carregarSistema();
    const { data: contas } = await sb.from('fornecedorescontas').select('*').eq('representada', cab.codfor).limit(1);
    const ct = contas?.[0];
    const dias = (String(cab.prazo || '').match(/\d+/g) || []).map(Number).filter((d) => d > 0 && d < 400).slice(0, 5);
    const n = dias.length || 1;
    const parcela = arred(totais.total / n, 2);
    const carta: Linha = { cliente: cab.codcli, fornecedor: cab.codfor, pedido: Number(id), criado_em: hojeISO(), titulodespesa: 'Desp./IPI', despesa: '0',
      email: cliente?.emailfinan || cliente?.email || null,
      obs1: ct?.nome || cab.fornecedor, obs2: ct?.agencia ? 'AG: ' + ct.agencia : null, obs3: ct?.conta ? `CC: ${ct.conta}${ct.banco ? ' - ' + ct.banco : ''}` : null,
      obs4: 'Nota Fiscal:', obs5: s.email ? 'Favor enviar comprovante para o Email: ' + s.email : null, obs6: s.whatsapp ? 'ou Whatsapp: ' + s.whatsapp : null };
    for (let i = 0; i < n; i++) {
      carta['vencimentodata' + (i + 1)] = somarDias(hojeISO(), dias[i] || 30);
      carta['vencimentovalor' + (i + 1)] = i === n - 1 ? arred(totais.total - parcela * (n - 1), 2) : parcela;
      carta['vencimentoboletocarteira' + (i + 1)] = 1;
    }
    const { data, error } = await sb.from('cartacobranca').insert(carta).select('id').single();
    if (error) { avisar(error.message, 'erro'); return; }
    router.push(`/c/cartas?abrir=${data.id}`);
  };

  const buscaProduto = useMemo(() => ({ tabela: 'produtos', chave: 'codigo', exibir: 'produto', detalhe: 'codfor', filtro: { fornecedor: cab.codfor, ativo: true } }), [cab.codfor]);

  if (!carregado) return <Carregando />;
  const cancelado = cab.s === 'C';

  return (
    <div className="pb-24">
      <Cabecalho titulo={novo ? 'Novo pedido' : `Pedido ${id}`} descricao={cancelado ? 'Pedido cancelado' : acertado ? 'A comissão deste pedido já entrou num acerto' : undefined}>
        {!novo && <Link href={`/pedidos/novo?copiar=${id}`} className="botao-secundario">Duplicar</Link>}
        {!novo && <button className="botao-secundario" onClick={criarCarta}>Carta de cobrança</button>}
        {!novo && itens.some((i) => i.naoenviado) && <button className="botao-secundario" onClick={() => imprimirPedido(Number(id), { compartilhar, avisar }, true)}>Não enviados (PDF)</button>}
        {!novo && <button className="botao-secundario" onClick={cancelarOuReativar}>{cancelado ? 'Reativar' : 'Cancelar pedido'}</button>}
        {!novo && !acertado && <button className="botao-perigo" onClick={excluir}>Excluir</button>}
      </Cabecalho>

      {cancelado && <div className="cartao bg-alerta-clara border-alerta/30 p-3 mb-4 text-alerta">Este pedido está cancelado e não entra nos relatórios nem nas comissões.</div>}

      <section className="cartao p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-x-4 gap-y-3">
          <div className="sm:col-span-2">
            <label className="rotulo">Cliente <span className="text-alerta">*</span></label>
            <Busca config={B_CLIENTE} valor={cab.codcli} texto={cab.cliente} onEscolher={escolherCliente} autoFocus={novo && !cab.codcli} />
            {cliente && (
              <div className="mt-1.5 text-sm text-tinta-suave flex flex-wrap gap-x-3">
                <span>{[cliente.cidade, cliente.uf].filter(Boolean).join('/')}</span>
                {cliente.telefone && <span>Tel. {cliente.telefone}</span>}
                {(cliente.whatsapp || cliente.celular) && <a className="text-marca underline" target="_blank" href={linkWhatsApp(cliente.whatsapp || cliente.celular)}>WhatsApp {cliente.whatsapp || cliente.celular}</a>}
                {cliente.contato && <span>Contato: {cliente.contato}</span>}
              </div>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="rotulo">Representada <span className="text-alerta">*</span></label>
            <Busca config={B_REP} valor={cab.codfor} texto={cab.fornecedor} onEscolher={escolherRepresentada} />
          </div>
          <div><label className="rotulo">Data</label><input type="date" className="campo" value={cab.data || ''} onChange={(e) => mudarCab('data', e.target.value)} /></div>
          <div><label className="rotulo">Pedido do cliente</label><input className="campo" value={cab.pedidocliente || ''} onChange={(e) => mudarCab('pedidocliente', e.target.value)} placeholder="Nº ou Whatsapp" /></div>
          <div><label className="rotulo">Data do pedido do cliente</label><input className="campo" value={cab.datapedidocliente || ''} onChange={(e) => mudarCab('datapedidocliente', e.target.value)} placeholder="dd/mm/aaaa" /></div>
          <div>
            <label className="rotulo">Vendedor</label>
            <select className="campo" value={cab.vendedor ?? ''} onChange={(e) => {
              const v = vendedores.find((x) => String(x.codigo) === e.target.value);
              mudarCab('vendedor', v ? v.codigo : null);
              if (v?.comissao) { setLancarPreposto(true); setComPreposto(txt(v.comissao)); }
            }}>
              <option value="">-</option>
              {vendedores.map((v) => <option key={v.codigo} value={v.codigo}>{v.codigo} - {v.nome}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2"><label className="rotulo">Transportadora</label><Busca config={B_TRANSP} valor={cab.codtransp} texto={cab.transportadora} onEscolher={(l) => mudarCab('codtransp', l?.codigo ?? null, { transportadora: l?.nome ?? '' })} /></div>
          <div><label className="rotulo">Prazo</label><input className="campo" value={cab.prazo || ''} onChange={(e) => mudarCab('prazo', e.target.value)} placeholder="30/45/60 DIAS" /></div>
          <div><label className="rotulo">Faturar</label><input className="campo" value={cab.entrega || ''} onChange={(e) => mudarCab('entrega', e.target.value)} placeholder="IMEDIATO" /></div>
          <div className="sm:col-span-2"><label className="rotulo">Tipo de cobrança</label><input className="campo" value={cab.tipocobr || ''} onChange={(e) => mudarCab('tipocobr', e.target.value)} placeholder="Boleto integral" /></div>
          <div className="sm:col-span-2"><label className="rotulo">Tipo de venda</label><input className="campo" value={cab.tipovenda || ''} onChange={(e) => mudarCab('tipovenda', e.target.value)} /></div>
        </div>
      </section>

      <section className="cartao p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3 mb-3">
          <h2 className="font-semibold text-lg mr-auto">Produtos</h2>
          <div>
            <label className="rotulo" htmlFor="tabela-preco">Usar preço</label>
            <select id="tabela-preco" className="campo w-28" value={preco} onChange={(e) => setPreco(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((k) => <option key={k} value={k}>Preço {k}</option>)}
            </select>
          </div>
        </div>
        <div className="mb-4">
          <label className="rotulo">Adicionar produto {cab.codfor ? `de ${cab.fornecedor}` : ''}</label>
          {cab.codfor
            ? <Busca key={cab.codfor + '-' + itens.length} config={buscaProduto} valor={null} onEscolher={adicionarProduto} placeholder="Digite o código ou parte da descrição e tecle Enter" />
            : <div className="text-sm text-tinta-suave py-2">Escolha a representada primeiro.</div>}
        </div>

        {itens.length > 0 && (
          <div className="hidden md:grid grid-cols-[2rem_1fr_6rem_6.5rem_4.5rem_4.5rem_7rem_5.5rem] gap-2 px-1 pb-1 text-xs font-medium text-tinta-suave">
            <span>#</span><span>Produto</span><span className="text-right">Quant.</span><span className="text-right">Preço</span><span className="text-right">Cx.</span><span className="text-right">IPI %</span><span className="text-right">Subtotal</span><span></span>
          </div>
        )}
        <div className="divide-y divide-papel-linha border-y border-papel-linha">
          {itens.map((i, n) => (
            <div key={i.chave} className={`grid grid-cols-6 md:grid-cols-[2rem_1fr_6rem_6.5rem_4.5rem_4.5rem_7rem_7.5rem] gap-2 py-2 items-center ${i.naoenviado ? 'bg-aviso-clara/60' : ''}`}>
              <span className="hidden md:block text-sm text-tinta-fraca pl-1">{n + 1}</span>
              <div className="col-span-6 md:col-span-1 min-w-0">
                <input className="campo py-1.5" value={i.nomeproduto} onChange={(e) => mudarItem(i.chave, 'nomeproduto', e.target.value)} aria-label="Descrição do produto" />
                <div className="text-xs text-tinta-fraca mt-0.5">Cód. {i.produto ?? '-'} · Fáb. {i.forn || '-'} · {i.unid || '-'}
                  {i.naoenviado && <span className="text-aviso font-medium"> · NÃO ENVIADO ({i.quantenviado})</span>}</div>
              </div>
              <label className="col-span-2 md:col-span-1"><span className="md:hidden text-xs text-tinta-suave">Quant.</span>
                <input ref={(el) => { quantRefs.current[i.chave] = el; }} className="campo py-1.5 text-right tabular-nums" inputMode="decimal" value={i.quant} onChange={(e) => mudarItem(i.chave, 'quant', e.target.value)} disabled={!!i.naoenviado} /></label>
              <label className="col-span-2 md:col-span-1"><span className="md:hidden text-xs text-tinta-suave">Preço</span>
                <input className="campo py-1.5 text-right tabular-nums" inputMode="decimal" value={i.valor} onChange={(e) => mudarItem(i.chave, 'valor', e.target.value)} /></label>
              <label className="col-span-1"><span className="md:hidden text-xs text-tinta-suave">Cx.</span>
                <input className="campo py-1.5 text-right tabular-nums" inputMode="decimal" value={i.caixa} onChange={(e) => mudarItem(i.chave, 'caixa', e.target.value)} /></label>
              <label className="col-span-1"><span className="md:hidden text-xs text-tinta-suave">IPI %</span>
                <input className="campo py-1.5 text-right tabular-nums" inputMode="decimal" value={i.ipi} onChange={(e) => mudarItem(i.chave, 'ipi', e.target.value)} /></label>
              <div className="col-span-3 md:col-span-1 text-right tabular-nums font-medium">{moeda(arred(numero(i.quant) * numero(i.valor), 2))}</div>
              <div className="col-span-3 md:col-span-1 flex justify-end gap-1">
                <button type="button" title="Subir" className="botao-secundario botao-pequeno px-2" onClick={() => moverItem(i.chave, -1)}>↑</button>
                <button type="button" title={i.naoenviado ? 'Marcar como enviado' : 'Marcar como não enviado'} className={`botao-secundario botao-pequeno px-2 ${i.naoenviado ? 'text-aviso' : ''}`} onClick={() => alternarNaoEnviado(i)}>NE</button>
                <button type="button" title="Remover" className="botao-perigo botao-pequeno px-2" onClick={() => removerItem(i.chave)}>✕</button>
              </div>
            </div>
          ))}
        </div>
        {itens.length === 0 && <p className="text-tinta-suave text-sm py-3">Nenhum produto no pedido.</p>}
        <p className="text-xs text-tinta-fraca mt-2">NE = produto não enviado pela fábrica: a quantidade sai do total e fica registrada para o relatório de não enviados.</p>
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="cartao p-4">
          <h2 className="font-semibold mb-3">Observações</h2>
          {[1, 2, 3].map((k) => <input key={k} className="campo mb-2" value={cab['obs' + k] || ''} onChange={(e) => mudarCab('obs' + k, e.target.value)} aria-label={`Observação ${k}`} />)}
          <div className="mt-3 pt-3 border-t border-papel-linha">
            <label className="flex items-center gap-2 text-[15px]">
              <input type="checkbox" className="h-5 w-5 accent-marca" checked={lancarPreposto} onChange={(e) => { setLancarPreposto(e.target.checked); setAlterado(true); }} />
              Lançar comissão do preposto (vendedor)
            </label>
            {lancarPreposto && (
              <div className="flex items-center gap-2 mt-2">
                <input className="campo w-28 text-right" inputMode="decimal" value={comPreposto} onChange={(e) => { setComPreposto(e.target.value); setAlterado(true); }} aria-label="Comissão do preposto" />
                <span>%  =  {moeda(totais.prep, true)}</span>
              </div>
            )}
          </div>
        </section>
        <section className="cartao p-4">
          <h2 className="font-semibold mb-3">Totais</h2>
          <div className="flex justify-between py-1"><span>Itens: {itens.length}{totais.cx ? ` · Caixas: ${decimal(totais.cx, 2)}` : ''}</span><span>Subtotal <strong className="tabular-nums">{moeda(totais.sub)}</strong></span></div>
          {[1, 2, 3, 4, 5].map((k) => (k === 1 || numero(cab['desc' + (k - 1)]) > 0 || numero(cab['desc' + k]) > 0) && (
            <div key={k} className="flex items-center justify-between gap-2 py-1">
              <label className="flex items-center gap-2"><span className="w-24">Desconto {k}</span>
                <input className="campo w-24 py-1.5 text-right" inputMode="decimal" value={cab['desc' + k] || ''} onChange={(e) => mudarCab('desc' + k, e.target.value)} aria-label={`Desconto ${k} (%)`} /> %</label>
              <span className="tabular-nums text-tinta-suave">- {moeda(totais.descs[k - 1])}</span>
            </div>
          ))}
          <div className="flex justify-between items-center py-2 mt-1 border-t border-papel-linha text-lg"><span className="font-semibold">Total</span><strong className="tabular-nums">{moeda(totais.total, true)}</strong></div>
          <div className="flex items-center justify-between gap-2 py-1">
            <label className="flex items-center gap-2"><span className="w-24">Comissão</span>
              <input className="campo w-24 py-1.5 text-right" inputMode="decimal" value={cab.comissao || ''} onChange={(e) => mudarCab('comissao', e.target.value)} aria-label="Comissão (%)" /> %</label>
            <strong className="tabular-nums text-marca">{moeda(totais.com, true)}</strong>
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 inset-x-0 lg:left-64 z-20 bg-white/95 backdrop-blur border-t border-papel-linha px-4 py-3 flex items-center justify-end gap-2">
        <span className="mr-auto text-sm text-tinta-suave hidden sm:block">{alterado ? 'Alterações não salvas' : 'Tudo salvo'} · Total {moeda(totais.total, true)}</span>
        <button className="botao-secundario" onClick={imprimir} disabled={salvando}>Imprimir / enviar</button>
        <button className="botao-primario" onClick={() => salvar()} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar pedido'}</button>
      </div>
    </div>
  );
}
