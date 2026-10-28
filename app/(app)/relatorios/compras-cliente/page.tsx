'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { buscarTodos } from '@/lib/supabase/todos';
import Busca from '@/components/Busca';
import Relatorio from '@/components/Relatorio';
import { Cabecalho } from '@/components/ui';
import { B_CLIENTE } from '@/lib/entidades';
import type { Linha } from '@/lib/tipos';

export default function ComprasCliente() {
  const sp = useSearchParams();
  const [cli, setCli] = useState<Linha | null>(null);
  const [linhas, setLinhas] = useState<Linha[] | null>([]);
  useEffect(() => {
    const c = sp.get('cliente');
    if (c) supabase().from('clientes').select('*').eq('codigo', Number(c)).maybeSingle().then(({ data }) => data && setCli(data));
  }, [sp]);
  useEffect(() => {
    if (!cli) { setLinhas([]); return; }
    setLinhas(null);
    buscarTodos(() => supabase().rpc('rel_compras_cliente', { cod: cli.codigo })).then(setLinhas);
  }, [cli]);
  return (
    <div className="space-y-4">
      <Cabecalho titulo="O que o cliente já comprou" />
      <div className="cartao p-4"><label className="rotulo">Cliente</label><Busca config={B_CLIENTE} valor={cli?.codigo} texto={cli?.nome} onEscolher={setCli} autoFocus /></div>
      {cli && <Relatorio titulo="Relatório de compras por representada" subtitulo={`Cliente: ${cli.codigo} - ${cli.nome}`} arquivo={`Clientescompra${cli.codigo}.pdf`} linhas={linhas}
        whatsapp={cli.whatsapp || cli.celular} email={cli.email}
        colunas={[{ titulo: 'Representada', campo: 'fornecedor' }, { titulo: 'Código', campo: 'produto' }, { titulo: 'Cód. fábrica', campo: 'forn' }, { titulo: 'Produto', campo: 'nomeproduto' },
          { titulo: 'Vezes', campo: 'vezes', tipo: 'numero' }, { titulo: 'Quant. total', campo: 'quant', tipo: 'numero' }, { titulo: 'Última vez', campo: 'ultima', tipo: 'data' }]} />}
    </div>
  );
}
