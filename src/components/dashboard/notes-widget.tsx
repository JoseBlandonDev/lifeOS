"use client";

import { useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText, Save, Trash2 } from "lucide-react";
import { deleteNoteAction, saveQuickNote } from "@/app/actions/notes";
import type { QuickNoteRow } from "@/lib/data/notes";
import { GlassCard } from "@/components/ui/glass-card";

type Props = { initialNotes: QuickNoteRow[] };

export function NotesWidget({ initialNotes }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSave() {
    setMessage(null);
    startTransition(async () => {
      const res = await saveQuickNote(title, body);
      if (!res.ok) setMessage(res.message);
      else {
        setTitle("");
        setBody("");
        setMessage("Nota guardada.");
      }
    });
  }

  return (
    <GlassCard>
      <div className="mb-3 flex items-center gap-2">
        <FileText className="h-5 w-5 text-violet-400" />
        <h3 className="text-base font-semibold tracking-tight">Notas rápidas</h3>
      </div>
      <p className="mb-3 text-xs text-zinc-500">
        Markdown simple (negritas, listas, enlaces). Guardado en Supabase con RLS.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <input
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
            placeholder="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="min-h-[140px] w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-600"
            placeholder={"## Idea\n\n- item"}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pending || !body.trim()}
              onClick={onSave}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-500/90 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              <Save className="h-4 w-4" />
              {pending ? "Guardando…" : "Guardar"}
            </button>
            {message && (
              <span className="text-xs text-zinc-400">{message}</span>
            )}
          </div>
        </div>

        <div className="markdown-body rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-zinc-300">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body || "*Vista previa*"}</ReactMarkdown>
        </div>
      </div>

      {initialNotes.length > 0 && (
        <div className="mt-6 border-t border-white/10 pt-4">
          <p className="mb-2 text-xs font-medium uppercase text-zinc-500">
            Recientes
          </p>
          <ul className="space-y-2">
            {initialNotes.map((n) => (
              <li
                key={n.id}
                className="flex items-start justify-between gap-3 rounded-lg bg-black/30 p-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-100">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400">
                    {n.body}
                  </p>
                  <p className="mt-1 text-[10px] uppercase text-zinc-600">
                    {new Date(n.updated_at).toLocaleString()}
                  </p>
                </div>
                <form action={deleteNoteAction}>
                  <input type="hidden" name="id" value={n.id} />
                  <button
                    type="submit"
                    className="rounded-md p-1 text-zinc-500 hover:bg-white/5 hover:text-rose-300"
                    aria-label="Eliminar nota"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </GlassCard>
  );
}
