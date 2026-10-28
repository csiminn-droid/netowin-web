import Link from 'next/link';
import { Cabecalho } from '@/components/ui';

const RELS: [string, string, string][] = [
  ['/relatorios/vendas', 'Vendas por período', 'Total vendido e comissão por representada, com a lista de pedidos.'],
  ['/relatorios/clientes-sem-comprar', 'Clientes que não compram há X dias', 'Lista para ligar ou chamar no WhatsApp.'],
  ['/relatorios/compras-cliente', 'O que o cliente já comprou', 'Produtos comprados por representada, para oferecer de novo.'],
  ['/relatorios/clientes-representada', 'Clientes por representada e ano', 'Quanto cada cliente comprou de uma representada em cada ano.'],
  ['/relatorios/tabela-precos', 'Tabela de preços', 'PDF com os produtos e preços de uma representada para enviar ao cliente.'],
  ['/relatorios/pendencias', 'Pendências por representada', 'Pedidos em aberto ainda sem faturamento informado.'],
  ['/c/acertos', 'Extrato de acertos', 'Acertos feitos com cada representada (use os filtros e "Imprimir lista").'],
  ['/c/debito-credito', 'Extrato de débitos e créditos', 'Lançamentos por representada.'],
  ['/c/prepostos', 'Comissões de prepostos', 'Comissões por vendedor e período.'],
  ['/c/titulos', 'Títulos a receber', 'Cobranças em aberto e vencidas.'],
  ['/c/transportadoras', 'Cadastro de transportadoras', 'Lista para impressão.'],
  ['/c/representadas', 'Cadastro de representadas', 'Lista para impressão.'],
];

export default function Relatorios() {
  return (
    <div>
      <Cabecalho titulo="Relatórios" descricao="Todos geram PDF para imprimir, baixar ou enviar por WhatsApp e e-mail." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {RELS.map(([h, t, d]) => (
          <Link key={h} href={h} className="cartao p-4 hover:border-marca group">
            <div className="font-semibold group-hover:text-marca">{t}</div>
            <div className="text-sm text-tinta-suave mt-1">{d}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
