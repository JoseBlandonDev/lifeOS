import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const provider = searchParams.get("provider"); // 'google' | 'microsoft' | null

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=No_se_pudo_autenticar`,
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // ignore
          }
        },
      },
    },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    return NextResponse.redirect(
      `${origin}/login?error=No_se_pudo_autenticar`,
    );
  }

  // Si la sesión trae provider tokens (caso linkIdentity con Google/Microsoft con scopes
  // de Calendar), los persistimos en nuestra tabla para uso server-side.
  const session = data.session;
  const providerToken = session.provider_token;
  const providerRefreshToken = session.provider_refresh_token;

  if (providerToken && (provider === "google" || provider === "microsoft")) {
    const userId = session.user.id;
    const accountEmail =
      session.user.email ??
      (session.user.identities ?? [])
        .filter((i) => i.provider === provider)
        .map((i) => (i.identity_data as { email?: string } | null)?.email ?? null)
        .find(Boolean) ??
      null;

    // expira en 1 hora aprox para Google. Para MS el endpoint devuelve expires_in
    // pero aquí no lo tenemos: marcamos 50 min para forzar refresh pronto si toca.
    const expiresAt = new Date(Date.now() + 50 * 60 * 1000).toISOString();

    await supabase.from("calendar_oauth_tokens").upsert(
      {
        user_id: userId,
        provider,
        access_token: providerToken,
        refresh_token: providerRefreshToken ?? null,
        expires_at: expiresAt,
        primary_calendar_id: "primary",
        account_email: accountEmail,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
