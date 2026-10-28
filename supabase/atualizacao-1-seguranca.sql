-- =====================================================================
-- Atualização 1: ajustes de segurança (28/10/2026)
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez sem problema.
-- =====================================================================

-- 1. "autorizado" deixa de rodar com permissão especial (SECURITY DEFINER).
--    Cada usuário logado passa a enxergar só a própria linha em "usuarios".
drop policy if exists ver_proprio on usuarios;
create policy ver_proprio on usuarios for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create or replace function autorizado() returns boolean
language sql stable security invoker set search_path = public, pg_temp as $$
  select exists (select 1 from usuarios where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- 2. Todas as funções do sistema: caminho de busca fixo e só usuários logados podem executar
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as assinatura
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
  loop
    execute format('alter function %s set search_path = public, pg_temp', f.assinatura);
    execute format('revoke execute on function %s from public, anon', f.assinatura);
    execute format('grant execute on function %s to authenticated', f.assinatura);
  end loop;
end $$;

-- 3. Funções criadas no futuro também não ficam abertas para quem não fez login
alter default privileges in schema public revoke execute on functions from public, anon;

-- 4. Quem não fez login não lê nem grava nada nas tabelas (o RLS já bloqueava; isto é uma segunda tranca)
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke all on table %I from anon', t.tablename);
  end loop;
  for t in select viewname as tablename from pg_views where schemaname = 'public' loop
    execute format('revoke all on table %I from anon', t.tablename);
  end loop;
end $$;
revoke usage, select on sequence remessa_seq from anon;
