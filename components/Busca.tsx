'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export type BuscaConfig = {
  tabela: string;
  chave: string;
  exibir: string;
  detalhe?: string;          // coluna mostrada em cinza na lista (ex.: cidade)
  filtro?: Record<string, string | number | boolean | null>;
  ordem?: string;
};

type Linha = Record<string, any>;

export default function Busca({ config, valor, texto, onEscolher, placeholder, disabled, autoFocus, id }: {
  config: BuscaConfig; valor: any; texto?: string | null; onEscolher: (l: Linha | null) => void;
  placeholder?: string; disabled?: boolean; autoFocus?: boolean; id?: string;
}) {
  const [q, setQ] = useState('');
  const [aberto, setAberto] = useState(false);
  const [lista, setLista] = useState<Linha[]>([]);
  const [ativo, setAtivo] = useState(0);
  const caixa = useRef<HTMLDivElement>(null);
  const [nomeBuscado, setNomeBuscado] = useState<string | null>(null);
  useEffect(() => {
    if (valor == null || valor === '' || texto) { setNomeBuscado(null); return; }
    let ok = true;
    supabase().from(config.tabela).select(config.exibir).eq(config.chave, valor).maybeSingle().then(({ data }) => { if (ok && data) setNomeBuscado((data as any)[config.exibir]); });
    return () => { ok = false; };
  }, [valor, texto, config]);
  const exibicao = valor != null && valor !== '' ? `${valor} - ${texto || nomeBuscado || ''}` : '';

  useEffect(() => {
    if (!aberto) return;
    const t = setTimeout(async () => {
      let r = supabase().from(config.tabela).select('*').limit(20).order(config.ordem || config.exibir);
      if (config.filtro) for (const [k, v] of Object.entries(config.filtro)) r = v === null ? r.is(k, null) : r.eq(k, v);
      const termo = q.trim();
      if (termo) {
        if (/^\d+$/.test(termo)) r = r.or(`${config.chave}.eq.${termo},${config.exibir}.ilike.%${termo}%`);
        else r = r.ilike(config.exibir, `%${termo.replace(/[%,()]/g, ' ')}%`);
      }
      const { data } = await r;
      setLista(data || []); setAtivo(0);
    }, 200);
    return () => clearTimeout(t);
  }, [q, aberto, config]);

  useEffect(() => {
    const fora = (e: MouseEvent) => { if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false); };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);

  const escolher = (l: Linha | null) => { onEscolher(l); setAberto(false); setQ(''); };

  return (
    <div ref={caixa} className="relative">
      <div className="flex gap-1">
        <input id={id} className="campo" disabled={disabled} autoFocus={autoFocus} placeholder={placeholder || 'Digite o código ou o nome'}
          value={aberto ? q : exibicao}
          onFocus={() => { setAberto(true); setQ(''); }}
          onChange={(e) => { setQ(e.target.value); setAberto(true); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setAtivo((a) => Math.min(a + 1, lista.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((a) => Math.max(a - 1, 0)); }
            else if (e.key === 'Enter' && aberto && lista[ativo]) { e.preventDefault(); escolher(lista[ativo]); }
            else if (e.key === 'Escape') setAberto(false);
          }} />
        {valor != null && valor !== '' && !disabled && (
          <button type="button" className="botao-secundario px-3" title="Limpar" onClick={() => escolher(null)}>✕</button>
        )}
      </div>
      {aberto && !disabled && (
        <div className="absolute z-40 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-papel-linha bg-white shadow-lg">
          {lista.length === 0 && <div className="px-3 py-3 text-sm text-tinta-suave">Nada encontrado</div>}
          {lista.map((l, i) => (
            <button type="button" key={l[config.chave]} onMouseDown={(e) => { e.preventDefault(); escolher(l); }}
              className={`block w-full text-left px-3 py-2 text-[15px] ${i === ativo ? 'bg-marca-clara' : 'hover:bg-papel'}`}>
              <span className="text-tinta-fraca tabular-nums mr-2">{l[config.chave]}</span>{l[config.exibir]}
              {config.detalhe && l[config.detalhe] && <span className="text-tinta-fraca text-sm"> · {l[config.detalhe]}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
