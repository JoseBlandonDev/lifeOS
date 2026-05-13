"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { addAccount } from "@/app/actions/finance";
import { AmountInput } from "./amount-input";

const TYPES = [
  { value: "bank", label: "Bancario", color: "#60a5fa" },
  { value: "cash", label: "Efectivo", color: "#34d399" },
  { value: "savings", label: "Ahorro", color: "#a78bfa" },
];

export function AddAccountForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState("bank");
  const [color, setColor] = useState(TYPES[0].color);
  const [pending, start] = useTransition();

  function selectType(value: string) {
    setType(value);
    const t = TYPES.find((x) => x.value === value);
    if (t) setColor(t.color);
  }

  function submit(formData: FormData) {
    setError(null);
    start(async () => {
      const r = await addAccount(formData);
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
        <Plus className="h-4 w-4" /> Nueva cuenta
      </button>
    );
  }

  return (
    <form
      action={submit}
      className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-4"
    >
      <div className="grid gap-2 sm:grid-cols-3">
        <select
          name="type"
          value={type}
          onChange={(e) => selectType(e.target.value)}
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value} className="bg-zinc-900">
              {t.label}
            </option>
          ))}
        </select>
        <input
          name="name"
          required
          placeholder="Nombre (Bancolombia, Bolsillo viaje...)"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none sm:col-span-2"
        />
      </div>

      <div className="grid items-center gap-2 sm:grid-cols-[1fr_auto]">
        <AmountInput name="initial_balance" placeholder="Saldo inicial (opcional)" />
        <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-400">
          Color
          <input
            type="color"
            name="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-6 w-8 cursor-pointer rounded border border-white/10 bg-transparent"
          />
        </label>
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
          {pending ? "Creando..." : "Crear"}
        </button>
      </div>
    </form>
  );
}
