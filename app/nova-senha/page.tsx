'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function NovaSenha() {
  const router = useRouter();
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [erro, setErro] = useState('');
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    // O link do e-mail entra com um código; trocamos por uma sessão
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    if (code) supabase().auth.exchangeCodeForSession(code).then(({ error }) => { if (error) setErro('Link inválido ou expirado. Peça outro na tela de login.'); else setPronto(true); });
    else supabase().auth.getSession().then(({ data }) => { if (data.session) setPronto(true); else setErro('Abra esta página pelo link enviado ao seu e-mail.'); });
  }, []);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault(); setErro('');
    if (senha.length < 8) { setErro('A senha precisa ter pelo menos 8 caracteres.'); return; }
    if (senha !== senha2) { setErro('As senhas não são iguais.'); return; }
    const { error } = await supabase().auth.updateUser({ password: senha });
    if (error) { setErro(error.message); return; }
    router.replace('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={salvar} className="cartao w-full max-w-sm p-6 sm:p-8">
        <h1 className="text-xl font-semibold mb-4">Criar nova senha</h1>
        <label className="rotulo" htmlFor="s1">Nova senha</label>
        <input id="s1" type="password" className="campo mb-3" value={senha} onChange={(e) => setSenha(e.target.value)} disabled={!pronto} />
        <label className="rotulo" htmlFor="s2">Repita a senha</label>
        <input id="s2" type="password" className="campo mb-4" value={senha2} onChange={(e) => setSenha2(e.target.value)} disabled={!pronto} />
        {erro && <p className="mb-4 text-alerta text-sm">{erro}</p>}
        <button className="botao-primario w-full" disabled={!pronto}>Salvar senha</button>
      </form>
    </div>
  );
}
