-- Financeiro para barbearias e salões — esquema da Etapa 1 (login + dados por empresa).
-- Cole no Supabase: SQL Editor → New query → Run. Pode rodar de novo sem estragar nada.

create extension if not exists pgcrypto;

create table if not exists public.empresas (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null check (char_length(nome) between 2 and 120),
  plano      text not null default 'teste',
  criada_em  timestamptz not null default now()
);

create table if not exists public.membros (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  papel      text not null default 'dono' check (papel in ('dono','gerente','contador')),
  criado_em  timestamptz not null default now(),
  primary key (empresa_id, user_id)
);
create index if not exists membros_user_idx on public.membros(user_id);

-- Todo o estado do app de uma empresa (Etapa 1). "versao" evita que dois aparelhos se sobrescrevam sem querer.
create table if not exists public.app_state (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  versao     bigint not null default 1,
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid references auth.users(id)
);

-- Funções auxiliares (security definer evita recursão nas regras de segurança)
create or replace function public.minhas_empresas() returns setof uuid
language sql stable security definer set search_path = public as $$
  select empresa_id from public.membros where user_id = auth.uid()
$$;

create or replace function public.posso_editar(emp uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.membros
                 where empresa_id = emp and user_id = auth.uid() and papel in ('dono','gerente'))
$$;

-- Cria a empresa e já coloca quem chamou como dono.
create or replace function public.criar_empresa(p_nome text) returns uuid
language plpgsql security definer set search_path = public as $$
declare novo uuid;
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  insert into public.empresas(nome) values (btrim(p_nome)) returning id into novo;
  insert into public.membros(empresa_id, user_id, papel) values (novo, auth.uid(), 'dono');
  insert into public.app_state(empresa_id, atualizado_por) values (novo, auth.uid());
  return novo;
end $$;
revoke all on function public.criar_empresa(text) from public, anon;
grant execute on function public.criar_empresa(text) to authenticated;

-- Segurança: cada usuário só enxerga/altera as empresas das quais participa.
alter table public.empresas  enable row level security;
alter table public.membros   enable row level security;
alter table public.app_state enable row level security;

drop policy if exists empresas_ler   on public.empresas;
drop policy if exists empresas_mudar on public.empresas;
create policy empresas_ler   on public.empresas for select to authenticated using (id in (select public.minhas_empresas()));
create policy empresas_mudar on public.empresas for update to authenticated using (public.posso_editar(id)) with check (public.posso_editar(id));

drop policy if exists membros_ler on public.membros;
create policy membros_ler on public.membros for select to authenticated using (empresa_id in (select public.minhas_empresas()));

drop policy if exists state_ler   on public.app_state;
drop policy if exists state_mudar on public.app_state;
create policy state_ler   on public.app_state for select to authenticated using (empresa_id in (select public.minhas_empresas()));
create policy state_mudar on public.app_state for update to authenticated using (public.posso_editar(empresa_id)) with check (public.posso_editar(empresa_id));
-- (sem policy de insert/delete: só a função criar_empresa cria linhas)
