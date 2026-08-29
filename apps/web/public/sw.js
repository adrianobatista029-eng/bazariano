// Service worker mínimo — só o necessário pra satisfazer o critério de
// instalação do Chrome (manifest + SW registrado com um handler de "fetch").
// Sem cache offline por enquanto, é o passthrough puro.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
