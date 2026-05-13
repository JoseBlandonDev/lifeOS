import { createClient } from "@/lib/supabase/server";

export type Provider = "google" | "microsoft";

export type StoredToken = {
  provider: Provider;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  primary_calendar_id: string | null;
  account_email: string | null;
};

export async function getToken(provider: Provider): Promise<StoredToken | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("calendar_oauth_tokens")
    .select(
      "provider, access_token, refresh_token, expires_at, primary_calendar_id, account_email",
    )
    .eq("user_id", user.id)
    .eq("provider", provider)
    .maybeSingle();
  return data as StoredToken | null;
}

async function refreshGoogle(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth no está configurado en el servidor.");
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google refresh: ${await res.text()}`);
  return (await res.json()) as {
    access_token: string;
    expires_in: number;
    scope?: string;
    token_type?: string;
  };
}

async function refreshMicrosoft(refreshToken: string) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Microsoft OAuth no está configurado en el servidor.");
  }
  const tenant = process.env.MICROSOFT_TENANT_ID || "common";
  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope:
          "openid email profile offline_access Calendars.ReadWrite",
      }),
    },
  );
  if (!res.ok) throw new Error(`Microsoft refresh: ${await res.text()}`);
  return (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };
}

export async function getValidAccessToken(
  provider: Provider,
): Promise<string | null> {
  const token = await getToken(provider);
  if (!token) return null;

  const expiresAt = token.expires_at ? new Date(token.expires_at).getTime() : 0;
  const safetyMs = 60 * 1000;
  if (token.access_token && expiresAt - safetyMs > Date.now()) {
    return token.access_token;
  }

  if (!token.refresh_token) return token.access_token; // sin refresh, intentar con lo que hay

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  try {
    if (provider === "google") {
      const fresh = await refreshGoogle(token.refresh_token);
      const newExpiresAt = new Date(
        Date.now() + (fresh.expires_in - 30) * 1000,
      ).toISOString();
      await supabase
        .from("calendar_oauth_tokens")
        .update({
          access_token: fresh.access_token,
          expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("provider", "google");
      return fresh.access_token;
    }
    const fresh = await refreshMicrosoft(token.refresh_token);
    const newExpiresAt = new Date(
      Date.now() + (fresh.expires_in - 30) * 1000,
    ).toISOString();
    await supabase
      .from("calendar_oauth_tokens")
      .update({
        access_token: fresh.access_token,
        refresh_token: fresh.refresh_token ?? token.refresh_token,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("provider", "microsoft");
    return fresh.access_token;
  } catch {
    // Si no se pudo refrescar, devolvemos null para forzar reconexión
    // y evitar usar un access token vencido que dispara errores confusos.
    return null;
  }
}

export async function deleteToken(provider: Provider) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("calendar_oauth_tokens")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider);
}
