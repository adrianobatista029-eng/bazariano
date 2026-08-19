"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/lib/theme-toggle";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { error: authError } =
      mode === "sign_in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    router.push(searchParams.get("redirectTo") ?? "/produtos");
    router.refresh();
  }

  return (
    <div className="grid-compass relative flex min-h-screen items-center justify-center bg-background px-4">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-sm">
        <Link href="/produtos" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand font-bold text-brand-foreground shadow-glow">
            A
          </div>
          <span className="font-display text-xl font-bold text-foreground">AllRotaHub</span>
        </Link>

        <div className="surface-panel p-8">
          <h1 className="mb-6 text-xl font-semibold text-foreground">
            {mode === "sign_in" ? "Entrar" : "Criar conta"}
          </h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-input bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-input bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-xl bg-gradient-to-r from-brand to-primary px-4 py-3 font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {loading ? "Aguarde..." : mode === "sign_in" ? "Entrar" : "Criar conta"}
            </button>
          </form>
          <button
            className="mt-4 w-full text-center text-sm text-brand underline"
            onClick={() => setMode(mode === "sign_in" ? "sign_up" : "sign_in")}
          >
            {mode === "sign_in" ? "Não tem conta? Criar uma" : "Já tem conta? Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
