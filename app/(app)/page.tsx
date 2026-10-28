'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Cabecalho, Indicador } from '@/components/ui';
import { data as fData, moeda } from '@/lib/formato';

type Resumo = { pedidos_mes: number; vendas_mes: number; comissao_mes: number; comissao_aberta: number; cobranca_aberta: number; cobranca_vencida: number; preposto_aberto: number };

export default function Painel() {
  const [r, setR] = useState<Resumo | null>(null);
  const [ultimos, setUltimos] = useState<any[]>([]);
  const [vencendo, setVencendo] = useState<any[]>([]);
  const [semDados, setSemDados] = useState(false);

  useEffect(() => {
    const sb = supabase();
    sb.rpc('resumo_painel').then(({ data }) => setR(data as Resumo));
    sb.from('pedidos').select('pedido,data,cliente,fornecedor,total,s').order('pedido', { ascending: false }).limit(8).then(({ data }) => { setUltimos(data || []); });
    sb.from('cobranca').select('id,vencimento,cliente,fornecedor,valor,ref').is('cobranca', null).order('vencimento').limit(8).then(({ data }) => setVencendo(data || []));
    sb.from('clientes').select('codigo', { count: 'exact', head: true }).then(({ count }) => setSemDados((count || 0) === 0));
  }, []);

  const mes = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div>
      <Cabecalho titulo="Início" descricao={`Resumo de ${mes}`}>
        <Link href="/pedidos/novo" className="botao-primario">+ Novo pedido</Link>
      </Cabecalho>

      {semDados && (
        <div className="cartao p-5 mb-6 border-aviso/40 bg-aviso-clara">
          <h2 className="font-semibold text-lg">Primeiro acesso</h2>
          <p className="mt-1 text-[15px]">O sistema ainda está vazio. Para trazer clientes, pedidos e todo o histórico do sistema antigo, use a importação.</p>
          <Link href="/importar" className="botao-primario mt-3">Importar dados do sistema antigo</Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Indicador rotulo="Vendas no mês" valor={r ? moeda(r.vendas_mes, true) : '...'} detalhe={r ? `${r.pedidos_mes} pedido(s)` : ''} />
        <Indicador rotulo="Comissão do mês" valor={r ? moeda(r.comissao_mes, true) : '...'} tom="marca" />
        <Indicador rotulo="Comissões a receber" valor={r ? moeda(r.comissao_aberta, true) : '...'} detalhe="Em aberto no controle de vendas" />
        <Indicador rotulo="Títulos a receber" valor={r ? moeda(r.cobranca_aberta, true) : '...'} detalhe={r && r.cobranca_vencida ? `${r.cobranca_vencida} vencido(s)` : 'Nenhum vencido'} tom={r && r.cobranca_vencida ? 'alerta' : undefined} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="cartao">
          <div className="flex items-center justify-between px-4 py-3 border-b border-papel-linha">
            <h2 className="font-semibold">Últimos pedidos</h2>
            <Link href="/c/pedidos" className="text-sm text-marca underline underline-offset-2">Ver todos</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="tabela">
              <tbody>
                {ultimos.map((p) => (
                  <tr key={p.pedido}>
                    <td><Link className="text-marca font-medium" href={`/pedidos/${p.pedido}`}>{p.pedido}</Link></td>
                    <td className="whitespace-nowrap">{fData(p.data)}</td>
                    <td>{p.cliente}<div className="text-xs text-tinta-fraca">{p.fornecedor}</div></td>
                    <td className="num">{moeda(p.total)}{p.s === 'C' && <div className="text-xs text-alerta">cancelado</div>}</td>
                  </tr>
                ))}
                {ultimos.length === 0 && <tr><td className="text-tinta-suave py-6 text-center">Nenhum pedido ainda</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section className="cartao">
          <div className="flex items-center justify-between px-4 py-3 border-b border-papel-linha">
            <h2 className="font-semibold">Próximos títulos a receber</h2>
            <Link href="/c/titulos" className="text-sm text-marca underline underline-offset-2">Ver todos</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="tabela">
              <tbody>
                {vencendo.map((t) => {
                  const vencido = t.vencimento && t.vencimento < new Date().toISOString().slice(0, 10);
                  return (
                    <tr key={t.id}>
                      <td className={`whitespace-nowrap ${vencido ? 'text-alerta font-medium' : ''}`}>{fData(t.vencimento)}</td>
                      <td>{t.cliente}<div className="text-xs text-tinta-fraca">{t.ref} · {t.fornecedor}</div></td>
                      <td className="num">{moeda(t.valor)}</td>
                    </tr>
                  );
                })}
                {vencendo.length === 0 && <tr><td className="text-tinta-suave py-6 text-center">Nenhum título em aberto</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
        {[
          ['/c/clientes', 'Clientes'], ['/c/produtos', 'Produtos'], ['/c/controle-vendas', 'Controle de vendas'], ['/acertos/novo', 'Fazer acerto'],
          ['/relatorios/clientes-sem-comprar', 'Clientes sem comprar'], ['/relatorios/tabela-precos', 'Tabela de preços'], ['/cobranca/remessa', 'Registrar remessa'], ['/relatorios', 'Relatórios'],
        ].map(([h, t]) => <Link key={h} href={h} className="cartao px-4 py-4 font-medium hover:border-marca hover:text-marca">{t}</Link>)}
      </div>
    </div>
  );
}
