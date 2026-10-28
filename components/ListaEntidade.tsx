'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { buscarTodos } from '@/lib/supabase/todos';
import type { Entidade, Linha, Filtro } from '@/lib/tipos';
import { data as fData, moeda, decimal, numeroOuNulo, numero } from '@/lib/formato';
import { Cabecalho, Carregando, Modal, Vazio, useConfirmar, useToast } from './ui';
import Formulario from './Formulario';
import Busca from './Busca';
import { pdfTabela } from '@/lib/pdf';
import { useCompartilhar } from './Compartilhar';

const POR_PAGINA = 50;

export function aplicarFiltros(q: any, ent: Entidade, filtros: Record<string, any>, texto: string) {
  for (const f of ent.filtros || []) {
    const v = filtros[f.nome];
    if (f.tipo === 'situacao') {
      if (v === 'aberto') q = q.is(f.coluna, null);
      else if (v === 'fechado') q = q.not(f.coluna, 'is', null);
    } else if (f.tipo === 'busca') {
      if (v != null && v !== '') q = q.eq(f.coluna, v);
    } else if (f.tipo === 'opcoes') {
      if (v != null && v !== '') q = q.eq(f.coluna, v);
    } else if (f.tipo === 'periodo') {
      if (v?.ini) q = q.gte(f.coluna, v.ini);
      if (v?.fim) q = q.lte(f.coluna, v.fim);
    }
  }
  const t = texto.trim().replace(/[%,()]/g, ' ');
  if (t) {
    const partes = ent.buscaTexto.map((c) => `${c}.ilike.%${t}%`);
    if (/^\d+$/.test(t)) for (const c of ent.buscaNumero || []) partes.push(`${c}.eq.${t}`);
    q = q.or(partes.join(','));
  }
  return q;
}

export function formatarCelula(tipo: string | undefined, v: any, l?: Linha, col?: any) {
  if (tipo === 'situacao') return v == null ? <span className="etiqueta bg-aviso-clara text-aviso">{col?.situacao?.vazio || 'Em aberto'}</span> : <span className="etiqueta bg-marca-clara text-marca">{(col?.situacao?.preenchido || 'Nº') + ' ' + v}</span>;
  if (v == null || v === '') return '';
  switch (tipo) {
    case 'moeda': return moeda(v);
    case 'data': return fData(v);
    case 'numero': return decimal(v, 3);
    case 'percentual': return decimal(v, 4) + '%';
    case 'logico': return v ? 'Sim' : 'Não';
    default: return String(v);
  }
}

function prepararParaSalvar(ent: Entidade, l: Linha): Linha {
  const out: Linha = {};
  const nomes = new Set(ent.campos.map((c) => c.nome));
  for (const c of ent.campos) {
    let v = l[c.nome];
    if (c.tipo === 'moeda' || c.tipo === 'numero' || c.tipo === 'percentual') v = numeroOuNulo(v);
    else if (typeof v === 'string') { v = v.trim(); if (v === '') v = null; }
    if (c.tipo === 'busca' && c.busca) {
      if (c.busca.salvarTexto !== false) out[c.busca.textoCampo] = l[c.busca.textoCampo] ?? null;
      for (const d of Object.keys(c.busca.preencher || {})) if (!nomes.has(d)) out[d] = l[d] ?? null;
    }
    if (c.tipo === 'busca' && v != null && v !== '' && typeof v === 'string' && /^\d+$/.test(v)) v = Number(v);
    out[c.nome] = v === undefined ? null : v;
  }
  return out;
}

