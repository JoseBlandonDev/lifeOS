import { createClient } from "@/lib/supabase/server";

export type SubjectSummary = {
  id: string;
  name: string;
  passingGrade: number;
  currentAverage: number | null;
  finalProjectedAverage: number | null;
  earnedPoints: number;
  completedWeight: number;
  pendingWeight: number;
  missingWeight: number;
  totalPlannedWeight: number;
  isWeightComplete: boolean;
  isOverPlanned: boolean;
  grades: {
    id: string;
    title: string;
    score: number | null;
    weight: number;
    status: "graded" | "pending";
  }[];
  neededAverageForPassing: number | null;
  passProjection: "passed" | "pending" | "impossible";
};

export type AcademicTask = {
  id: string;
  title: string;
  due_at: string | null;
  done: boolean;
  subject_id: string | null;
  subject_name: string | null;
};

export type AcademicSnapshot = {
  subjects: SubjectSummary[];
  tasks: AcademicTask[];
};

function weightedFromGrades(
  grades: { score: number | null; weight: number }[],
): {
  currentAverage: number | null;
  earnedPoints: number;
  completedWeight: number;
  totalPlannedWeight: number;
} {
  if (grades.length === 0) {
    return {
      currentAverage: null,
      earnedPoints: 0,
      completedWeight: 0,
      totalPlannedWeight: 0,
    };
  }
  let num = 0;
  let completedWeight = 0;
  let totalPlannedWeight = 0;
  for (const g of grades) {
    totalPlannedWeight += g.weight;
    if (g.score == null) continue;
    num += g.score * g.weight;
    completedWeight += g.weight;
  }
  if (completedWeight === 0) {
    return {
      currentAverage: null,
      earnedPoints: 0,
      completedWeight,
      totalPlannedWeight,
    };
  }
  return {
    currentAverage: Math.round((num / completedWeight) * 100) / 100,
    earnedPoints: Math.round((num / 100) * 100) / 100,
    completedWeight,
    totalPlannedWeight,
  };
}

export async function getAcademicSnapshot(): Promise<AcademicSnapshot | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, passing_grade")
    .eq("user_id", user.id)
    .order("name");

  const { data: gradeRows } = await supabase
    .from("grades")
    .select("id, subject_id, title, score, weight")
    .eq("user_id", user.id);

  const { data: tasks } = await supabase
    .from("subject_tasks")
    .select("id, title, due_at, done, subject_id, subjects(name)")
    .eq("user_id", user.id)
    .order("done")
    .order("due_at", { ascending: true });

  const bySubject = new Map<
    string,
    { id: string; title: string; score: number | null; weight: number }[]
  >();
  for (const row of gradeRows ?? []) {
    const sid = row.subject_id as string;
    if (!bySubject.has(sid)) bySubject.set(sid, []);
    bySubject.get(sid)!.push({
      id: row.id as string,
      title: row.title as string,
      score: row.score == null ? null : Number(row.score),
      weight: Number(row.weight),
    });
  }

  const subjectSummaries: SubjectSummary[] = (subjects ?? []).map((s) => {
    const grades = bySubject.get(s.id as string) ?? [];
    const weighted = weightedFromGrades(grades);
    const passingGrade = Number(s.passing_grade ?? 3);
    const remainingWeight = Math.max(0, 100 - weighted.completedWeight);
    const missingWeight = Math.max(0, 100 - weighted.totalPlannedWeight);
    const neededAverageForPassing =
      remainingWeight > 0
        ? ((passingGrade * 100) - weighted.earnedPoints * 100) / remainingWeight
        : null;
    const passProjection: SubjectSummary["passProjection"] =
      weighted.earnedPoints >= passingGrade
        ? "passed"
        : remainingWeight <= 0
          ? weighted.earnedPoints >= passingGrade
          ? "passed"
          : "impossible"
          : neededAverageForPassing != null && neededAverageForPassing > 5
            ? "impossible"
            : "pending";
    return {
      id: s.id as string,
      name: s.name as string,
      passingGrade,
      currentAverage: weighted.currentAverage,
      finalProjectedAverage: weighted.earnedPoints,
      earnedPoints: weighted.earnedPoints,
      completedWeight: weighted.completedWeight,
      pendingWeight: remainingWeight,
      missingWeight,
      totalPlannedWeight: weighted.totalPlannedWeight,
      isWeightComplete: weighted.totalPlannedWeight === 100,
      isOverPlanned: weighted.totalPlannedWeight > 100,
      grades: grades.map((g) => ({
        ...g,
        status: g.score == null ? "pending" : "graded",
      })),
      neededAverageForPassing:
        neededAverageForPassing == null
          ? null
          : Math.round(neededAverageForPassing * 100) / 100,
      passProjection,
    };
  });

  const academicTasks: AcademicTask[] = (tasks ?? []).map((t) => {
    const sf = t.subjects as { name: string } | { name: string }[] | null;
    const subject_name = Array.isArray(sf)
      ? (sf[0]?.name ?? null)
      : (sf?.name ?? null);
    return {
      id: t.id as string,
      title: t.title as string,
      due_at: (t.due_at as string | null) ?? null,
      done: Boolean(t.done),
      subject_id: (t.subject_id as string | null) ?? null,
      subject_name,
    };
  });

  return { subjects: subjectSummaries, tasks: academicTasks };
}
