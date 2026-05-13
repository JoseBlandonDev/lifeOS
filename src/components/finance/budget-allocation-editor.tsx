"use client";

import { useState, useTransition } from "react";
import { Pencil, X } from "lucide-react";
import { updateBudgetAllocation } from "@/app/actions/finance";
import { AmountInput } from "./amount-input";

type Account = { id: string; name: string };

export function BudgetAllocationEditor({
  allocationId,
  accountId,
  amount,
  occurredOn,
  note,
  accounts,
}: {
  allocationId: string;
  accountId: string | null;
  amount: number;
  occurredOn: string;
  note: string | null;
  accounts: Account[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    formData.set("id", allocationId);
    start(async () => {
      const r = await updateBudgetAllocation(formData);
      if (!r.ok) setError(r.message);
      else setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md p-1 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
        aria-label="Editar reserva"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            action={submit}
            className="w-full max-w-md space-y-3 rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-zinc-100">
                  Editar / mover reserva
                </h3>
                <p className="text-xs text-zinc-500">
                  Cambia cuenta o monto reservado de este ítem.
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

            <AmountInput
              name="amount"
              required
              defaultValue={String(Math.abs(amount))}
              placeholder="Monto reservado"
            />

            <div className="grid gap-2 sm:grid-cols-2">
              <select
                name="account_id"
                required
                defaultValue={accountId ?? ""}
                className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
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
                defaultValue={occurredOn}
                className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
              />
            </div>

            <input
              name="note"
              defaultValue={note ?? ""}
              placeholder="Nota (opcional)"
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
                disabled={pending}
                className="rounded-lg bg-violet-500/90 px-4 py-2 text-xs font-medium text-white hover:bg-violet-400 disabled:opacity-50"
              >
                {pending ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

