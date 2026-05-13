"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { addSubject } from "@/app/actions/academic";

type PlannedGrade = {
  id: string;
  title: string;
  weight: string;
  score: string;
};

function makePlanned(weight = ""): PlannedGrade {
  return {
    id: crypto.randomUUID(),
    title: "",
    weight,
    score: "",
  };
}

export function AddSubjectForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [planned, setPlanned] = useState<PlannedGrade[]>([]);
  const plannedWeight = planned.reduce((acc, g) => {
    const weight = Number(g.weight.replace(",", "."));
    return Number.isFinite(weight) ? acc + weight : acc;
  }, 0);
  const remainingWeight = Math.max(0, 100 - plannedWeight);
  const isOverPlanned = plannedWeight > 100;

  function handleSubmit(formData: FormData) {
    setError(null);
    const payload = planned
      .map((g) => ({
        title: g.title.trim(),
        weight: Number(g.weight.replace(",", ".")),
        score: g.score.trim() === "" ? null : Number(g.score.replace(",", ".")),
      }))
      .filter((g) => g.title && Number.isFinite(g.weight) && g.weight > 0);
    const totalWeight = payload.reduce((acc, g) => acc + g.weight, 0);
    if (totalWeight > 100) {
      setError("Los pesos planeados no pueden superar 100%.");
      return;
    }
    formData.set("planned_grades_json", JSON.stringify(payload));
    startTransition(async () => {
      const res = await addSubject(formData);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setOpen(false);
      setPlanned([]);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"
      >
        <Plus className="h-4 w-4" /> Añadir asignatura
      </button>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          name="name"
          required
          placeholder="Nombre de la asignatura"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
        />
        <input
          name="passing_grade"
          type="number"
          step="0.01"
          min="0"
          max="5"
          defaultValue="3.0"
          required
          placeholder="Nota mínima para ganar (ej. 3.0)"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
        />
      </div>

      <div className="rounded-lg border border-white/10 bg-black/20 p-2">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs text-zinc-400">
            Planea evaluaciones ahora (opcional). Los pesos son porcentajes y la materia completa suma 100%.
          </p>
          <button
            type="button"
            onClick={() =>
              setPlanned((prev) => [
                ...prev,
                makePlanned(remainingWeight > 0 ? String(remainingWeight) : ""),
              ])
            }
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-200 hover:bg-white/10"
          >
            <Plus className="h-3 w-3" /> Añadir evaluación
          </button>
        </div>
        <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full ${isOverPlanned ? "bg-rose-400" : "bg-violet-400"}`}
            style={{ width: `${Math.min(100, plannedWeight)}%` }}
          />
        </div>
        <p
          className={`mb-2 text-[11px] ${isOverPlanned ? "text-rose-300" : plannedWeight === 100 ? "text-emerald-300" : "text-zinc-500"}`}
        >
          Peso planeado: {plannedWeight.toFixed(2)}% de 100%
          {plannedWeight < 100 && ` · faltan ${remainingWeight.toFixed(2)}%`}
          {isOverPlanned && " · supera el 100%"}
        </p>
        {planned.length > 0 && (
          <ul className="space-y-2">
            {planned.map((g, idx) => (
              <li key={g.id} className="grid gap-2 rounded-md bg-black/40 p-2 sm:grid-cols-[1.3fr_0.7fr_0.7fr_auto]">
                <input
                  value={g.title}
                  onChange={(e) =>
                    setPlanned((prev) =>
                      prev.map((r) => (r.id === g.id ? { ...r, title: e.target.value } : r)),
                    )
                  }
                  placeholder={`Nota ${idx + 1} (ej. Parcial 1)`}
                  className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
                />
                <input
                  value={g.weight}
                  onChange={(e) =>
                    setPlanned((prev) =>
                      prev.map((r) => (r.id === g.id ? { ...r, weight: e.target.value } : r)),
                    )
                  }
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="100"
                  placeholder="Peso (%)"
                  className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-zinc-100"
                />
                <input
                  value={g.score}
                  onChange={(e) =>
                    setPlanned((prev) =>
                      prev.map((r) => (r.id === g.id ? { ...r, score: e.target.value } : r)),
                    )
                  }
                  type="number"
                  step="0.01"
                  min="0"
                  max="5"
                  placeholder="Nota 0-5 (opc.)"
                  className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-zinc-100"
                />
                <button
                  type="button"
                  onClick={() =>
                    setPlanned((prev) => prev.filter((r) => r.id !== g.id))
                  }
                  className="rounded-md p-1 text-zinc-500 hover:bg-white/5 hover:text-rose-300"
                  aria-label="Eliminar nota planeada"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
      <button
        type="submit"
        disabled={pending || isOverPlanned}
        className="rounded-lg bg-violet-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-violet-400 disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Guardar"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-lg px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200"
      >
        Cancelar
      </button>
      {error && (
        <p className="basis-full rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}
      </div>
    </form>
  );
}
