'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let cliente: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (cliente) return cliente;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const teste = process.env.NEXT_PUBLIC_TESTE_TOKEN;
  if (teste && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    // Somente para testes locais: usa um token fixo, sem tela de login
    cliente = createBrowserClient(url, chave, { global: { headers: { Authorization: 'Bearer ' + teste } } });
  } else {
    cliente = createBrowserClient(url, chave);
  }
  return cliente;
}
