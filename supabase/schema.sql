-- ============================================================
-- Beer to Beer — Schema database (Fase 1, Step 1)
--
-- Come usarlo: apri il dashboard Supabase del progetto → SQL Editor →
-- incolla TUTTO questo file → Run. È idempotente (si può rieseguire).
-- ============================================================

-- ---------- USERS ----------
-- Profilo dell'utente. La chiave primaria è anche FK verso auth.users:
-- ogni utente autenticato ha esattamente una riga qui.
create table if not exists public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  nome          text not null,
  data_nascita  date not null,
  bio           text,
  foto_url      text,
  rating_medio  numeric(2,1) not null default 0,
  crediti_saldo integer not null default 0,
  created_at    timestamptz not null default now()
);

-- ---------- ORDERS ----------
-- Una richiesta/ordine di consegna birre.
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  host_id         uuid not null references public.users(id) on delete cascade,
  driver_id       uuid references public.users(id) on delete set null,
  lista_birre     jsonb not null default '[]'::jsonb,
  indirizzo       text not null,
  lat             double precision,
  lng             double precision,
  stato           text not null default 'richiesto'
                  check (stato in ('richiesto','accettato','in_consegna','consegnato','confermato')),
  vibe_mode       boolean not null default false,
  crediti_offerti integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------- CREDIT_TRANSACTIONS ----------
-- Ledger trasparente dei movimenti crediti (ogni movimento è tracciabile).
create table if not exists public.credit_transactions (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid references public.orders(id) on delete set null,
  from_user_id uuid references public.users(id) on delete set null,
  to_user_id   uuid references public.users(id) on delete set null,
  importo      integer not null,
  tipo         text not null,
  created_at   timestamptz not null default now()
);

-- ---------- REVIEWS ----------
-- Recensioni reciproche post-scambio (alimentano rating_medio).
create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid references public.orders(id) on delete cascade,
  from_user_id uuid not null references public.users(id) on delete cascade,
  to_user_id   uuid not null references public.users(id) on delete cascade,
  voto         integer not null check (voto between 1 and 5),
  commento     text,
  created_at   timestamptz not null default now()
);

-- ---------- REPORTS ----------
-- Segnalazioni utenti/ordini.
create table if not exists public.reports (
  id                 uuid primary key default gen_random_uuid(),
  reported_user_id   uuid not null references public.users(id) on delete cascade,
  reporting_user_id  uuid not null references public.users(id) on delete cascade,
  order_id           uuid references public.orders(id) on delete set null,
  motivo             text not null,
  created_at         timestamptz not null default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- Abilitata su tutte le tabelle. Con RLS attiva e NESSUNA policy,
-- l'accesso è negato di default: è il comportamento sicuro che vogliamo.
-- ============================================================
alter table public.users               enable row level security;
alter table public.orders              enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.reviews             enable row level security;
alter table public.reports             enable row level security;

-- USERS: ognuno può leggere e aggiornare la PROPRIA riga.
-- (La lettura dei profili altrui — es. l'host nel feed — sarà aggiunta
--  in uno step successivo quando collegheremo Feed/Profilo.)
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
  on public.users for select
  using (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- NOTA: orders / credit_transactions / reviews / reports hanno RLS attiva
-- ma nessuna policy ancora → nessun accesso. Le policy verranno definite
-- negli step successivi, una tabella alla volta, quando le colleghiamo alla UI.

-- ============================================================
-- Trigger: alla creazione di un utente in auth.users, crea automaticamente
-- la riga corrispondente in public.users, leggendo nome e data_nascita
-- dai metadata passati in fase di registrazione (signUp options.data).
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, nome, data_nascita, crediti_saldo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', 'Utente'),
    (new.raw_user_meta_data->>'data_nascita')::date,
    0
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
