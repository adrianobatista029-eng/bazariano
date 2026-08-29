"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // silencioso — não é crítico se falhar (ex: navegador sem suporte)
      });
    }
  }, []);

  return null;
}
