# App do Entregador (React Native CLI / bare)

Este pacote contém apenas o código-fonte JS/TS (`src/`, `App.tsx`, `index.js`). As pastas
nativas `android/` e `ios/` **não são geradas por este scaffold** — elas precisam ser criadas
uma vez pelo gerador oficial do React Native, porque envolvem projetos Xcode/Gradle binários
que não fazem sentido escrever à mão.

## Setup inicial (rodar uma vez)

```bash
npx @react-native-community/cli@latest init MobileEntregador --version 0.75.4 --skip-install
```

Isso cria um projeto temporário só para copiar as pastas nativas:

```bash
cp -r MobileEntregador/android apps/mobile-entregador/android
cp -r MobileEntregador/ios apps/mobile-entregador/ios
rm -rf MobileEntregador
```

Depois, na raiz do monorepo:

```bash
pnpm install
cd apps/mobile-entregador
cp .env.example .env   # preencha SUPABASE_URL, SUPABASE_ANON_KEY, MAPBOX_ACCESS_TOKEN
npx pod-install ios    # apenas macOS, para iOS
pnpm android           # ou pnpm ios
```

## Permissões necessárias (Android)

Adicione em `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
```

E configure o token do Mapbox conforme a doc do `@rnmapbox/maps` (bloco `mapbox { ... }` no
`android/build.gradle` + `RNMapboxMapsImpl` na versão do SDK).

## Overlay sobre outros apps (pendência da v1)

O pedido original menciona um overlay flutuante do app do entregador sobre outros aplicativos
(como o widget de navegação do iFood/Uber). Isso exige um **módulo nativo Android** usando a
permissão `SYSTEM_ALERT_WINDOW` e a API `WindowManager.addView`, que só existe depois que as
pastas `android/` forem geradas (passo acima). Não é implementável em React Native puro nem
em Expo gerenciado.

Próximos passos quando for implementar:
1. Criar `android/app/src/main/java/.../OverlayModule.kt` como um `NativeModule` que expõe
   `showOverlay()` / `hideOverlay()` para o JS via `NativeModules.OverlayModule`.
2. Pedir a permissão especial em runtime com
   `Settings.canDrawOverlays(context)` / `Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)`.
3. Publicar a build na Play Store como "restricted permission" (revisão manual da Google).

Até lá, o app funciona plenamente sem overlay: todas as telas (login, pedidos disponíveis,
mapa de entrega, atualização de status) já estão implementadas em `src/`.
