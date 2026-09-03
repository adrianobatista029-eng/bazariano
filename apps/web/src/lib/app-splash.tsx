"use client";

import { useEffect, useState } from "react";

const SESSION_FLAG = "app-splash-shown";
const ANIMATION_MS = 2600;

// Só toca no PWA instalado (modo standalone), e só uma vez por processo do
// app — o sessionStorage some quando o app é encerrado de verdade (fechado
// no app-switcher ou morto pelo sistema), então reabrir do zero mostra o
// splash de novo, mas sair sem fechar e voltar não repete.
export function AppSplash() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!isStandalone) return;

    let alreadyShown = false;
    try {
      alreadyShown = sessionStorage.getItem(SESSION_FLAG) === "1";
      if (!alreadyShown) sessionStorage.setItem(SESSION_FLAG, "1");
    } catch {
      return;
    }
    if (alreadyShown) return;

    setVisible(true);
    const timer = setTimeout(() => setVisible(false), ANIMATION_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="app-splash-overlay fixed inset-0 z-[200] flex items-center justify-center bg-background">
      <div className="app-splash-wrap relative h-40 w-40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/splash-compass.png"
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/splash-arrows.png"
          alt=""
          className="app-splash-arrows absolute inset-0 h-full w-full object-contain"
        />
      </div>
    </div>
  );
}
