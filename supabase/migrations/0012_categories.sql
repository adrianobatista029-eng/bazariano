-- Taxonomia de categorias/subcategorias como tabelas de verdade (não lista
-- fixa no código) — permite contar/filtrar produtos por categoria e, no
-- futuro, um admin gerenciar isso sem precisar de deploy.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (category_id, name)
);

create index subcategories_category_id_idx on public.subcategories (category_id);

alter table public.categories enable row level security;
create policy "categories_select_all" on public.categories for select using (true);

alter table public.subcategories enable row level security;
create policy "subcategories_select_all" on public.subcategories for select using (true);

alter table public.products add column category_id uuid references public.categories (id) on delete set null;
alter table public.products add column subcategory_id uuid references public.subcategories (id) on delete set null;
create index products_category_id_idx on public.products (category_id);
create index products_subcategory_id_idx on public.products (subcategory_id);

insert into public.categories (name, sort_order) values
  ('Eletrônicos', 1),
  ('Móveis', 2),
  ('Casa e Decoração', 3),
  ('Eletrodomésticos', 4),
  ('Moda', 5),
  ('Automóveis', 6),
  ('Casa e Construção', 7),
  ('Informática', 8),
  ('Games', 9),
  ('Esportes e Lazer', 10),
  ('Bebês e Crianças', 11),
  ('Livros e Educação', 12),
  ('Colecionáveis', 13),
  ('Instrumentos Musicais', 14),
  ('Beleza e Cuidados Pessoais', 15),
  ('Pet', 16),
  ('Ferramentas e Máquinas', 17),
  ('Celulares e Acessórios', 18),
  ('Trabalho e Escritório', 19),
  ('Outros', 20);

