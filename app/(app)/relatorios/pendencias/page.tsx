'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { buscarTodos } from '@/lib/supabase/todos';
import Busca from '@/components/Busca';
import Relatorio from '@/components/Relatorio';
import { Cabecalho } from '@/components/ui';
import { B_REP } from '@/lib/entidades';
import { numero } from '@/lib/formato';
import type { Linha } from '@/lib/tipos';

export default function Pendencias() {
  const [rep, setRep] = useState<Linha | null>(null);
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  useEffect(() => {
    setLinhas(null);
    buscarTodos(() => { let q = supabase().from('controlevendas').select('*').is('codacerto', null).or('entrega.is.null,entrega.eq.0').order('fornecedor').order('data').order('id'); if (rep) q = q.eq('codfor', rep.codigo); return q; }).then(setLinhas);
  }, [rep]);
  return (
    <div className="space-y-4">
      <Cabecalho titulo="Pendências por representada" descricao="Pedidos em aberto no controle de vendas que ainda não têm valor faturado." />
      <div className="cartao p-4"><label className="rotulo">Representada (opcional)</label><Busca config={B_REP} valor={rep?.codigo} texto={rep?.nome} onEscolher={setRep} placeholder="Todas" /></div>
      <Relatorio titulo="Relatório de pendências por fornecedor" subtitulo={rep ? rep.nome : 'Todas as representadas'} arquivo="Pendencias.pdf" linhas={linhas} email={rep?.email}
        colunas={[{ titulo: 'Representada', campo: 'fornecedor' }, { titulo: 'Data', campo: 'data', tipo: 'data' }, { titulo: 'Pedido', campo: 'ref' }, { titulo: 'Cliente', campo: 'cliente' },
          { titulo: 'Cidade', campo: 'cidade' }, { titulo: 'Valor', campo: 'total', tipo: 'moeda' }, { titulo: 'Comissão', campo: 'vrcomissao', tipo: 'moeda' }]}
        totais={{ total: (linhas || []).reduce((a, l) => a + numero(l.total), 0), vrcomissao: (linhas || []).reduce((a, l) => a + numero(l.vrcomissao), 0) }} />
    </div>
  );
}
