"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ACADEMIC_PATHS = ["/dashboard", "/academico"];
const MAX_GRADE = 5;
const MAX_WEIGHT = 100;

function revalAcademic() {
  for (const p of ACADEMIC_PATHS) revalidatePath(p);
}

function parseGrade(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const raw = String(v).trim().replace(",", ".");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseWeight(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const raw = String(v).trim().replace(",", ".");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function isValidScore(score: number | null): score is number | null {
  return score == null || (score >= 0 && score <= MAX_GRADE);
}

function isValidWeight(weight: number | null): weight is number {
  return weight != null && weight > 0 && weight <= MAX_WEIGHT;
}

async function getPlannedWeight({
  userId,
  subjectId,
  excludeGradeId,
}: {
  userId: string;
  subjectId: string;
  excludeGradeId?: string;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("grades")
    .select("id, weight")
    .eq("user_id", userId)
    .eq("subject_id", subjectId);

  if (excludeGradeId) query = query.neq("id", excludeGradeId);

  const { data, error } = await query;
  if (error) return { ok: false as const, message: error.message };

  const total = (data ?? []).reduce((acc, row) => acc + Number(row.weight), 0);
  return { ok: true as const, total };
}

async function assertSubjectOwnsUser(subjectId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .select("id")
    .eq("id", subjectId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return { ok: false as const, message: "Asignatura no encontrada." };
  }

  return { ok: true as const };
}

export async function addSubject(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const passing_grade = parseGrade(formData.get("passing_grade")) ?? 3;
  const planned_raw = String(formData.get("planned_grades_json") ?? "").trim();
  if (!name) return { ok: false as const, message: "Falta el nombre." };
  if (!isValidScore(passing_grade)) {
    return {
      ok: false as const,
      message: "La nota mínima debe estar entre 0.0 y 5.0.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "No autenticado." };

  const { data: subject, error } = await supabase
    .from("subjects")
    .insert({
      user_id: user.id,
      name,
      passing_grade,
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, message: error.message };

  if (subject?.id && planned_raw) {
    try {
      const parsed = JSON.parse(planned_raw) as Array<{
        title?: string;
        weight?: number | string;
        score?: number | string | null;
      }>;
      const rows = (parsed ?? [])
        .map((g) => {
          const title = String(g.title ?? "").trim();
          const weight = Number(String(g.weight).replace(",", "."));
          const scoreRaw =
            g.score == null || String(g.score).trim() === ""
              ? null
              : Number(String(g.score).replace(",", "."));
          if (!title || !isValidWeight(weight)) return null;
          if (
            scoreRaw != null &&
            (!Number.isFinite(scoreRaw) || !isValidScore(scoreRaw))
          ) {
            return null;
          }
          return {
            user_id: user.id,
            subject_id: subject.id as string,
            title,
            weight,
            score: scoreRaw,
          };
        })
        .filter(Boolean) as Array<{
        user_id: string;
        subject_id: string;
        title: string;
        weight: number;
        score: number | null;
      }>;

      const plannedWeight = rows.reduce((acc, row) => acc + row.weight, 0);
      if (plannedWeight > MAX_WEIGHT) {
        return {
          ok: false as const,
          message: "Los pesos planeados no pueden superar 100%.",
        };
      }

      if (rows.length > 0) {
        const { error: gErr } = await supabase.from("grades").insert(rows);
        if (gErr) return { ok: false as const, message: gErr.message };
      }
    } catch {
      return {
        ok: false as const,
        message: "No se pudieron guardar las notas planeadas.",
      };
    }
  }

  revalAcademic();
  return { ok: true as const };
}

export async function deleteSubjectAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("subjects").delete().eq("id", id).eq("user_id", user.id);
  revalAcademic();
}

export async function addGrade(formData: FormData) {
  const subject_id = String(formData.get("subject_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const score = parseGrade(formData.get("score"));
  const weight = parseWeight(formData.get("weight"));

  if (!subject_id) return { ok: false as const, message: "Falta la asignatura." };
  if (!title) return { ok: false as const, message: "Falta el título." };
  if (!isValidScore(score)) return { ok: false as const, message: "Nota inválida." };
  if (!isValidWeight(weight)) {
    return {
      ok: false as const,
      message: "El peso debe estar entre 0.01% y 100%.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "No autenticado." };

  const subjectCheck = await assertSubjectOwnsUser(subject_id, user.id);
  if (!subjectCheck.ok) return subjectCheck;

  const planned = await getPlannedWeight({ userId: user.id, subjectId: subject_id });
  if (!planned.ok) return planned;
  if (planned.total + weight > MAX_WEIGHT) {
    return {
      ok: false as const,
      message: `Con ese peso llegarías a ${(planned.total + weight).toFixed(2)}%. La materia no puede superar 100%.`,
    };
  }

  const { error } = await supabase.from("grades").insert({
    user_id: user.id,
    subject_id,
    title,
    score,
    weight,
  });

  if (error) return { ok: false as const, message: error.message };
  revalAcademic();
  return { ok: true as const };
}

export async function updateGrade(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const score = parseGrade(formData.get("score"));
  const weight = parseWeight(formData.get("weight"));

  if (!id) return { ok: false as const, message: "Falta la calificación." };
  if (!title) return { ok: false as const, message: "Falta el título." };
  if (!isValidScore(score)) return { ok: false as const, message: "Nota inválida." };
  if (!isValidWeight(weight)) {
    return {
      ok: false as const,
      message: "El peso debe estar entre 0.01% y 100%.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "No autenticado." };

  const { data: grade, error: gradeError } = await supabase
    .from("grades")
    .select("id, subject_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (gradeError || !grade) {
    return { ok: false as const, message: "Calificación no encontrada." };
  }

  const subjectId = grade.subject_id as string;
  const planned = await getPlannedWeight({
    userId: user.id,
    subjectId,
    excludeGradeId: id,
  });
  if (!planned.ok) return planned;
  if (planned.total + weight > MAX_WEIGHT) {
    return {
      ok: false as const,
      message: `Con ese peso llegarías a ${(planned.total + weight).toFixed(2)}%. La materia no puede superar 100%.`,
    };
  }

  const { error } = await supabase
    .from("grades")
    .update({ title, score, weight })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false as const, message: error.message };
  revalAcademic();
  return { ok: true as const };
}

export async function deleteGradeAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("grades").delete().eq("id", id).eq("user_id", user.id);
  revalAcademic();
}

export async function addTask(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const subject_id = String(formData.get("subject_id") ?? "") || null;
  const due_at_raw = String(formData.get("due_at") ?? "").trim();
  let due_at: string | null = null;
  if (due_at_raw) {
    const normalized = due_at_raw.length === 16 ? `${due_at_raw}:00` : due_at_raw;
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) {
      return { ok: false as const, message: "Fecha/hora inválida." };
    }
    due_at = normalized;
  }

  if (!title) return { ok: false as const, message: "Falta el título." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "No autenticado." };

  const { error } = await supabase.from("subject_tasks").insert({
    user_id: user.id,
    subject_id,
    title,
    due_at,
  });

  if (error) return { ok: false as const, message: error.message };
  revalAcademic();
  return { ok: true as const };
}

export async function toggleTaskAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const done = String(formData.get("done") ?? "false") === "true";
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("subject_tasks")
    .update({ done: !done, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  revalAcademic();
}

export async function deleteTaskAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("subject_tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  revalAcademic();
}
