"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "installModalDismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

// Tablet/celular de qualquer marca — cobre o que o isIOS() não pega.
function isMobileDevice() {
  return /android|iphone|ipad|ipod|mobile/i.test(window.navigator.userAgent);
}

export function InstallAppModal() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (!isMobileDevice()) return;
    if (localStorage.getItem(DISMISSED_KEY) === "1") return;

    if (isIOS()) {
      setShowIosInstructions(true);
      setOpen(true);
      return;
    }

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setOpen(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function dismiss() {
    setOpen(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") dismiss();
    setDeferredPrompt(null);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-card p-6 text-center shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/splash-compass.png" alt="" className="mx-auto h-20 w-20" />
        <h3 className="mt-3 text-lg font-bold text-foreground">Instale o Bazariano</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {showIosInstructions
            ? 'Toque em Compartilhar e depois em "Adicionar à Tela de Início" para instalar o app.'
            : "Instale o app pra ter acesso rápido e uma experiência melhor no celular."}
        </p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={dismiss}
            className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-medium text-foreground"
          >
            Agora não
          </button>
          {!showIosInstructions && (
            <button
              onClick={handleInstall}
              className="flex-1 rounded-xl bg-gradient-to-r from-brand to-primary py-2.5 text-sm font-bold text-primary-foreground shadow-glow"
            >
              Instalar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
