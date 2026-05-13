"use client";

import { useEffect, useState, useTransition } from "react";
import { NotebookPen, Save } from "lucide-react";
import { saveDayNote } from "@/app/actions/calendar";

export function DayNoteForm({
  date,
  initialBody,
}: {
  date: string;
  initialBody: string;
}) {
  const [body, setBody] = useState(initialBody);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    setBody(initialBody);
    setSaved(false);
    setError(null);
  }, [initialBody, date]);

  function submit() {
    setError(null);
    setSaved(false);
    const formData = new FormData();
    formData.set("date", date);
    formData.set("body", body);
    start(async () => {
      const res = await saveDayNote(formData);
      if (res?.ok) setSaved(true);
      else setError(res?.message ?? "Error al guardar.");
    });
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
        <span className="flex items-center gap-1">
          <NotebookPen className="h-3.5 w-3.5" /> Nota del día
        </span>
        <span className="text-[10px] text-zinc-600">
          Solo aquí, no se sube a Google/Outlook
        </span>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Escribe una nota para este día…"
        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-zinc-500">
          {error
            ? <span className="text-rose-300">{error}</span>
            : saved
              ? <span className="text-emerald-300">Guardado</span>
              : "Cambios sin guardar"}
        </span>
        <button
          type="button"
          onClick={submit}
          disabled={pending || body === initialBody}
          className="inline-flex items-center gap-1 rounded-lg bg-violet-500/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-400 disabled:opacity-40"
        >
          <Save className="h-3.5 w-3.5" />
          {pending ? "..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}
