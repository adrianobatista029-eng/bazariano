"use client";

import { useEffect, useState } from "react";

export function ThemeToggle({
  className = "",
  size = "h-9 w-9 text-lg",
}: {
  className?: string;
  size?: string;
}) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={isDark ? "Tema claro" : "Tema escuro"}
      className={
        `flex ${size} items-center justify-center rounded-full border border-border bg-secondary text-foreground transition-colors hover:bg-muted ` +
        className
      }
    >
      <span className="icon-crisp">{isDark ? "☀️" : "🌙"}</span>
    </button>
  );
}
