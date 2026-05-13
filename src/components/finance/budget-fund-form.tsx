"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { fundBudgetItem } from "@/app/actions/finance";
import { AmountInput } from "./amount-input";
import { cn } from "@/lib/utils";

type Account = { id: string; name: string };

export function BudgetFundForm({
  budgetItemId,
  budgetItemLabel,
  accounts,
  initialDirection = "in",
  trigger,
}: {
  budgetItemId: string;
  budgetItemLabel: string;
  accounts: Account[];
  initialDirection?: "in" | "out";
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<"in" | "out">(initialDirection);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function submit(formData: FormData) {
    setError(null);
    formData.set("budget_item_id", budgetItemId);
    formData.set("direction", direction);
    start(async () => {
      const r = await fundBudgetItem(formData);
      if (r && !r.ok) setError(r.message);
      else setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDirection(initialDirection);
          setOpen(true);
        }}
        className="rounded-md p-1 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
      >
        {trigger}
      </button>

      {open &&
        mounted &&
        createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            action={submit}
            className="w-full max-w-md space-y-3 rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-zinc-100">
                  {direction === "in" ? "Fondear" : "Retirar de"} {budgetItemLabel}
                </h3>
                <p className="text-xs text-zinc-500">
                  Reserva (o libera) parte del saldo de una cuenta para este ítem.
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
                <ArrowUp className="h-3.5 w-3.5" /> Aportar
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
                <ArrowDown className="h-3.5 w-3.5" /> Retirar
              </button>
            </div>

            <AmountInput name="amount" required placeholder="Monto" />

            <div className="grid gap-2 sm:grid-cols-2">
              <select
                name="account_id"
                required
                className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
                defaultValue=""
              >
                <option value="" className="bg-zinc-900">
                  Selecciona cuenta…
                </option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id} className="bg-zinc-900">
                    {a.name}
                  </option>
                ))}
              </select>
              <input
                name="occurred_on"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
              />
            </div>

            <input
              name="note"
              placeholder="Nota (opcional)"
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
      , document.body)}
    </>
  );
}
