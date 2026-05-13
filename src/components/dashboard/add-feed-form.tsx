"use client";

import { useState, useTransition } from "react";
import { Plus, ExternalLink, Info } from "lucide-react";
import { addCalendarFeed } from "@/app/actions/calendar";

export function AddFeedForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const res = await addCalendarFeed(formData);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setInfo(`Sincronizado: ${res.count} eventos.`);
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-violet-500/90 px-3 py-2 text-sm font-medium text-white hover:bg-violet-400"
        >
          <Plus className="h-4 w-4" /> Conectar calendario
        </button>
        {info && <span className="text-xs text-emerald-300">{info}</span>}
      </div>
    );
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-4"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          name="label"
          required
          placeholder="Nombre (Trabajo, Personal…)"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
        />
        <input
          name="url"
          type="url"
          required
          placeholder="https://calendar.google.com/.../basic.ics"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
        />
      </div>

      <details className="rounded-lg bg-black/40 p-3 text-xs text-zinc-400">
        <summary className="flex cursor-pointer items-center gap-2 text-zinc-300">
          <Info className="h-3.5 w-3.5 text-violet-400" /> ¿Cómo obtengo la URL ICS?
        </summary>
        <div className="mt-2 space-y-2">
          <p>
            <strong className="text-zinc-200">Google Calendar:</strong> abre{" "}
            <a
              href="https://calendar.google.com/calendar/u/0/r/settings"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-violet-300 hover:underline"
            >
              ajustes <ExternalLink className="h-3 w-3" />
            </a>
            , elige un calendario, y copia el campo{" "}
            <em>“Dirección secreta en formato iCal”</em>.
          </p>
          <p>
            <strong className="text-zinc-200">Outlook:</strong> ajustes →{" "}
            <em>Calendarios compartidos</em> → Publicar un calendario → copia el
            enlace que termina en <code className="rounded bg-black/40 px-1">.ics</code>.
          </p>
        </div>
      </details>

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
          {pending ? "Sincronizando…" : "Conectar"}
        </button>
      </div>
    </form>
  );
}
