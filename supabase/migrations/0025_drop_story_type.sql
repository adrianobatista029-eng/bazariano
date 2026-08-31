-- Remove a etiqueta de tipo de conteúdo do story (produto/vídeo/promoção/
-- entrega/local) — decisão de simplificar o Stories de volta, sem a
-- seleção obrigatória antes de postar.
alter table public.stories drop column if exists story_type;
