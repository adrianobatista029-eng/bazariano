"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/lib/theme-toggle";
import { formatCPF, isValidCPF } from "@/lib/cpf";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "sign_up" && !isValidCPF(cpf)) {
      setError("CPF inválido. Confira os números digitados.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: authError } =
      mode === "sign_in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName.trim(), cpf: cpf.replace(/\D/g, "") } },
          });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    const redirectTo = searchParams.get("redirectTo");
    router.push(
      redirectTo ?? (mode === "sign_up" ? "/produtos?welcome=1" : "/produtos")
    );
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[#0c1626] md:items-center md:justify-center">
      {/* No mobile a imagem é larga demais pra cobrir a tela sem cortar um
          bocado — em vez de recortar, mostra ela inteira como um banner no
          topo (altura natural). No desktop ela estica pra preencher a tela
          toda de lado a lado, sem sobrar tarja escura nenhuma. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/auth-bg.jpg"
        alt=""
        className="w-full object-contain md:absolute md:inset-0 md:h-full md:w-full md:object-fill"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-full bg-gradient-to-b from-black/35 via-black/25 to-black/45 md:block" />
      <ThemeToggle className="absolute right-4 top-4 z-10" />
      <div className="flex flex-1 flex-col items-center px-4 pb-8 pt-5 md:flex-none md:justify-center md:px-4 md:py-0">
      <div className="w-full max-w-sm">
        <div className="surface-panel bg-card/90 p-8 shadow-elevated backdrop-blur-md">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground">
              {mode === "sign_in" ? "Entrar" : "Criar conta"}
            </h1>
            <Link
              href="/produtos"
              aria-label="Sair sem completar"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/letra-x.png" alt="" className="h-4 w-4" />
            </Link>
          </div>
          {searchParams.get("accountDeleted") && (
            <p className="mb-4 rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground">
              Sua conta foi apagada com sucesso.
            </p>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === "sign_up" && (
              <>
                <input
                  type="text"
                  required
                  placeholder="Nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="rounded-xl border border-input bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  placeholder="CPF"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  maxLength={14}
                  className="rounded-xl border border-input bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </>
            )}
            <input
              type="email"
              required
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-input bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-input bg-secondary px-4 py-3 pr-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
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
    </div>
  );
}
