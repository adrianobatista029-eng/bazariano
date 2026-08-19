-- Fase 1 do sistema de troca: negociação (propor, contrapropor, aceitar,
-- recusar, cancelar). Sem entrega ainda — isso é Fase 2.
--
-- Modelo: UMA linha por negociação. Contraproposta só atualiza a mesma
-- linha (troca o valor da diferença + de quem é a vez de responder), em vez
-- de criar linhas novas — evita ter que reconstruir a cadeia de quem
-- ofereceu o quê a cada rodada.

create type trade_offer_status as enum ('pending', 'accepted', 'rejected', 'cancelled');
create type trade_offer_turn as enum ('buyer', 'seller');

create table public.trade_offers (
  id uuid primary key default gen_random_uuid(),
  listing_product_id uuid not null references public.products (id) on delete cascade,
  offered_product_id uuid not null references public.products (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  cash_adjustment_cents integer not null default 0,
  message text,
  status trade_offer_status not null default 'pending',
  awaiting_response_from trade_offer_turn not null default 'seller',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (buyer_id <> seller_id),
  check (listing_product_id <> offered_product_id)
);

create index trade_offers_buyer_id_idx on public.trade_offers (buyer_id);
create index trade_offers_seller_id_idx on public.trade_offers (seller_id);
create index trade_offers_listing_product_id_idx on public.trade_offers (listing_product_id);
create index trade_offers_offered_product_id_idx on public.trade_offers (offered_product_id);

create trigger set_trade_offers_updated_at before update on public.trade_offers
  for each row execute procedure public.set_updated_at();

alter table public.trade_offers enable row level security;

create policy "trade_offers_select_participant_or_admin" on public.trade_offers
  for select using (
    buyer_id = auth.uid()
    or seller_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Só quem é dono do produto oferecido pode abrir a negociação, e o
-- listing_product_id precisa realmente pertencer ao seller_id informado.
create policy "trade_offers_insert_as_buyer" on public.trade_offers
  for insert
  with check (
    buyer_id = auth.uid()
    and status = 'pending'
    and awaiting_response_from = 'seller'
    and exists (
      select 1 from public.products op
      where op.id = offered_product_id and op.status = 'active' and op.seller_id = auth.uid()
    )
    and exists (
      select 1 from public.products lp
      where lp.id = listing_product_id and lp.status = 'active' and lp.seller_id = seller_id
    )
  );

-- Só quem tem a vez de responder pode atualizar, e só enquanto está
-- pendente (aceito/recusado/cancelado viram imutáveis pela policy, já que
-- o USING deixa de bater assim que o status sai de 'pending').
create policy "trade_offers_update_on_turn" on public.trade_offers
  for update
  using (
    status = 'pending'
    and (
      (buyer_id = auth.uid() and awaiting_response_from = 'buyer')
      or (seller_id = auth.uid() and awaiting_response_from = 'seller')
    )
  )
  with check (
    buyer_id = auth.uid() or seller_id = auth.uid()
  );

-- RLS sozinha não impede reescrever quem são as partes/produtos da
-- negociação numa atualização (WITH CHECK só valida a linha nova
-- isoladamente); trigger garante que isso é sempre imutável após a
-- criação.
create function public.trade_offers_prevent_reassign()
returns trigger as $$
begin
  if new.buyer_id <> old.buyer_id
    or new.seller_id <> old.seller_id
    or new.listing_product_id <> old.listing_product_id
    or new.offered_product_id <> old.offered_product_id
  then
    raise exception 'Não é permitido alterar os participantes ou produtos de uma negociação existente.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trade_offers_prevent_reassign_trg
  before update on public.trade_offers
  for each row execute procedure public.trade_offers_prevent_reassign();
