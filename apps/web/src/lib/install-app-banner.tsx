"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "installBannerDismissed";

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

export function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISSED_KEY) === "1") return;
    setDismissed(false);

    if (isIOS()) {
      setShowIosInstructions(true);
      return;
    }

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function dismiss() {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, "1");
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") dismiss();
    setDeferredPrompt(null);
  }

  if (dismissed) return null;
  if (!showIosInstructions && !deferredPrompt) return null;

  return (
    <div className="mb-6 flex w-full items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3">
      <div className="text-sm text-foreground">
        <p className="font-medium">📱 Instale o AllRotaHub</p>
        <p className="text-xs text-muted-foreground">
          {showIosInstructions
            ? "Toque em Compartilhar e depois em \"Adicionar à Tela de Início\"."
            : "Tenha acesso rápido pelo celular."}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!showIosInstructions && (
          <button
            type="button"
            onClick={handleInstall}
            className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
          >
            Instalar
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dispensar"
          className="text-muted-foreground hover:text-foreground"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/letra-x.png" alt="" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
