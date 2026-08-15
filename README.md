# Marketplace com Entregadores

Monorepo com 2 aplicativos compartilhando o mesmo backend Supabase:

| App | Pasta | Stack | Para quem |
|---|---|---|---|
| Web | `apps/web` | Next.js 14 | Comprador/vendedor + painel admin (em `/admin`) |
| Mobile Entregador | `apps/mobile-entregador` | React Native CLI (bare) | Entregador |

O painel administrativo não é um app separado — vive dentro do `apps/web`, nas rotas `/admin/*`.
O middleware (`apps/web/src/middleware.ts`) exige sessão autenticada **e** `role = 'admin'` no
perfil pra liberar essas rotas; qualquer outro usuário que tentar acessar é redirecionado para
`/produtos`. O link "Admin" no menu só aparece pra quem tem esse papel.

O app do entregador é nativo (não web) porque precisa de GPS em background e, futuramente,
overlay sobre outros apps — recursos que não existem em navegador. Veja
[`apps/mobile-entregador/README.md`](apps/mobile-entregador/README.md) para o setup nativo.

## Estrutura

```
apps/
  web/                 Next.js — marketplace (comprador/vendedor) + /admin/* (painel admin)
  mobile-entregador/    React Native — app do entregador
packages/
  supabase/             Cliente Supabase + tipos + queries compartilhadas
  ui/                     Componentes React compartilhados
  config/                  tsconfig base compartilhado
supabase/
  migrations/            SQL do schema + RLS
  seed.sql
```

## 1. Criar o projeto Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (ou rode local com `supabase start`,
   requer a [CLI do Supabase](https://supabase.com/docs/guides/cli)).
2. Aplique as migrations:
   ```bash
   supabase link --project-ref <seu-project-ref>
   supabase db push
   ```
   Isso roda `supabase/migrations/`, que cria as tabelas, triggers e políticas RLS.
3. Copie a **Project URL** e a **anon/publishable key** em Project Settings → API Keys.

## 2. Instalar dependências

```bash
pnpm install
```

## 3. Configurar variáveis de ambiente

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile-entregador/.env.example apps/mobile-entregador/.env
```

Preencha `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (e `SUPABASE_URL` /
`SUPABASE_ANON_KEY` no mobile) com os valores do passo 1. Preencha também
`NEXT_PUBLIC_MAPBOX_TOKEN` / `MAPBOX_ACCESS_TOKEN` com um token do
[Mapbox](https://account.mapbox.com/access-tokens/).

## 4. Rodar em desenvolvimento

```bash
pnpm dev       # sobe o web (porta 3000) via Turborepo
pnpm dev:web    # equivalente, explícito
```

Para o app do entregador, siga o setup nativo em
[`apps/mobile-entregador/README.md`](apps/mobile-entregador/README.md) (precisa gerar as
pastas `android/`/`ios/` uma única vez com o CLI oficial do React Native).

## 5. Criar os primeiros usuários

1. Crie contas normalmente pela tela de login do `apps/web` (email/senha).
2. No Supabase Studio → Table Editor → `profiles`, promova um usuário a admin:
   ```sql
   update public.profiles set role = 'admin' where id = '<uuid-do-usuario>';
   ```
   O link "Admin" aparece no menu e as rotas `/admin/*` ficam liberadas pra essa conta.
3. Para um entregador, marque `role = 'courier'` e crie a linha correspondente em `couriers`:
   ```sql
   update public.profiles set role = 'courier' where id = '<uuid-do-usuario>';
   insert into public.couriers (id, approved, status) values ('<uuid-do-usuario>', true, 'offline');
   ```
   (o painel admin em `/admin/entregadores` também aprova cadastros de entregador manualmente).

## Fluxo ponta a ponta para testar

1. Vendedor faz login em `apps/web` → `/vender` → publica um produto.
2. Comprador (outra conta) → `/produtos` → abre o produto → "Comprar" → informa endereço.
3. Entregador → app mobile → aceita o pedido em "Pedidos disponíveis".
4. Entregador avança o status (Coletado → Em entrega) — a localização é enviada
   automaticamente via GPS para `courier_locations`.
5. Comprador → `/pedidos/[id]/rastrear` no `apps/web` → vê o pino do entregador se mover no
   mapa em tempo real (Supabase Realtime).
6. Admin → `/admin` no mesmo `apps/web` → acompanha tudo em `/admin/pedidos`,
   `/admin/produtos`, `/admin/usuarios`, `/admin/entregadores`.

## Escopo fora da v1

- Pagamento (checkout/gateway) não está implementado — os pedidos são criados sem cobrança.
- O overlay do app do entregador sobre outros aplicativos é um stub documentado, pendente de
  módulo nativo Android (ver README do mobile).
