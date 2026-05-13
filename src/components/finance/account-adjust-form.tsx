"use client";

import { useState, useTransition } from "react";
import { Minus, Plus, SlidersHorizontal, X } from "lucide-react";
import { adjustAccountBalance } from "@/app/actions/finance";
import { AmountInput } from "./amount-input";
import { cn } from "@/lib/utils";

export function AccountAdjustForm({
  accountId,
  accountName,
}: {
  accountId: string;
  accountName: string;
}) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    formData.set("account_id", accountId);
    formData.set("direction", direction);
    start(async () => {
      const r = await adjustAccountBalance(formData);
      if (r && !r.ok) setError(r.message);
      else setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md p-1 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
        aria-label="Ajustar saldo"
        title="Depositar o retirar sin registrar ingreso/gasto"
      >
        <SlidersHorizontal className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form
        action={submit}
        className="w-full max-w-md space-y-3 rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-100">
              Ajustar saldo
            </h3>
            <p className="text-xs text-zinc-500">
              {accountName} — sin afectar ingresos ni gastos
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 rounded-xl bg-black/40 p-1">
          <button
            type="button"
            onClick={() => setDirection("in")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition",
              direction === "in"
                ? "bg-emerald-500/20 text-emerald-200"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            <Plus className="h-3.5 w-3.5" /> Depositar
          </button>
          <button
            type="button"
            onClick={() => setDirection("out")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition",
              direction === "out"
                ? "bg-rose-500/20 text-rose-200"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            <Minus className="h-3.5 w-3.5" /> Retirar
          </button>
        </div>

        <AmountInput name="amount" required placeholder="Cuánto" />

        <input
          name="occurred_on"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
        />

        <input
          name="note"
          placeholder="Nota (opcional). Ej: cambio de moneda, dinero en efectivo encontrado…"
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
        />

        {error && (
          <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-violet-500/90 px-4 py-2 text-xs font-medium text-white hover:bg-violet-400 disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Confirmar"}
          </button>
        </div>
      </form>
    </div>
  );
}
