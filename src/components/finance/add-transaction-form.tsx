"use client";

import { useState, useTransition } from "react";
import { ArrowDownCircle, ArrowUpCircle, Plus } from "lucide-react";
import { addTransaction } from "@/app/actions/finance";
import { AmountInput } from "./amount-input";
import { cn } from "@/lib/utils";

type Account = { id: string; name: string; type: string };
type BudgetOpt = { id: string; label: string };

export function AddTransactionForm({
  accounts,
  expenseBudgetItems = [],
}: {
  accounts: Account[];
  expenseBudgetItems?: BudgetOpt[];
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    formData.set("type", type);
    start(async () => {
      const r = await addTransaction(formData);
      if (!r.ok) setError(r.message);
      else setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-violet-500/90 px-3 py-2 text-sm font-medium text-white hover:bg-violet-400"
      >
        <Plus className="h-4 w-4" /> Nuevo movimiento
      </button>
    );
  }

  return (
    <form
      action={submit}
      className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-4"
    >
      <div className="flex gap-1 rounded-xl bg-black/40 p-1">
        <button
          type="button"
          onClick={() => setType("expense")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition",
            type === "expense"
              ? "bg-rose-500/20 text-rose-200"
              : "text-zinc-500 hover:text-zinc-300",
          )}
        >
          <ArrowDownCircle className="h-3.5 w-3.5" /> Gasto
        </button>
        <button
          type="button"
          onClick={() => setType("income")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition",
            type === "income"
              ? "bg-emerald-500/20 text-emerald-200"
              : "text-zinc-500 hover:text-zinc-300",
          )}
        >
          <ArrowUpCircle className="h-3.5 w-3.5" /> Ingreso
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <AmountInput name="amount" required placeholder="Importe" />
        <input
          name="occurred_on"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <select
          name="account_id"
          required
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
        >
          <option value="" className="bg-zinc-900">
            Selecciona cuenta…
          </option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id} className="bg-zinc-900">
              {a.name} ·{" "}
              {a.type === "bank" ? "Banco" : a.type === "cash" ? "Efectivo" : "Ahorro"}
            </option>
          ))}
        </select>
        <input
          name="category"
          placeholder="Categoría (opcional)"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
        />
      </div>

      {type === "expense" && expenseBudgetItems.length > 0 && (
        <div>
          <label className="mb-1 block text-[11px] text-zinc-500">
            Gasto ligado al presupuesto (opcional)
          </label>
          <select
            name="budget_item_id"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
            defaultValue=""
          >
            <option value="" className="bg-zinc-900">
              Sin enlace — solo resta del saldo
            </option>
            {expenseBudgetItems.map((b) => (
              <option key={b.id} value={b.id} className="bg-zinc-900">
                {b.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-zinc-600">
            Si eliges una línea (ej. corte de pelo), el monto también baja del
            “sobre” de ese ítem.
          </p>
        </div>
      )}

      <input
        name="note"
        placeholder="Descripción"
        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
      />

      {error && (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending || accounts.length === 0}
          className="rounded-lg bg-violet-500/90 px-4 py-2 text-xs font-medium text-white hover:bg-violet-400 disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}
