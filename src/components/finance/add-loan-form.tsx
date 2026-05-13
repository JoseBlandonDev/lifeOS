"use client";

import { useState, useTransition } from "react";
import { Plus, ArrowDown, ArrowUp } from "lucide-react";
import { addLoan } from "@/app/actions/finance";
import { AmountInput } from "./amount-input";
import { cn } from "@/lib/utils";

export function AddLoanForm() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"receivable" | "debt">("receivable");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    formData.set("kind", kind);
    start(async () => {
      const r = await addLoan(formData);
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
        <Plus className="h-4 w-4" /> Nuevo préstamo
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
          onClick={() => setKind("receivable")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition",
            kind === "receivable"
              ? "bg-emerald-500/20 text-emerald-200"
              : "text-zinc-500 hover:text-zinc-300",
          )}
        >
          <ArrowUp className="h-3.5 w-3.5" /> Me deben
        </button>
        <button
          type="button"
          onClick={() => setKind("debt")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition",
            kind === "debt"
              ? "bg-rose-500/20 text-rose-200"
              : "text-zinc-500 hover:text-zinc-300",
          )}
        >
          <ArrowDown className="h-3.5 w-3.5" /> Yo debo
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          name="counterparty"
          required
          placeholder={kind === "receivable" ? "¿Quién te debe?" : "¿A quién le debes?"}
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
        />
        <AmountInput name="original_amount" required placeholder="Monto" />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          name="due_date"
          type="date"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
        />
        <input
          name="note"
          placeholder="Nota (opcional)"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
        />
      </div>

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
          disabled={pending}
          className="rounded-lg bg-violet-500/90 px-4 py-2 text-xs font-medium text-white hover:bg-violet-400 disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}