export default function ListaEntidade({ ent, filtrosIniciais, abrirChave }: { ent: Entidade; filtrosIniciais?: Record<string, any>; abrirChave?: string | null }) {
  const router = useRouter();
  const avisar = useToast();
  const confirmar = useConfirmar();
  const compartilhar = useCompartilhar();
  const [texto, setTexto] = useState('');
  const [textoAplicado, setTextoAplicado] = useState('');
  const [filtros, setFiltros] = useState<Record<string, any>>(() => {
    const f: Record<string, any> = {};
    for (const x of ent.filtros || []) if (x.tipo === 'situacao' || x.tipo === 'opcoes') f[x.nome] = x.padrao ?? '';
    return { ...f, ...(filtrosIniciais || {}) };
  });
  const [filtroTextos, setFiltroTextos] = useState<Record<string, string>>({});
  const [pagina, setPagina] = useState(0);
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [total, setTotal] = useState(0);
  const [somas, setSomas] = useState<Record<string, number>>({});
  const [editando, setEditando] = useState<Linha | null>(null);
  const [ehNovo, setEhNovo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [versao, setVersao] = useState(0);
  const [sujo, setSujo] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setTextoAplicado(texto); setPagina(0); }, 300); return () => clearTimeout(t); }, [texto]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  useEffect(() => {
    if (!abrirChave) return;
    supabase().from(ent.consulta || ent.tabela).select('*').eq(ent.chave, abrirChave).maybeSingle().then(({ data }) => { if (data) { setEditando({ ...data }); setEhNovo(false); } });
  }, [abrirChave, ent]);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLinhas(null);
      let q = supabase().from(ent.consulta || ent.tabela).select('*', { count: 'exact' });
      q = aplicarFiltros(q, ent, filtros, textoAplicado);
      for (const o of ent.ordem) q = q.order(o.coluna, { ascending: o.asc, nullsFirst: false });
      q = q.range(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA - 1);
      const { data, count, error } = await q;
      if (cancelado) return;
      if (error) { avisar('Erro ao carregar: ' + error.message, 'erro'); setLinhas([]); return; }
      setLinhas(data || []); setTotal(count || 0);
      if (ent.totais?.length) {
        const dt = await buscarTodos(() => aplicarFiltros(supabase().from(ent.consulta || ent.tabela).select(ent.totais!.join(',')), ent, filtros, textoAplicado).order(ent.chave));
        if (cancelado) return;
        const s: Record<string, number> = {};
        for (const c of ent.totais) s[c] = (dt || []).reduce((a: number, r: any) => a + numero(r[c]), 0);
        setSomas(s);
      }
    })();
    return () => { cancelado = true; };
  }, [ent, filtros, textoAplicado, pagina, versao, avisar]);

  const abrirNovo = () => {
    if (ent.linkNovo) { router.push(ent.linkNovo); return; }
    const base: Linha = {};
    for (const c of ent.campos) base[c.nome] = null;
    setEditando({ ...base, ...(ent.padrao ? ent.padrao() : {}) }); setEhNovo(true); setSujo(false);
  };

  const abrir = (l: Linha) => {
    if (ent.linkEditar) { router.push(ent.linkEditar(l)); return; }
    setEditando({ ...l }); setEhNovo(false); setSujo(false);
  };

  const mudar = (nome: string, valor: any, extra?: Linha) => {
    setSujo(true);
    setEditando((e) => {
      let n = { ...(e || {}), [nome]: valor, ...(extra || {}) };
      if (ent.calcular) n = { ...n, ...ent.calcular(n, nome) };
      return n;
    });
  };

  const salvar = async (fechar = true): Promise<boolean> => {
    if (!editando) return false;
    for (const c of ent.campos) if (c.obrigatorio && (editando[c.nome] == null || String(editando[c.nome]).trim() === '')) { avisar(`Preencha o campo "${c.rotulo}"`, 'erro'); return false; }
    let reg = prepararParaSalvar(ent, editando);
    if (ent.antesDeSalvar) { const r = ent.antesDeSalvar(reg); if (typeof r === 'string') { avisar(r, 'erro'); return false; } reg = r; }
    setSalvando(true);
    const sb = supabase();
    let erro;
    if (ehNovo) {
      if (ent.chaveAutomatica !== false && (reg[ent.chave] == null)) delete reg[ent.chave];
      ({ error: erro } = await sb.from(ent.tabela).insert(reg));
    } else {
      const chave = editando[ent.chave];
      delete reg[ent.chave];
      ({ error: erro } = await sb.from(ent.tabela).update(reg).eq(ent.chave, chave));
    }
    setSalvando(false);
    if (erro) { avisar('Não foi possível salvar: ' + erro.message, 'erro'); return false; }
    avisar('Salvo'); setSujo(false); if (fechar) setEditando(null); recarregar();
    return true;
  };

  const excluir = async () => {
    if (!editando) return;
    if (!(await confirmar(`Excluir este registro de ${ent.singular.toLowerCase()}?`, { detalhe: 'Essa ação não pode ser desfeita.', ok: 'Excluir', perigo: true }))) return;
    const { error } = await supabase().from(ent.tabela).delete().eq(ent.chave, editando[ent.chave]);
    if (error) { avisar('Não foi possível excluir: ' + error.message, 'erro'); return; }
    avisar('Excluído'); setEditando(null); recarregar();
  };

  const imprimirLista = async () => {
    const data = await buscarTodos(() => { let q = aplicarFiltros(supabase().from(ent.consulta || ent.tabela).select('*'), ent, filtros, textoAplicado); for (const o of ent.ordem) q = q.order(o.coluna, { ascending: o.asc, nullsFirst: false }); return q.order(ent.chave); }, 20000);
    const cols = ent.colunas.filter((c) => c.tipo !== 'situacao' || true).map((c) => ({ titulo: c.rotulo, campo: c.nome, tipo: (c.tipo === 'situacao' ? 'texto' : c.tipo) as any }));
    const tot = ent.totais?.length ? Object.fromEntries(ent.totais.map((t) => [t, somas[t] || 0])) : undefined;
    const blob = await pdfTabela({ titulo: ent.titulo, subtitulo: descreverFiltros(), colunas: cols, linhas: data || [], totais: tot, paisagem: cols.length > 6 });
    compartilhar({ blob, arquivo: `${ent.slug}.pdf`, titulo: ent.titulo });
  };

  const descreverFiltros = () => {
    const partes: string[] = [];
    for (const f of ent.filtros || []) {
      const v = filtros[f.nome];
      if (f.tipo === 'situacao') { const o = f.opcoes.find((x) => x.valor === v); if (o && v !== 'todos') partes.push(o.rotulo); }
      if (f.tipo === 'busca' && v) partes.push(`${f.rotulo}: ${filtroTextos[f.nome] || v}`);
      if (f.tipo === 'periodo' && (v?.ini || v?.fim)) partes.push(`${f.rotulo}: ${fData(v.ini) || '...'} a ${fData(v.fim) || '...'}`);
    }
    if (textoAplicado) partes.push(`Busca: "${textoAplicado}"`);
    return partes.join('  ·  ');
  };

  const ctx = (fechar: boolean) => ({
    recarregar: () => { if (fechar) setEditando(null); recarregar(); }, avisar, compartilhar, ir: (u: string) => router.push(u), confirmar,
  });

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const campos = useMemo(() => ent.campos.map((c) => (ent.somenteLeitura ? { ...c, somenteLeitura: true } : c)), [ent]);

  return (
    <div>
      <Cabecalho titulo={ent.titulo} descricao={ent.descricao}>
        {ent.acoesLista?.map((a) => (
          <button key={a.rotulo} className="botao-secundario" onClick={async () => {
            const data = await buscarTodos(() => { let q = aplicarFiltros(supabase().from(ent.consulta || ent.tabela).select('*'), ent, filtros, textoAplicado); for (const o of ent.ordem) q = q.order(o.coluna, { ascending: o.asc, nullsFirst: false }); return q.order(ent.chave); }, 20000); await a.executar(data || [], { ...filtros, _textos: filtroTextos }, ctx(false));
          }}>{a.rotulo}</button>
        ))}
        <button className="botao-secundario" onClick={imprimirLista}>Imprimir lista</button>
        {(!ent.somenteLeitura || ent.linkNovo) && !ent.semNovo && <button className="botao-primario" onClick={abrirNovo}>+ Novo</button>}
      </Cabecalho>

      <div className="cartao p-3 mb-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div className="md:col-span-4">
          <label className="rotulo" htmlFor="busca-lista">Procurar</label>
          <input id="busca-lista" className="campo" placeholder="Nome, código..." value={texto} onChange={(e) => setTexto(e.target.value)} />
        </div>
        {(ent.filtros || []).map((f: Filtro) => (
          <div key={f.nome} className={f.tipo === 'periodo' ? 'md:col-span-4' : 'md:col-span-3'}>
            <label className="rotulo">{f.rotulo}</label>
            {f.tipo === 'situacao' && (
              <select className="campo" value={filtros[f.nome]} onChange={(e) => { setFiltros({ ...filtros, [f.nome]: e.target.value }); setPagina(0); }}>
                {f.opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
              </select>
            )}
            {f.tipo === 'opcoes' && (
              <select className="campo" value={filtros[f.nome] ?? ''} onChange={(e) => { setFiltros({ ...filtros, [f.nome]: e.target.value }); setPagina(0); }}>
                <option value="">Todos</option>
                {f.opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
              </select>
            )}
            {f.tipo === 'busca' && (
              <Busca config={f.busca} valor={filtros[f.nome]} texto={filtroTextos[f.nome]} placeholder="Todas"
                onEscolher={(l) => { setFiltros({ ...filtros, [f.nome]: l ? l[f.busca.chave] : null }); setFiltroTextos({ ...filtroTextos, [f.nome]: l ? l[f.busca.exibir] : '' }); setPagina(0); }} />
            )}
            {f.tipo === 'periodo' && (
              <div className="flex gap-2">
                <input type="date" className="campo" value={filtros[f.nome]?.ini || ''} onChange={(e) => { setFiltros({ ...filtros, [f.nome]: { ...filtros[f.nome], ini: e.target.value } }); setPagina(0); }} />
                <input type="date" className="campo" value={filtros[f.nome]?.fim || ''} onChange={(e) => { setFiltros({ ...filtros, [f.nome]: { ...filtros[f.nome], fim: e.target.value } }); setPagina(0); }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {ent.totais?.length ? (
        <div className="flex flex-wrap gap-3 mb-3">
          {ent.totais.map((t) => {
            const col = ent.colunas.find((c) => c.nome === t);
            return <div key={t} className="cartao px-4 py-2 text-sm"><span className="text-tinta-suave">Total {col?.rotulo.toLowerCase() || t}: </span><strong className="tabular-nums">{moeda(somas[t] || 0)}</strong></div>;
          })}
        </div>
      ) : null}

      <div className="cartao overflow-hidden">
        {linhas === null ? <Carregando /> : linhas.length === 0 ? <Vazio texto="Nenhum registro encontrado" /> : (
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead><tr>{ent.colunas.map((c) => <th key={c.nome} className={['moeda', 'numero', 'percentual'].includes(c.tipo || '') ? 'text-right' : ''}>{c.rotulo}</th>)}</tr></thead>
              <tbody>
                {linhas.map((l, i) => (
                  <tr key={l[ent.chave] ?? i} className="cursor-pointer" onClick={() => abrir(l)}>
                    {ent.colunas.map((c) => (
                      <td key={c.nome} className={`${['moeda', 'numero', 'percentual'].includes(c.tipo || '') ? 'num' : ''} ${c.classe || ''}`}>
                        {formatarCelula(c.tipo, l[c.nome], l, c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-papel-linha text-sm text-tinta-suave">
          <span>{total} registro(s)</span>
          <div className="flex items-center gap-2">
            <button className="botao-secundario botao-pequeno" disabled={pagina === 0} onClick={() => setPagina(pagina - 1)}>Anterior</button>
            <span>{pagina + 1} de {paginas}</span>
            <button className="botao-secundario botao-pequeno" disabled={pagina + 1 >= paginas} onClick={() => setPagina(pagina + 1)}>Próxima</button>
          </div>
        </div>
      </div>

      <Modal aberto={!!editando} titulo={(ehNovo ? 'Novo: ' : '') + ent.singular + (!ehNovo && editando ? ` ${editando[ent.chave] ?? ''}` : '')} onFechar={() => setEditando(null)}
        rodape={<>
          {!ehNovo && editando && ent.acoes?.filter((a) => !a.mostrar || a.mostrar(editando)).map((a) => (
            <button key={a.rotulo} className="botao-secundario mr-auto sm:mr-0" onClick={async () => { if (sujo && !ent.somenteLeitura && !(await salvar(false))) return; a.executar(editando!, ctx(true)); }}>{a.rotulo}</button>
          ))}
          {!ehNovo && !ent.somenteLeitura && !ent.semExcluir && <button className="botao-perigo" onClick={excluir}>Excluir</button>}
          <button className="botao-secundario" onClick={() => setEditando(null)}>{ent.somenteLeitura ? 'Fechar' : 'Cancelar'}</button>
          {!ent.somenteLeitura && <button className="botao-primario" disabled={salvando} onClick={() => salvar()}>{salvando ? 'Salvando...' : 'Salvar'}</button>}
        </>}>
        {editando && <Formulario campos={campos} valores={editando} onMudar={mudar} />}
      </Modal>
    </div>
  );
}
