"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email y contraseña son obligatorios." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: traducirError(error.message) };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email y contraseña son obligatorios." };
  }
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const supabase = await createClient();

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${baseUrl}/login`,
    },
  });

  if (error) {
    return { error: traducirError(error.message) };
  }

  // Si Supabase ya creó la sesión (confirmación de email desactivada), entramos directo
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  // Si no, intentamos login inmediatamente (algunos proyectos lo permiten)
  const loginResult = await supabase.auth.signInWithPassword({ email, password });
  if (loginResult.data.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  return {
    success: true,
    message:
      "Cuenta creada. Revisa tu correo para confirmar (o desactiva la confirmación en Supabase para entrar al instante).",
  };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

function traducirError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email o contraseña incorrectos.";
  if (m.includes("email not confirmed"))
    return "Aún no has confirmado tu email. Revisa tu bandeja.";
  if (m.includes("user already registered"))
    return "Ya existe una cuenta con ese email. Inicia sesión.";
  if (m.includes("signups not allowed"))
    return "El registro está deshabilitado en este proyecto.";
  return msg;
}
