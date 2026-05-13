"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { addInvestment } from "@/app/actions/finance";
import { AmountInput } from "./amount-input";

const KINDS: { value: string; label: string }[] = [
  { value: "cdt", label: "CDT / plazo fijo" },
  { value: "fund", label: "Fondo / ETF" },
  { value: "stock", label: "Acciones" },
  { value: "crypto", label: "Cripto" },
  { value: "real_estate", label: "Inmueble" },
  { value: "business", label: "Negocio" },
  { value: "other", label: "Otro" },
];

type Account = { id: string; name: string };

export function AddInvestmentForm({ accounts }: { accounts: Account[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    start(async () => {
      const r = await addInvestment(formData);
      if (!r.ok) setError(r.message);
      else setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-cyan-500/90 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-400"
      >
        <Plus className="h-4 w-4" /> Nueva inversión
      </button>
    );
  }

  return (
    <form
      action={submit}
      className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-4"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          name="name"
          required
          placeholder="Nombre (ej. CDT Bancolombia)"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none"
        />
        <select
          name="kind"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
        >
          {KINDS.map((k) => (
            <option key={k.value} value={k.value} className="bg-zinc-900">
              {k.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <AmountInput name="invested_amount" placeholder="Dinero invertido" />
        <AmountInput
          name="current_value"
          placeholder="Valor hoy (si no, igual al invertido)"
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          name="color"
          type="color"
          defaultValue="#22d3ee"
          className="h-10 w-full cursor-pointer rounded-lg border border-white/10 bg-black/40"
        />
        <select
          name="account_id"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
          defaultValue=""
        >
          <option value="" className="bg-zinc-900">
            Cuenta relacionada (opcional)
          </option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id} className="bg-zinc-900">
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <input
        name="note"
        placeholder="Nota (vencimiento, tasa…)"
        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
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
          className="rounded-lg bg-cyan-500/90 px-4 py-2 text-xs font-medium text-white hover:bg-cyan-400 disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Añadir"}
        </button>
      </div>
    </form>
  );
}
