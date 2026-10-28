'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';

const MENU: { grupo: string; itens: { href: string; rotulo: string }[] }[] = [
  { grupo: '', itens: [{ href: '/', rotulo: 'Início' }] },
  { grupo: 'Pedidos', itens: [{ href: '/pedidos/novo', rotulo: 'Novo pedido' }, { href: '/c/pedidos', rotulo: 'Pedidos' }, { href: '/c/cartas', rotulo: 'Cartas de cobrança' }] },
  { grupo: 'Cadastros', itens: [
    { href: '/c/clientes', rotulo: 'Clientes' }, { href: '/c/representadas', rotulo: 'Representadas' }, { href: '/c/produtos', rotulo: 'Produtos' },
    { href: '/c/transportadoras', rotulo: 'Transportadoras' }, { href: '/c/vendedores', rotulo: 'Vendedores' }, { href: '/c/tipos', rotulo: 'Tipos de produto' },
    { href: '/c/contas', rotulo: 'Minhas contas bancárias' }, { href: '/c/contas-representadas', rotulo: 'Contas das representadas' },
  ] },
  { grupo: 'Comissões', itens: [{ href: '/c/controle-vendas', rotulo: 'Controle de vendas' }, { href: '/c/debito-credito', rotulo: 'Débitos e créditos' }, { href: '/acertos/novo', rotulo: 'Fazer acerto' }, { href: '/c/acertos', rotulo: 'Acertos feitos' }] },
  { grupo: 'Prepostos', itens: [{ href: '/c/prepostos', rotulo: 'Comissões de prepostos' }, { href: '/c/vales', rotulo: 'Vales' }, { href: '/prepostos/acerto', rotulo: 'Acertar preposto' }, { href: '/c/acertos-prepostos', rotulo: 'Acertos de prepostos' }] },
  { grupo: 'Cobrança', itens: [{ href: '/c/titulos', rotulo: 'Títulos a receber' }, { href: '/cobranca/remessa', rotulo: 'Registrar remessa' }, { href: '/c/remessas', rotulo: 'Remessas feitas' }] },
  { grupo: 'Relatórios', itens: [{ href: '/relatorios', rotulo: 'Todos os relatórios' }] },
  { grupo: 'Sistema', itens: [{ href: '/configuracoes', rotulo: 'Configurações' }, { href: '/importar', rotulo: 'Importar do sistema antigo' }] },
];

export default function Shell({ children }: { children: ReactNode }) {
  const caminho = usePathname();
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => { setAberto(false); }, [caminho]);
  useEffect(() => { supabase().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null)); }, []);

  const ativo = (href: string) => (href === '/' ? caminho === '/' : caminho === href || caminho.startsWith(href + '/'));
  const sair = async () => { await supabase().auth.signOut(); router.replace('/login'); router.refresh(); };

  const nav = (
    <nav className="flex flex-col gap-4 text-[15px]">
      {MENU.map((g) => (
        <div key={g.grupo || 'inicio'}>
          {g.grupo && <div className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-white/50">{g.grupo}</div>}
          {g.itens.map((i) => (
            <Link key={i.href} href={i.href} className={`block rounded-lg px-3 py-2 ${ativo(i.href) ? 'bg-white/15 text-white font-medium' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>{i.rotulo}</Link>
          ))}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-marca-escura px-3 py-5 sticky top-0 h-screen overflow-y-auto">
        <Link href="/" className="px-3 mb-6 block">
          <div className="text-white font-semibold text-lg leading-tight">Neto Representações</div>
          <div className="text-white/60 text-sm">Sistema de Representações</div>
        </Link>
        <div className="flex-1">{nav}</div>
        <div className="px-3 pt-4 mt-4 border-t border-white/15 text-sm text-white/70">
          {email && <div className="truncate mb-2">{email}</div>}
          <button onClick={sair} className="text-white/90 hover:text-white underline underline-offset-2">Sair</button>
        </div>
      </aside>

      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-marca-escura px-4 py-3">
        <Link href="/" className="text-white font-semibold">Neto Representações</Link>
        <button onClick={() => setAberto(true)} className="rounded-lg px-3 py-2 text-white bg-white/10" aria-label="Abrir menu">Menu</button>
      </header>
      {aberto && (
        <div className="lg:hidden fixed inset-0 z-50 bg-tinta/50" onClick={() => setAberto(false)}>
          <div className="absolute right-0 top-0 h-full w-[82vw] max-w-xs bg-marca-escura px-3 py-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-3 mb-4">
              <span className="text-white font-semibold">Menu</span>
              <button onClick={() => setAberto(false)} className="text-white/80 text-xl" aria-label="Fechar menu">✕</button>
            </div>
            {nav}
            <button onClick={sair} className="mt-6 px-3 text-white/90 underline">Sair</button>
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-8 max-w-[1400px]">{children}</main>
    </div>
  );
}
