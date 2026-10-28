'use client';
import type { ReactNode } from 'react';
import type { Linha } from '@/lib/tipos';
import { data as fData, moeda, decimal } from '@/lib/formato';

export type ColSel = { nome: string; rotulo: string; tipo?: 'moeda' | 'data' | 'percentual' | 'texto'; render?: (l: Linha) => ReactNode };

/** Tabela com caixas de seleção, usada nos acertos e na remessa */
export default function Selecao({ titulo, linhas, colunas, marcados, onMudar, vazio, extra }: {
  titulo: string; linhas: Linha[]; colunas: ColSel[]; marcados: Set<any>; onMudar: (s: Set<any>) => void; vazio: string; extra?: ReactNode;
}) {
  const todos = linhas.length > 0 && linhas.every((l) => marcados.has(l.id));
  const alternar = (id: any) => { const s = new Set(marcados); if (s.has(id)) s.delete(id); else s.add(id); onMudar(s); };
  const fmt = (c: ColSel, l: Linha) => {
    if (c.render) return c.render(l);
    const v = l[c.nome];
    if (v == null || v === '') return '';
    if (c.tipo === 'moeda') return moeda(v);
    if (c.tipo === 'data') return fData(v);
    if (c.tipo === 'percentual') return decimal(v, 4) + '%';
    return String(v);
  };
  return (
    <section className="cartao mb-4">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-papel-linha">
        <h2 className="font-semibold">{titulo} <span className="text-tinta-suave font-normal">({marcados.size} de {linhas.length} marcados)</span></h2>
        {linhas.length > 0 && (<div className="flex gap-2">{extra}
          <button className="botao-secundario botao-pequeno" onClick={() => onMudar(todos ? new Set() : new Set(linhas.map((l) => l.id)))}>{todos ? 'Desmarcar todos' : 'Marcar todos'}</button></div>
        )}
      </div>
      {linhas.length === 0 ? <div className="px-4 py-6 text-tinta-suave text-center">{vazio}</div> : (
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="tabela">
            <thead className="sticky top-0"><tr><th className="w-10"></th>{colunas.map((c) => <th key={c.nome} className={c.tipo === 'moeda' || c.tipo === 'percentual' ? 'text-right' : ''}>{c.rotulo}</th>)}</tr></thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id} className={`cursor-pointer ${marcados.has(l.id) ? '' : 'opacity-60'}`} onClick={() => alternar(l.id)}>
                  <td><input type="checkbox" className="h-5 w-5 accent-marca" checked={marcados.has(l.id)} onChange={() => alternar(l.id)} onClick={(e) => e.stopPropagation()} aria-label="Marcar" /></td>
                  {colunas.map((c) => <td key={c.nome} className={c.tipo === 'moeda' || c.tipo === 'percentual' ? 'num' : ''}>{fmt(c, l)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
