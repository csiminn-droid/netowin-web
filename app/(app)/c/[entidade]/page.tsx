'use client';
import { useParams, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import ListaEntidade from '@/components/ListaEntidade';
import { ENTIDADES } from '@/lib/entidades';

export default function Pagina() {
  const { entidade } = useParams<{ entidade: string }>();
  const sp = useSearchParams();
  const ent = ENTIDADES[entidade];
  const iniciais = useMemo(() => {
    const f: Record<string, any> = {};
    for (const x of ent?.filtros || []) { const v = sp.get(x.nome); if (v != null) f[x.nome] = /^\d+$/.test(v) && x.tipo === 'busca' ? Number(v) : v; }
    return f;
  }, [ent, sp]);
  if (!ent) return <div className="py-10">Página não encontrada.</div>;
  return <ListaEntidade key={entidade + JSON.stringify(iniciais)} ent={ent} filtrosIniciais={iniciais} abrirChave={sp.get('abrir')} />;
}
