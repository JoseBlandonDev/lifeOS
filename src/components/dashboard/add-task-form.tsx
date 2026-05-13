"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { addTask } from "@/app/actions/academic";

type Subject = { id: string; name: string };

export function AddTaskForm({ subjects }: { subjects: Subject[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await addTask(formData);
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
        className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"
      >
        <Plus className="h-4 w-4" /> Añadir tarea
      </button>
    );
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-2 rounded-xl border border-white/10 bg-black/30 p-3"
    >
      <input
        name="title"
        required
        placeholder="Tarea pendiente"
        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          name="subject_id"
          defaultValue=""
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
        >
          <option value="">Sin asignatura</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id} className="bg-zinc-900">
              {s.name}
            </option>
          ))}
        </select>
        <input
          name="due_at"
          type="datetime-local"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
        />
      </div>
      {error && (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>
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
          className="rounded-lg bg-violet-500/90 px-3 py-2 text-xs font-medium text-white hover:bg-violet-400 disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Añadir"}
        </button>
      </div>
    </form>
  );
}
