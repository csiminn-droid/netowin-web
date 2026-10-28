'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

// ---------- Avisos rápidos (toast) ----------
type Toast = { id: number; texto: string; tipo: 'ok' | 'erro' };
const ToastCtx = createContext<(texto: string, tipo?: 'ok' | 'erro') => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Toast[]>([]);
  const mostrar = useCallback((texto: string, tipo: 'ok' | 'erro' = 'ok') => {
    const id = Date.now() + Math.random();
    setLista((l) => [...l, { id, texto, tipo }]);
    setTimeout(() => setLista((l) => l.filter((t) => t.id !== id)), tipo === 'erro' ? 7000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={mostrar}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[min(92vw,420px)]" aria-live="polite">
        {lista.map((t) => (
          <div key={t.id} className={`rounded-lg px-4 py-3 text-[15px] shadow-lg ${t.tipo === 'erro' ? 'bg-alerta text-white' : 'bg-tinta text-white'}`}>
            {t.texto}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

// ---------- Janela (modal) ----------
export function Modal({ aberto, titulo, onFechar, children, largura = 'max-w-3xl', rodape }: {
  aberto: boolean; titulo: string; onFechar: () => void; children: ReactNode; largura?: string; rodape?: ReactNode;
}) {
  useEffect(() => {
    if (!aberto) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [aberto, onFechar]);
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-tinta/40 p-0 sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar(); }}>
      <div role="dialog" aria-modal="true" className={`w-full ${largura} max-h-[94vh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl shadow-xl`}>
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-papel-linha">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button onClick={onFechar} className="rounded-lg p-2 text-tinta-suave hover:bg-papel" aria-label="Fechar">✕</button>
        </div>
        <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
        {rodape && <div className="px-5 py-3 border-t border-papel-linha flex flex-wrap justify-end gap-2">{rodape}</div>}
      </div>
    </div>
  );
}

// ---------- Confirmação ----------
type Confirmar = { texto: string; detalhe?: string; ok?: string; perigo?: boolean; resolver: (v: boolean) => void };
const ConfirmCtx = createContext<(texto: string, opcoes?: { detalhe?: string; ok?: string; perigo?: boolean }) => Promise<boolean>>(async () => false);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [c, setC] = useState<Confirmar | null>(null);
  const confirmar = useCallback((texto: string, o?: { detalhe?: string; ok?: string; perigo?: boolean }) =>
    new Promise<boolean>((resolver) => setC({ texto, ...o, resolver })), []);
  const fechar = (v: boolean) => { c?.resolver(v); setC(null); };
  return (
    <ConfirmCtx.Provider value={confirmar}>
      {children}
      <Modal aberto={!!c} titulo="Confirme" onFechar={() => fechar(false)} largura="max-w-md"
        rodape={<>
          <button className="botao-secundario" onClick={() => fechar(false)}>Voltar</button>
          <button className={c?.perigo ? 'botao bg-alerta text-white hover:opacity-90' : 'botao-primario'} onClick={() => fechar(true)}>{c?.ok || 'Confirmar'}</button>
        </>}>
        <p className="text-[15px]">{c?.texto}</p>
        {c?.detalhe && <p className="mt-2 text-sm text-tinta-suave">{c.detalhe}</p>}
      </Modal>
    </ConfirmCtx.Provider>
  );
}
export const useConfirmar = () => useContext(ConfirmCtx);

// ---------- Pequenos componentes ----------
export function Carregando({ texto = 'Carregando...' }: { texto?: string }) {
  return <div className="py-10 text-center text-tinta-suave">{texto}</div>;
}

export function Vazio({ texto }: { texto: string }) {
  return <div className="py-10 text-center text-tinta-suave">{texto}</div>;
}

export function Cabecalho({ titulo, descricao, children }: { titulo: string; descricao?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descricao && <p className="text-tinta-suave mt-1 text-[15px]">{descricao}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Indicador({ rotulo, valor, detalhe, tom }: { rotulo: string; valor: string; detalhe?: string; tom?: 'alerta' | 'marca' }) {
  return (
    <div className="cartao p-4">
      <div className="text-sm text-tinta-suave">{rotulo}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${tom === 'alerta' ? 'text-alerta' : tom === 'marca' ? 'text-marca' : ''}`}>{valor}</div>
      {detalhe && <div className="text-sm text-tinta-fraca mt-1">{detalhe}</div>}
    </div>
  );
}
