'use client';
import type { ReactNode } from 'react';
import { pdfTabela, type ColunaPdf } from '@/lib/pdf';
import { data as fData, decimal, moeda } from '@/lib/formato';
import { useCompartilhar } from './Compartilhar';
import { Carregando, Vazio } from './ui';
import type { Linha } from '@/lib/tipos';

export function celulaTexto(c: ColunaPdf, l: Linha): string {
  if (c.formatar) return c.formatar(l);
  const v = l[c.campo];
  if (v == null || v === '') return '';
  if (c.tipo === 'moeda') return moeda(v);
  if (c.tipo === 'data') return fData(v);
  if (c.tipo === 'numero') return decimal(v, 3);
  if (c.tipo === 'percentual') return decimal(v, 4) + '%';
  return String(v);
}

/** Tabela na tela + botão para gerar o PDF com as mesmas colunas */
export default function Relatorio({ titulo, subtitulo, colunas, linhas, totais, paisagem, extra, arquivo, whatsapp, email, acoesLinha, observacao }: {
  titulo: string; subtitulo?: string; colunas: ColunaPdf[]; linhas: Linha[] | null; totais?: Record<string, number | string>;
  paisagem?: boolean; extra?: ReactNode; arquivo: string; whatsapp?: string | null; email?: string | null;
  acoesLinha?: (l: Linha) => ReactNode; observacao?: string;
}) {
  const compartilhar = useCompartilhar();
  const gerar = async () => {
    if (!linhas) return;
    const blob = await pdfTabela({ titulo, subtitulo, colunas, linhas, totais, paisagem, observacao });
    compartilhar({ blob, arquivo, titulo, whatsapp, email, texto: titulo });
  };
  const num = (c: ColunaPdf) => ['moeda', 'numero', 'percentual'].includes(c.tipo || '');
  return (
    <section className="cartao">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-papel-linha">
        <div>
          <h2 className="font-semibold">{titulo}</h2>
          {subtitulo && <p className="text-sm text-tinta-suave">{subtitulo}</p>}
        </div>
        <div className="flex gap-2">{extra}<button className="botao-primario" disabled={!linhas?.length} onClick={gerar}>Gerar PDF / enviar</button></div>
      </div>
      {linhas === null ? <Carregando /> : linhas.length === 0 ? <Vazio texto="Nada encontrado com esses filtros" /> : (
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="tabela">
            <thead className="sticky top-0"><tr>{colunas.map((c) => <th key={c.campo + c.titulo} className={num(c) ? 'text-right' : ''}>{c.titulo}</th>)}{acoesLinha && <th></th>}</tr></thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr key={i}>
                  {colunas.map((c) => <td key={c.campo + c.titulo} className={num(c) ? 'num' : ''}>{celulaTexto(c, l)}</td>)}
                  {acoesLinha && <td className="whitespace-nowrap">{acoesLinha(l)}</td>}
                </tr>
              ))}
            </tbody>
            {totais && (
              <tfoot><tr className="font-semibold bg-papel">{colunas.map((c, i) => {
                const t = totais[c.campo];
                return <td key={c.campo + c.titulo} className={num(c) ? 'num' : ''}>{t == null ? (i === 0 ? 'Totais' : '') : typeof t === 'number' ? (c.tipo === 'moeda' ? moeda(t) : decimal(t, 3)) : t}</td>;
              })}{acoesLinha && <td></td>}</tr></tfoot>
            )}
          </table>
        </div>
      )}
    </section>
  );
}
