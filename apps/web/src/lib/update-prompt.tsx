"use client";

import { useEffect, useState } from "react";

export function UpdatePrompt() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Só considera "nova versão" se a aba já estava sendo controlada por um
    // service worker quando carregou — a primeira ativação (instalação
    // inicial do PWA) também dispara "controllerchange", mas isso não é uma
    // atualização de verdade.
    const hadControllerAtLoad = !!navigator.serviceWorker.controller;

    function onControllerChange() {
      if (hadControllerAtLoad) setAvailable(true);
    }
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    // O navegador só rechecka o sw.js de vez em quando por conta própria —
    // como o app instalado costuma ficar aberto/em segundo plano por muito
    // tempo, força a checagem sempre que a aba volta a ficar visível/focada.
    function checkForUpdate() {
      navigator.serviceWorker.getRegistration().then((reg) => reg?.update().catch(() => {}));
    }
    checkForUpdate();

    function onVisibilityChange() {
      if (document.visibilityState === "visible") checkForUpdate();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", checkForUpdate);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", checkForUpdate);
    };
  }, []);

  if (!available) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-[100] flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2.5 shadow-elevated">
        <span className="text-sm text-foreground">Nova versão disponível</span>
        <button
          onClick={() => window.location.reload()}
          className="rounded-full bg-gradient-to-r from-brand to-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow"
        >
          Atualizar
        </button>
      </div>
    </div>
  );
}
