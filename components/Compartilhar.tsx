'use client';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Modal, useToast } from './ui';
import { linkWhatsApp } from '@/lib/formato';

import type { CompartilharPedido as Pedido } from '@/lib/tipos';
const Ctx = createContext<(p: Pedido) => void>(() => {});

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function paraBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...Array.from(buf.subarray(i, i + 0x8000)));
  return btoa(s);
}

export function CompartilharProvider({ children }: { children: ReactNode }) {
  const [p, setP] = useState<Pedido | null>(null);
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const avisar = useToast();
  const abrir = useCallback((x: Pedido) => { setP(x); setEmail(x.email || ''); }, []);

  const podeCompartilharArquivo = typeof navigator !== 'undefined' && !!navigator.canShare && p
    ? navigator.canShare({ files: [new File([p.blob], p.arquivo, { type: 'application/pdf' })] }) : false;

  const ver = () => { if (!p) return; const url = URL.createObjectURL(p.blob); window.open(url, '_blank'); setTimeout(() => URL.revokeObjectURL(url), 60000); };

  const compartilhar = async () => {
    if (!p) return;
    try {
      await navigator.share({ files: [new File([p.blob], p.arquivo, { type: 'application/pdf' })], title: p.titulo, text: p.texto });
    } catch { /* cancelado */ }
  };

  const whatsapp = () => {
    if (!p) return;
    baixar(p.blob, p.arquivo);
    window.open(linkWhatsApp(p.whatsapp, (p.texto ? p.texto + '\n' : '') + '(o PDF foi baixado no seu computador: anexe o arquivo ' + p.arquivo + ' na conversa)'), '_blank');
  };

  const enviarEmail = async () => {
    if (!p || !email) return;
    setEnviando(true);
    try {
      const r = await fetch('/api/email', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ para: email, assunto: p.assunto || p.titulo, texto: p.texto || p.titulo, arquivo: p.arquivo, conteudo: await paraBase64(p.blob) }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { avisar('E-mail enviado para ' + email); setP(null); }
      else if (j.naoConfigurado) {
        baixar(p.blob, p.arquivo);
        window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(p.assunto || p.titulo)}&body=${encodeURIComponent((p.texto || '') + '\n\n(anexe o arquivo ' + p.arquivo + ' que foi baixado)')}`;
        avisar('O envio automático de e-mail não está configurado. Abrimos seu programa de e-mail e baixamos o PDF para você anexar.');
      } else avisar('Não foi possível enviar: ' + (j.erro || r.statusText), 'erro');
    } finally { setEnviando(false); }
  };

  return (
    <Ctx.Provider value={abrir}>
      {children}
      <Modal aberto={!!p} titulo={p?.titulo || ''} onFechar={() => setP(null)} largura="max-w-lg">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button className="botao-secundario" onClick={ver}>Ver / imprimir</button>
            <button className="botao-secundario" onClick={() => p && baixar(p.blob, p.arquivo)}>Baixar PDF</button>
          </div>
          {podeCompartilharArquivo && (
            <button className="botao-primario w-full" onClick={compartilhar}>Compartilhar (WhatsApp, e-mail...)</button>
          )}
          <button className="botao w-full bg-[#1f8f4e] text-white hover:opacity-90" onClick={whatsapp}>
            Enviar pelo WhatsApp {p?.whatsapp ? `(${p.whatsapp})` : ''}
          </button>
          <div className="pt-2 border-t border-papel-linha">
            <label className="rotulo" htmlFor="email-envio">Enviar por e-mail</label>
            <div className="flex gap-2">
              <input id="email-envio" className="campo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@cliente.com.br" />
              <button className="botao-primario" disabled={!email || enviando} onClick={enviarEmail}>{enviando ? 'Enviando...' : 'Enviar'}</button>
            </div>
          </div>
        </div>
      </Modal>
    </Ctx.Provider>
  );
}

export const useCompartilhar = () => useContext(Ctx);
export { baixar };
