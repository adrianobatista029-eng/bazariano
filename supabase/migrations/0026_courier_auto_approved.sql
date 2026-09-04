-- Por enquanto não tem processo de aprovação manual rodando de verdade (o
-- admin só tem a tela pra aprovar, mas ninguém está usando) — deixa todo
-- entregador novo já nascer aprovado, e libera quem já tinha cadastrado.
alter table public.couriers alter column approved set default true;

update public.couriers set approved = true where approved = false;
