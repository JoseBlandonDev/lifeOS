"use client";

import { useState, useTransition } from "react";
import { LogIn, UserPlus, Sparkles } from "lucide-react";
import { login, signup } from "@/app/actions/auth";

type ActionResult = { error?: string; success?: boolean; message?: string };

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const action = isLogin ? login : signup;
      const res = (await action(formData)) as ActionResult | undefined;
      if (res?.error) {
        setError(res.error);
      } else if (res?.success) {
        setInfo(res.message ?? "Listo.");
      }
    });
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-950 p-4">
      <div className="glass-panel w-full max-w-md rounded-2xl p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <p className="mb-2 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-widest text-violet-400/90">
            <Sparkles className="h-3.5 w-3.5" />
            Joseproject
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            {isLogin ? "Iniciar sesión" : "Crear cuenta"}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Tus finanzas, asignaturas y notas, sincronizadas y privadas.
          </p>
        </div>

        <form action={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
              minLength={6}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              placeholder="•••••••• (mínimo 6 caracteres)"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-300">
              {error}
            </div>
          )}
          {info && (
            <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500/90 py-2.5 font-medium text-white transition hover:bg-violet-400 disabled:opacity-50"
          >
            {isLogin ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            {pending ? "Procesando…" : isLogin ? "Entrar" : "Registrarme"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-zinc-400">
            {isLogin ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
          </span>
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setInfo(null);
            }}
            className="font-medium text-violet-400 hover:text-violet-300"
          >
            {isLogin ? "Regístrate gratis" : "Inicia sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}
