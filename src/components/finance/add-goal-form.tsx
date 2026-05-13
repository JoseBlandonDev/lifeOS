"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { addGoal } from "@/app/actions/finance";
import { AmountInput } from "./amount-input";

const COLORS = ["#a78bfa", "#22d3ee", "#34d399", "#fbbf24", "#f472b6", "#60a5fa"];

export function AddGoalForm() {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    formData.set("color", color);
    start(async () => {
      const r = await addGoal(formData);
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
        <Plus className="h-4 w-4" /> Nueva meta
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
          placeholder="Nombre (Viaje, MacBook, Fondo emergencia...)"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
        />
        <AmountInput name="target_amount" required placeholder="Objetivo en COP" />
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          name="deadline"
          type="date"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
        />
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/40 p-1">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
              className={`h-6 w-6 rounded-full transition ${color === c ? "ring-2 ring-white/40" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
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
          {pending ? "Creando..." : "Crear meta"}
        </button>
      </div>
    </form>
  );
}
