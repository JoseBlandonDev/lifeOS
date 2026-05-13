import { Timer } from "lucide-react";
import { PomodoroWidget } from "@/components/dashboard/pomodoro-widget";
import { NotesWidget } from "@/components/dashboard/notes-widget";
import { getRecentQuickNotes } from "@/lib/data/notes";

export default async function FocusPage() {
  const notes = await getRecentQuickNotes();

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-violet-400/90">
          <Timer className="h-3.5 w-3.5" /> Productividad
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-50">
          Concentración y notas
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Pomodoro con sonido y notificaciones, además de tu cuaderno markdown.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <PomodoroWidget />
        <NotesWidget initialNotes={notes} />
      </section>
    </div>
  );
}
