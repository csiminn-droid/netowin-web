import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ConfirmProvider, ToastProvider } from '@/components/ui';
import { CompartilharProvider } from '@/components/Compartilhar';

export const metadata: Metadata = {
  title: 'Sistema de Representações',
  description: 'Pedidos, comissões e cobrança da Neto Representações',
  icons: { icon: '/icon.svg' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0f6b5c' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ToastProvider>
          <ConfirmProvider>
            <CompartilharProvider>{children}</CompartilharProvider>
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
