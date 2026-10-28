'use client';
import { Fragment } from 'react';
import Busca from './Busca';
import type { Campo, Linha } from '@/lib/tipos';
import { decimal } from '@/lib/formato';

const LARG: Record<number, string> = { 1: 'sm:col-span-1', 2: 'sm:col-span-2', 3: 'sm:col-span-3', 4: 'sm:col-span-4' };

export function valorParaEdicao(c: Campo, v: any): any {
  if (v == null) return '';
  if (c.tipo === 'moeda' || c.tipo === 'numero' || c.tipo === 'percentual') return typeof v === 'number' ? decimal(v, 4).replace(/\./g, '') : String(v);
  return v;
}

export default function Formulario({ campos, valores, onMudar, desativado }: {
  campos: Campo[]; valores: Linha; onMudar: (nome: string, valor: any, extra?: Linha) => void; desativado?: boolean;
}) {
  let grupoAtual: string | undefined;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-x-4 gap-y-3">
      {campos.map((c) => {
        const id = 'campo-' + c.nome;
        const v = valores[c.nome];
        const dis = desativado || c.somenteLeitura;
        const titulo = c.grupo && c.grupo !== grupoAtual ? c.grupo : null;
        if (c.grupo) grupoAtual = c.grupo;
        let entrada;
        switch (c.tipo) {
          case 'area':
            entrada = <textarea id={id} className="campo min-h-[84px]" disabled={dis} value={v ?? ''} onChange={(e) => onMudar(c.nome, e.target.value)} />;
            break;
          case 'data':
            entrada = <input id={id} type="date" className="campo" disabled={dis} value={v ?? ''} onChange={(e) => onMudar(c.nome, e.target.value || null)} />;
            break;
          case 'opcoes':
            entrada = (
              <select id={id} className="campo" disabled={dis} value={v ?? ''} onChange={(e) => onMudar(c.nome, e.target.value || null)}>
                <option value="">-</option>
                {c.opcoes?.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
              </select>
            );
            break;
          case 'logico':
            entrada = (
              <label className="flex items-center gap-2 h-[46px]">
                <input id={id} type="checkbox" className="h-5 w-5 accent-marca" disabled={dis} checked={!!v} onChange={(e) => onMudar(c.nome, e.target.checked)} />
                <span className="text-[15px]">Sim</span>
              </label>
            );
            break;
          case 'busca':
            entrada = (
              <Busca id={id} config={c.busca!} valor={v} texto={valores[c.busca!.textoCampo]} disabled={dis}
                onEscolher={(l) => {
                  const extra: Linha = { [c.busca!.textoCampo]: l ? l[c.busca!.exibir] : null };
                  if (c.busca!.preencher) for (const [destino, origem] of Object.entries(c.busca!.preencher)) extra[destino] = l ? l[origem] : null;
                  onMudar(c.nome, l ? l[c.busca!.chave] : null, extra);
                }} />
            );
            break;
          case 'moeda': case 'numero': case 'percentual':
            entrada = (
              <div className="relative">
                <input id={id} className={`campo text-right tabular-nums ${c.tipo === 'percentual' ? 'pr-8' : ''}`} inputMode="decimal" disabled={dis}
                  value={valorParaEdicao(c, v)} onChange={(e) => onMudar(c.nome, e.target.value.replace(/[^\d,.-]/g, ''))} />
                {c.tipo === 'percentual' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-tinta-fraca">%</span>}
              </div>
            );
            break;
          default:
            entrada = <input id={id} className="campo" disabled={dis} value={v ?? ''} onChange={(e) => onMudar(c.nome, e.target.value)} />;
        }
        return (
          <Fragment key={c.nome}>
          {titulo && <div className="sm:col-span-4 text-xs font-semibold uppercase tracking-wide text-marca pt-3 border-t border-papel-linha first:border-0 first:pt-0">{titulo}</div>}
          <div className={LARG[c.largura || 2]}>
            <label htmlFor={id} className="rotulo">{c.rotulo}{c.obrigatorio && <span className="text-alerta"> *</span>}</label>
            {entrada}
            {c.ajuda && <p className="text-xs text-tinta-fraca mt-1">{c.ajuda}</p>}
          </div>
          </Fragment>
        );
      })}
    </div>
  );
}