with cat as (select id, name from public.categories)
insert into public.subcategories (category_id, name, sort_order)
select cat.id, v.name, v.sort_order
from (values
  ('Eletrônicos','Celulares',1),
  ('Eletrônicos','Tablets',2),
  ('Eletrônicos','Notebooks',3),
  ('Eletrônicos','Computadores',4),
  ('Eletrônicos','Monitores',5),
  ('Eletrônicos','TVs',6),
  ('Eletrônicos','Videogames',7),
  ('Eletrônicos','Câmeras',8),
  ('Eletrônicos','Fones e caixas de som',9),
  ('Eletrônicos','Acessórios',10),
  ('Eletrônicos','Outros',11),

  ('Móveis','Sofás',1),
  ('Móveis','Camas',2),
  ('Móveis','Mesas',3),
  ('Móveis','Cadeiras',4),
  ('Móveis','Armários',5),
  ('Móveis','Estantes',6),
  ('Móveis','Guarda-roupas',7),
  ('Móveis','Móveis de escritório',8),
  ('Móveis','Outros',9),

  ('Casa e Decoração','Decoração',1),
  ('Casa e Decoração','Tapetes',2),
  ('Casa e Decoração','Cortinas',3),
  ('Casa e Decoração','Iluminação',4),
  ('Casa e Decoração','Utensílios domésticos',5),
  ('Casa e Decoração','Organização',6),
  ('Casa e Decoração','Jardim',7),
  ('Casa e Decoração','Ferramentas domésticas',8),
  ('Casa e Decoração','Outros',9),

  ('Eletrodomésticos','Geladeiras',1),
  ('Eletrodomésticos','Freezers',2),
  ('Eletrodomésticos','Máquinas de lavar',3),
  ('Eletrodomésticos','Micro-ondas',4),
  ('Eletrodomésticos','Fogões',5),
  ('Eletrodomésticos','Air fryers',6),
  ('Eletrodomésticos','Aspiradores',7),
  ('Eletrodomésticos','Ventiladores',8),
  ('Eletrodomésticos','Ar-condicionado',9),
  ('Eletrodomésticos','Outros',10),

  ('Moda','Roupas masculinas',1),
  ('Moda','Roupas femininas',2),
  ('Moda','Roupas infantis',3),
  ('Moda','Calçados',4),
  ('Moda','Bolsas',5),
  ('Moda','Mochilas',6),
  ('Moda','Acessórios',7),
  ('Moda','Relógios',8),
  ('Moda','Óculos',9),
  ('Moda','Outros',10),

  ('Automóveis','Carros',1),
  ('Automóveis','Motos',2),
  ('Automóveis','Caminhões',3),
  ('Automóveis','Peças automotivas',4),
  ('Automóveis','Pneus',5),
  ('Automóveis','Rodas',6),
  ('Automóveis','Acessórios',7),
  ('Automóveis','Som automotivo',8),
  ('Automóveis','Outros',9),

  ('Casa e Construção','Materiais de construção',1),
  ('Casa e Construção','Ferramentas',2),
  ('Casa e Construção','Elétrica',3),
  ('Casa e Construção','Hidráulica',4),
  ('Casa e Construção','Tintas',5),
  ('Casa e Construção','Pisos e revestimentos',6),
  ('Casa e Construção','Portas e janelas',7),
  ('Casa e Construção','Outros',8),

  ('Informática','PCs',1),
  ('Informática','Componentes',2),
  ('Informática','Placas de vídeo',3),
  ('Informática','Processadores',4),
  ('Informática','Memórias',5),
  ('Informática','SSDs',6),
  ('Informática','HDs',7),
  ('Informática','Periféricos',8),
  ('Informática','Impressoras',9),
  ('Informática','Outros',10),

  ('Games','PlayStation',1),
  ('Games','Xbox',2),
  ('Games','Nintendo',3),
  ('Games','Jogos',4),
  ('Games','Controles',5),
  ('Games','Acessórios',6),
  ('Games','Cadeiras gamer',7),
  ('Games','Outros',8),

  ('Esportes e Lazer','Bicicletas',1),
  ('Esportes e Lazer','Skate',2),
  ('Esportes e Lazer','Equipamentos esportivos',3),
  ('Esportes e Lazer','Academia',4),
  ('Esportes e Lazer','Camping',5),
  ('Esportes e Lazer','Pesca',6),
  ('Esportes e Lazer','Instrumentos musicais',7),
  ('Esportes e Lazer','Hobbies',8),
  ('Esportes e Lazer','Outros',9),

  ('Bebês e Crianças','Carrinhos',1),
  ('Bebês e Crianças','Berços',2),
  ('Bebês e Crianças','Brinquedos',3),
  ('Bebês e Crianças','Roupas',4),
  ('Bebês e Crianças','Cadeiras infantis',5),
  ('Bebês e Crianças','Material escolar',6),
  ('Bebês e Crianças','Outros',7),

  ('Livros e Educação','Livros',1),
  ('Livros e Educação','Apostilas',2),
  ('Livros e Educação','Material escolar',3),
  ('Livros e Educação','Cursos físicos',4),
  ('Livros e Educação','Colecionáveis educacionais',5),
  ('Livros e Educação','Outros',6),

  ('Colecionáveis','Moedas',1),
  ('Colecionáveis','Cédulas',2),
  ('Colecionáveis','Cards',3),
  ('Colecionáveis','Figurinhas',4),
  ('Colecionáveis','Action figures',5),
  ('Colecionáveis','Brinquedos antigos',6),
  ('Colecionáveis','Antiguidades',7),
  ('Colecionáveis','Outros',8),

  ('Instrumentos Musicais','Violões',1),
  ('Instrumentos Musicais','Guitarras',2),
  ('Instrumentos Musicais','Teclados',3),
  ('Instrumentos Musicais','Baterias',4),
  ('Instrumentos Musicais','Microfones',5),
  ('Instrumentos Musicais','Amplificadores',6),
  ('Instrumentos Musicais','Equipamentos de áudio',7),
  ('Instrumentos Musicais','Outros',8),

  ('Beleza e Cuidados Pessoais','Cosméticos',1),
  ('Beleza e Cuidados Pessoais','Perfumes',2),
  ('Beleza e Cuidados Pessoais','Produtos para cabelo',3),
  ('Beleza e Cuidados Pessoais','Acessórios',4),
  ('Beleza e Cuidados Pessoais','Equipamentos de beleza',5),
  ('Beleza e Cuidados Pessoais','Outros',6),

  ('Pet','Roupas',1),
  ('Pet','Camas',2),
  ('Pet','Brinquedos',3),
  ('Pet','Acessórios',4),
  ('Pet','Aquários',5),
  ('Pet','Produtos para animais',6),
  ('Pet','Outros',7),

  ('Ferramentas e Máquinas','Furadeiras',1),
  ('Ferramentas e Máquinas','Parafusadeiras',2),
  ('Ferramentas e Máquinas','Serras',3),
  ('Ferramentas e Máquinas','Compressores',4),
  ('Ferramentas e Máquinas','Máquinas industriais',5),
  ('Ferramentas e Máquinas','Equipamentos profissionais',6),
  ('Ferramentas e Máquinas','Outros',7),

  ('Celulares e Acessórios','iPhone',1),
  ('Celulares e Acessórios','Samsung',2),
  ('Celulares e Acessórios','Motorola',3),
  ('Celulares e Acessórios','Xiaomi',4),
  ('Celulares e Acessórios','Capinhas',5),
  ('Celulares e Acessórios','Películas',6),
  ('Celulares e Acessórios','Carregadores',7),
  ('Celulares e Acessórios','Cabos',8),
  ('Celulares e Acessórios','Smartwatches',9),
  ('Celulares e Acessórios','Outros',10),

  ('Trabalho e Escritório','Mesas',1),
  ('Trabalho e Escritório','Cadeiras',2),
  ('Trabalho e Escritório','Impressoras',3),
  ('Trabalho e Escritório','Computadores',4),
  ('Trabalho e Escritório','Equipamentos comerciais',5),
  ('Trabalho e Escritório','Materiais de escritório',6),
  ('Trabalho e Escritório','Outros',7),

  ('Outros','Diversos',1)
) as v(category_name, name, sort_order)
join cat on cat.name = v.category_name;

-- Condição do produto: expande de 3 pra 4 níveis. Produtos que já estavam
-- com 'usado' (valor antigo) migram pra 'usado_bom' antes de travar a
-- constraint nova, senão a alteração falha nos que já existem.
update public.products set condition = 'usado_bom' where condition = 'usado';

alter table public.products drop constraint products_condition_check;
alter table public.products add constraint products_condition_check
  check (condition in ('novo', 'seminovo', 'usado_bom', 'usado_reparo'));

-- Tamanho do pacote (usado futuramente pra combinar com o veículo do
-- entregador — matching automático fica pra depois).
alter table public.products add column package_size text not null default 'medio'
  check (package_size in ('pequeno', 'medio', 'grande'));
