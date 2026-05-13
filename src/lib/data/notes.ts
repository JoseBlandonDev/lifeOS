import { createClient } from "@/lib/supabase/server";

export type QuickNoteRow = {
  id: string;
  title: string;
  body: string;
  updated_at: string;
};

export async function getRecentQuickNotes(limit = 25): Promise<QuickNoteRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return [];
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("quick_notes")
    .select("id, title, body, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as QuickNoteRow[];
}
