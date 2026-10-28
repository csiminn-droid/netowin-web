'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { buscarTodos } from '@/lib/supabase/todos';
import Relatorio from '@/components/Relatorio';
import { Cabecalho } from '@/components/ui';
import { data as fData, hojeISO, linkWhatsApp, somarDias } from '@/lib/formato';
import type { Linha } from '@/lib/tipos';

export default function ClientesSemComprar() {
  const [dias, setDias] = useState(45);
  const [incluirNunca, setIncluirNunca] = useState(false);
  const [msg, setMsg] = useState('Olá! Tudo bem? Faz um tempo que não conversamos. Posso te enviar as novidades e a tabela de preços atualizada?');
  const [linhas, setLinhas] = useState<Linha[] | null>(null);

  useEffect(() => {
    setLinhas(null);
    const limite = somarDias(hojeISO(), -dias);
    buscarTodos(() => { const q = supabase().from('v_clientes_ultima_compra').select('*').order('ultimadata', { ascending: true, nullsFirst: true }).order('codigo'); return incluirNunca ? q.or(`ultimadata.lt.${limite},ultimadata.is.null`) : q.lt('ultimadata', limite); }).then((data) => setLinhas(data.map((l: Linha) => ({ ...l, dias: l.ultimadata ? Math.round((Date.now() - new Date(l.ultimadata + 'T12:00:00').getTime()) / 86400000) : null }))));
  }, [dias, incluirNunca]);

  return (
    <div className="space-y-4">
      <Cabecalho titulo="Clientes que não compram há algum tempo" />
      <div className="cartao p-4 grid sm:grid-cols-4 gap-3 items-end">
        <div><label className="rotulo">Sem comprar há mais de (dias)</label><input type="number" min={1} className="campo" value={dias} onChange={(e) => setDias(Math.max(1, Number(e.target.value) || 45))} /></div>
        <label className="flex items-center gap-2 h-[46px]"><input type="checkbox" className="h-5 w-5 accent-marca" checked={incluirNunca} onChange={(e) => setIncluirNunca(e.target.checked)} />Incluir quem nunca comprou</label>
        <div className="sm:col-span-2"><label className="rotulo">Mensagem para o WhatsApp</label><input className="campo" value={msg} onChange={(e) => setMsg(e.target.value)} /></div>
      </div>
      <Relatorio titulo={`Clientes sem comprar há mais de ${dias} dias`} arquivo="ClientesSemComprar.pdf" linhas={linhas}
        colunas={[{ titulo: 'Cód.', campo: 'codigo' }, { titulo: 'Cliente', campo: 'nome' }, { titulo: 'Cidade', campo: 'cidade' }, { titulo: 'Contato', campo: 'contato' },
          { titulo: 'Telefone', campo: 'telefone' }, { titulo: 'WhatsApp', campo: 'whatsapp', formatar: (l) => l.whatsapp || l.celular || '' },
          { titulo: 'Última compra', campo: 'ultimadata', tipo: 'data' }, { titulo: 'Dias', campo: 'dias' }, { titulo: 'Últ. pedido', campo: 'ultimopedido' }]}
        acoesLinha={(l) => (l.whatsapp || l.celular) ? <a className="botao-secundario botao-pequeno" target="_blank" href={linkWhatsApp(l.whatsapp || l.celular, msg)}>WhatsApp</a> : null}
        subtitulo={`Gerado em ${fData(hojeISO())}`} />
    </div>
  );
}
