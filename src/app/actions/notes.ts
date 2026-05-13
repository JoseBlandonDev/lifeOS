"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveQuickNote(title: string, body: string) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return { ok: false as const, message: "Faltan variables de Supabase." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, message: "Inicia sesión para guardar." };
  }

  const { error } = await supabase.from("quick_notes").insert({
    user_id: user.id,
    title: title || "Sin título",
    body,
  });

  if (error) {
    return { ok: false as const, message: error.message };
  }

  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function deleteNoteAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("quick_notes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
}
