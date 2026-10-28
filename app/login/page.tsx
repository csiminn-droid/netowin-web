'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState('');
  const [carregando, setCarregando] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault(); setErro(''); setMsg(''); setCarregando(true);
    const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password: senha });
    setCarregando(false);
    if (error) { setErro(error.message.includes('Invalid') ? 'E-mail ou senha incorretos.' : error.message); return; }
    router.replace('/'); router.refresh();
  };

  const esqueci = async () => {
    setErro(''); setMsg('');
    if (!email.trim()) { setErro('Digite seu e-mail primeiro.'); return; }
    const { error } = await supabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + '/nova-senha' });
    if (error) setErro(error.message); else setMsg('Enviamos um link para criar uma nova senha. Veja seu e-mail.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-papel">
      <form onSubmit={entrar} className="cartao w-full max-w-sm p-6 sm:p-8 shadow-sm">
        <div className="mb-6">
          <div className="w-12 h-12 rounded-xl bg-marca text-white flex items-center justify-center text-2xl font-bold mb-3">N</div>
          <h1 className="text-2xl font-semibold">Neto Representações</h1>
          <p className="text-tinta-suave">Entre para acessar o sistema</p>
        </div>
        <label className="rotulo" htmlFor="email">E-mail</label>
        <input id="email" type="email" autoComplete="email" className="campo mb-4" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label className="rotulo" htmlFor="senha">Senha</label>
        <input id="senha" type="password" autoComplete="current-password" className="campo mb-5" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        {erro && <p className="mb-4 text-alerta text-sm">{erro}</p>}
        {msg && <p className="mb-4 text-marca text-sm">{msg}</p>}
        <button className="botao-primario w-full" disabled={carregando}>{carregando ? 'Entrando...' : 'Entrar'}</button>
        <button type="button" onClick={esqueci} className="mt-4 w-full text-sm text-tinta-suave underline underline-offset-2">Esqueci minha senha</button>
      </form>
    </div>
  );
}
