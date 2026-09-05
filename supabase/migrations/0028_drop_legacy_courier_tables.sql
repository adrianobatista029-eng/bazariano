-- ============================================================
-- Remove as tabelas/funções de entregador deste banco (obsoletas desde a
-- separação pro projeto próprio — ver 0027_courier_bridge.sql)
-- ============================================================
-- Ordem importa: courier_locations tem FK pra couriers, e
-- register_as_courier() insere em couriers — os três têm que sair antes da
-- tabela em si.
drop table if exists public.courier_locations;

drop function if exists public.register_as_courier(text, text);

drop table if exists public.couriers;

-- Nada mais usa esse enum depois que a tabela couriers foi embora.
drop type if exists courier_status;
