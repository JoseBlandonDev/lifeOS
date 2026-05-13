import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  CircleDashed,
  GraduationCap,
  ListTodo,
} from "lucide-react";
import { getAcademicSnapshot, type SubjectSummary } from "@/lib/data/academic";
import { GlassCard } from "@/components/ui/glass-card";
import { AddSubjectForm } from "@/components/dashboard/add-subject-form";
import { AddGradeForm, EditGradeForm } from "@/components/dashboard/add-grade-form";
import { AddTaskForm } from "@/components/dashboard/add-task-form";
import { DeleteForm } from "@/components/dashboard/delete-button";
import {
  deleteGradeAction,
  deleteSubjectAction,
  deleteTaskAction,
  toggleTaskAction,
} from "@/app/actions/academic";
import { formatDateLong } from "@/lib/format";

function formatGrade(value: number | null) {
  return value == null ? "--" : value.toFixed(2);
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function statusCopy(subject: SubjectSummary) {
  if (subject.passProjection === "passed") {
    return {
      icon: CheckCircle2,
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
      text: "Ya tienes asegurada la nota mínima.",
    };
  }

  if (subject.passProjection === "impossible") {
    return {
      icon: AlertTriangle,
      className: "border-rose-500/20 bg-rose-500/10 text-rose-300",
      text: `Con lo registrado no alcanza para llegar a ${subject.passingGrade.toFixed(2)}.`,
    };
  }

  if (subject.completedWeight === 0) {
    return {
      icon: CircleDashed,
      className: "border-zinc-500/20 bg-white/5 text-zinc-300",
      text: "Aun no hay notas calificadas. Puedes planear evaluaciones y completarlas luego.",
    };
  }

  return {
    icon: CircleDashed,
    className: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    text: `Necesitas ${formatGrade(subject.neededAverageForPassing)} en el ${formatPercent(subject.pendingWeight)} restante.`,
  };
}

export default async function AcademicoPage() {
  const snap = await getAcademicSnapshot();

  if (!snap) {
    return <div className="text-sm text-zinc-400">No se pudo cargar.</div>;
  }

  const subjectsWithGrades = snap.subjects.filter((s) => s.currentAverage != null);
  const globalAverage =
    subjectsWithGrades.length > 0
      ? subjectsWithGrades.reduce((acc, s) => acc + (s.currentAverage ?? 0), 0) /
        subjectsWithGrades.length
      : null;

  const pendingTasks = snap.tasks.filter((t) => !t.done);
  const doneTasks = snap.tasks.filter((t) => t.done);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-violet-400/90">
            <BookOpen className="h-3.5 w-3.5" /> Académico
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-50">
            Tu progreso, claro y al día
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Pesos en porcentaje, notas de 0 a 5 y proyección simple para saber qué falta.
          </p>
        </div>
        <AddSubjectForm />
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <GlassCard>
          <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
            <GraduationCap className="h-3.5 w-3.5" /> Promedio actual
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-violet-200">
            {formatGrade(globalAverage)}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            Solo cuenta evaluaciones ya calificadas
          </p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Asignaturas
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-100">
            {snap.subjects.length}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            Total registradas
          </p>
        </GlassCard>
        <GlassCard>
          <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
            <ListTodo className="h-3.5 w-3.5" /> Pendientes
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-300">
            {pendingTasks.length}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            {doneTasks.length} completadas
          </p>
        </GlassCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <h2 className="mb-4 text-base font-semibold tracking-tight">
            Asignaturas
          </h2>
          {snap.subjects.length === 0 ? (
            <div className="rounded-lg bg-black/30 p-8 text-center">
              <p className="mb-3 text-sm text-zinc-400">
                Sin asignaturas todavía. Crea la primera y empieza a registrar
                notas.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {snap.subjects.map((s) => {
                const status = statusCopy(s);
                const StatusIcon = status.icon;
                const progress = Math.min(100, s.completedWeight);
                const availableWeight = Math.max(0, 100 - s.totalPlannedWeight);

                return (
                  <li
                    key={s.id}
                    className="rounded-xl border border-white/10 bg-black/30 p-4"
                  >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-100">
                        {s.name}
                      </h3>
                      <p className="text-[11px] text-zinc-500">
                        Minima {s.passingGrade.toFixed(2)} · peso planeado{" "}
                        {formatPercent(s.totalPlannedWeight)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-semibold text-violet-200">
                        {formatGrade(s.currentAverage)}
                      </span>
                      <DeleteForm action={deleteSubjectAction}>
                        <input type="hidden" name="id" value={s.id} />
                      </DeleteForm>
                    </div>
                  </div>

                  <div className="mb-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-lg bg-black/40 p-2">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                        Promedio actual
                      </p>
                      <p className="text-lg font-semibold tabular-nums text-zinc-100">
                        {formatGrade(s.currentAverage)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-black/40 p-2">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                        Acumulado final
                      </p>
                      <p className="text-lg font-semibold tabular-nums text-zinc-100">
                        {formatGrade(s.finalProjectedAverage)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-black/40 p-2">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                        Peso con nota
                      </p>
                      <p className="text-lg font-semibold tabular-nums text-zinc-100">
                        {formatPercent(s.completedWeight)}
                      </p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="mb-1 flex items-center justify-between text-[11px] text-zinc-500">
                      <span>Calificado {formatPercent(s.completedWeight)} de 100%</span>
                      <span>{formatPercent(s.pendingWeight)} restante</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-violet-400"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className={`mb-3 flex gap-2 rounded-lg border p-2 text-xs ${status.className}`}>
                    <StatusIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div>
                      <p>{status.text}</p>
                      {s.isOverPlanned ? (
                        <p className="mt-1 text-rose-300">
                          El peso planeado supera 100%. Edita o elimina una evaluación.
                        </p>
                      ) : s.missingWeight > 0 ? (
                        <p className="mt-1 text-zinc-400">
                          Falta planear {formatPercent(s.missingWeight)} para completar la materia.
                        </p>
                      ) : (
                        <p className="mt-1 text-zinc-400">
                          La materia ya tiene el 100% de peso planeado.
                        </p>
                      )}
                    </div>
                  </div>

                  {s.grades.length > 0 && (
                    <ul className="mb-3 space-y-2 rounded-lg bg-black/40 p-2 text-xs">
                      {s.grades.map((g) => (
                        <li key={g.id} className="rounded-md bg-black/30 p-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-zinc-200">{g.title}</p>
                              <p className="text-[10px] text-zinc-500">
                                Peso {formatPercent(g.weight)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  g.status === "graded"
                                    ? "bg-emerald-500/10 text-emerald-300"
                                    : "bg-amber-500/10 text-amber-300"
                                }`}
                              >
                                {g.score == null ? "Pendiente" : formatGrade(g.score)}
                              </span>
                              <EditGradeForm grade={g} />
                              <DeleteForm action={deleteGradeAction}>
                                <input type="hidden" name="id" value={g.id} />
                              </DeleteForm>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {availableWeight > 0 ? (
                    <AddGradeForm subjectId={s.id} remainingWeight={availableWeight} />
                  ) : (
                    <p className="text-[11px] text-zinc-500">
                      Para añadir otra evaluación, libera peso editando una existente.
                    </p>
                  )}
                </li>
                );
              })}
            </ul>
          )}
        </GlassCard>

        <GlassCard>
          <div className="mb-3 flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-violet-400" />
            <h2 className="text-base font-semibold tracking-tight">Tareas</h2>
          </div>

          {pendingTasks.length === 0 && doneTasks.length === 0 ? (
            <p className="mb-3 rounded-lg bg-black/30 p-4 text-xs text-zinc-500">
              No hay tareas. Crea la primera abajo.
            </p>
          ) : (
            <div className="mb-3 space-y-3">
              {pendingTasks.length > 0 && (
                <ul className="space-y-2">
                  {pendingTasks.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-black/30 px-3 py-2 text-sm"
                    >
                      <form
                        action={toggleTaskAction}
                        className="flex min-w-0 items-center gap-2"
                      >
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="done" value="false" />
                        <button
                          type="submit"
                          aria-label="Marcar como hecha"
                          className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-white/20 hover:border-violet-400"
                        />
                        <span className="truncate text-zinc-200">
                          {t.title}
                        </span>
                        {t.subject_name && (
                          <span className="shrink-0 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] uppercase text-violet-300">
                            {t.subject_name}
                          </span>
                        )}
                      </form>
                      <span className="flex shrink-0 items-center gap-2">
                        {t.due_at && (
                          <span className="text-[11px] text-zinc-500">
                            {formatDateLong(t.due_at)}
                          </span>
                        )}
                        <DeleteForm action={deleteTaskAction}>
                          <input type="hidden" name="id" value={t.id} />
                        </DeleteForm>
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {doneTasks.length > 0 && (
                <details className="rounded-lg bg-black/20 p-2 text-xs">
                  <summary className="cursor-pointer text-zinc-500">
                    {doneTasks.length} completadas
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {doneTasks.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-zinc-500"
                      >
                        <form
                          action={toggleTaskAction}
                          className="flex min-w-0 items-center gap-2"
                        >
                          <input type="hidden" name="id" value={t.id} />
                          <input type="hidden" name="done" value="true" />
                          <button
                            type="submit"
                            aria-label="Marcar como pendiente"
                            className="flex h-3.5 w-3.5 items-center justify-center rounded bg-violet-500/40 text-[8px] text-white"
                          >
                            ✓
                          </button>
                          <span className="truncate line-through">
                            {t.title}
                          </span>
                        </form>
                        <DeleteForm action={deleteTaskAction}>
                          <input type="hidden" name="id" value={t.id} />
                        </DeleteForm>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          <AddTaskForm
            subjects={snap.subjects.map((s) => ({ id: s.id, name: s.name }))}
          />
        </GlassCard>
      </section>
    </div>
  );
}
