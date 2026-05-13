"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import { addGrade, updateGrade } from "@/app/actions/academic";

type GradeFormValues = {
  id: string;
  title: string;
  score: number | null;
  weight: number;
};

export function AddGradeForm({
  subjectId,
  remainingWeight,
}: {
  subjectId: string;
  remainingWeight: number;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("subject_id", subjectId);
    startTransition(async () => {
      const res = await addGrade(formData);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-300 hover:bg-white/10"
      >
        <Plus className="h-3 w-3" /> Evaluación
      </button>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-2 rounded-lg border border-white/10 bg-black/30 p-2">
      <input
        name="title"
        required
        placeholder="Título (ej. Parcial 1)"
        className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          name="score"
          type="number"
          step="0.01"
          min="0"
          max="5"
          placeholder="Nota 0-5 (vacío si pendiente)"
          className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-zinc-100"
        />
        <input
          name="weight"
          type="number"
          step="0.01"
          min="0.01"
          max="100"
          defaultValue={remainingWeight > 0 ? remainingWeight.toFixed(2) : ""}
          required
          placeholder="Peso (%)"
          className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-zinc-100"
        />
      </div>
      <p className="text-[10px] text-zinc-500">
        Disponible sin superar 100%: {remainingWeight.toFixed(2)}%.
      </p>
      {error && (
        <p className="rounded bg-rose-500/10 px-2 py-1 text-[10px] text-rose-300">{error}</p>
      )}
      <div className="flex justify-end gap-1">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-200"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-violet-500/90 px-2 py-1 text-[10px] font-medium text-white hover:bg-violet-400 disabled:opacity-50"
        >
          {pending ? "…" : "Añadir"}
        </button>
      </div>
    </form>
  );
}

export function EditGradeForm({ grade }: { grade: GradeFormValues }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("id", grade.id);
    startTransition(async () => {
      const res = await updateGrade(formData);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md p-1 text-zinc-500 transition hover:bg-white/5 hover:text-violet-300"
        aria-label="Editar calificación"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <form
      action={handleSubmit}
      className="mt-2 grid gap-2 rounded-lg border border-white/10 bg-black/40 p-2 sm:grid-cols-[1.4fr_0.7fr_0.7fr_auto]"
    >
      <input
        name="title"
        required
        defaultValue={grade.title}
        className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-zinc-100"
      />
      <input
        name="score"
        type="number"
        step="0.01"
        min="0"
        max="5"
        defaultValue={grade.score ?? ""}
        placeholder="Pendiente"
        className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-zinc-100"
      />
      <input
        name="weight"
        type="number"
        step="0.01"
        min="0.01"
        max="100"
        required
        defaultValue={grade.weight}
        className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-zinc-100"
      />
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-200"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-violet-500/90 px-2 py-1 text-[10px] font-medium text-white hover:bg-violet-400 disabled:opacity-50"
        >
          {pending ? "..." : "Guardar"}
        </button>
      </div>
      {error && (
        <p className="rounded bg-rose-500/10 px-2 py-1 text-[10px] text-rose-300 sm:col-span-4">
          {error}
        </p>
      )}
    </form>
  );
}
