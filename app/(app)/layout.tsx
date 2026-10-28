import { Suspense } from 'react';
import Shell from '@/components/Shell';
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Shell><Suspense fallback={<div className="py-10 text-center text-tinta-suave">Carregando...</div>}>{children}</Suspense></Shell>;
}
