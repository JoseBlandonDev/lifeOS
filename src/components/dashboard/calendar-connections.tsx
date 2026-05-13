"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Info,
  Link2,
  Link2Off,
  TriangleAlert,
} from "lucide-react";
import { useTransition } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { disconnectProvider } from "@/app/actions/calendar";

type Connection = {
  provider: "google" | "microsoft";
  account_email: string | null;
};

const GOOGLE_SCOPES =
  "openid email profile https://www.googleapis.com/auth/calendar";
const MICROSOFT_SCOPES =
  "openid email profile offline_access Calendars.ReadWrite";

const META = {
  google: {
    name: "Google Calendar",
    color: "from-rose-500/20 to-amber-500/20",
    accent: "text-rose-300",
  },
  microsoft: {
    name: "Outlook (Microsoft)",
    color: "from-sky-500/20 to-cyan-500/20",
    accent: "text-sky-300",
  },
} as const;

export function CalendarConnections({
  connections,
}: {
  connections: Connection[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function getStatus(provider: "google" | "microsoft") {
    return connections.find((c) => c.provider === provider) ?? null;
  }

  async function connect(provider: "google" | "microsoft") {
    setError(null);
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const redirectTo = `${window.location.origin}/auth/callback?provider=${provider}&next=/calendario`;
    const supabaseProvider = provider === "google" ? "google" : "azure";
    const scopes = provider === "google" ? GOOGLE_SCOPES : MICROSOFT_SCOPES;

    // signInWithOAuth se basa en Automatic Linking de Supabase, que está
    // habilitado por defecto: si tu email coincide con tu cuenta actual,
    // se vinculan automáticamente y los provider tokens (Google/Microsoft)
    // quedan disponibles en la sesión.
    const res = await supabase.auth.signInWithOAuth({
      provider: supabaseProvider as "google" | "azure",
      options: {
        redirectTo,
        scopes,
        queryParams:
          provider === "google"
            ? { access_type: "offline", prompt: "consent" }
            : { prompt: "consent" },
      },
    });
    if (res.error) {
      setError(translateError(res.error.message, provider));
    }
  }

  function disconnect(provider: "google" | "microsoft") {
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.set("provider", provider);
      await disconnectProvider(fd);
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {(["google", "microsoft"] as const).map((p) => {
          const status = getStatus(p);
          const meta = META[p];
          const connected = !!status;
          return (
            <div
              key={p}
              className={`rounded-xl border border-white/10 bg-gradient-to-br ${meta.color} p-4`}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className={`text-sm font-semibold ${meta.accent}`}>
                  {meta.name}
                </p>
                {connected ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" /> Conectado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/20 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                    Desconectado
                  </span>
                )}
              </div>
              {connected ? (
                <div className="space-y-2">
                  <p className="truncate text-xs text-zinc-300">
                    {status?.account_email ?? "Cuenta vinculada"}
                  </p>
                  <button
                    type="button"
                    onClick={() => disconnect(p)}
                    disabled={pending}
                    className="inline-flex items-center gap-1 rounded-lg bg-black/30 px-3 py-1.5 text-xs text-zinc-300 hover:bg-black/40"
                  >
                    <Link2Off className="h-3.5 w-3.5" /> Desconectar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => connect(p)}
                  className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-white/20"
                >
                  <Link2 className="h-3.5 w-3.5" /> Conectar {meta.name}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          <div className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>{error}</p>
          </div>
        </div>
      )}

      <p className="rounded-lg bg-violet-500/10 px-3 py-2 text-xs text-violet-200">
        Asegúrate de iniciar sesión en Google/Microsoft con el mismo correo
        electrónico que usas en esta app. Supabase los vincula automáticamente
        para que sigas siendo la misma cuenta.
      </p>

      <details className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-zinc-400">
        <summary className="flex cursor-pointer items-center gap-2 text-zinc-300">
          <Info className="h-3.5 w-3.5 text-violet-400" /> ¿No funciona? Revisa
          esta checklist
        </summary>
        <div className="mt-3 space-y-3">
          <div>
            <p className="mb-1 font-semibold text-zinc-200">
              1. Mismo email en ambos lados
            </p>
            <p>
              La cuenta de Google o Outlook debe usar el mismo email con el que
              estás logueado en la app. Si son distintos, Supabase no puede
              vincular automáticamente.
            </p>
          </div>

          <div>
            <p className="mb-1 font-semibold text-zinc-200">
              2. Google: scopes y API
            </p>
            <ol className="list-inside list-decimal space-y-1">
              <li>
                Crea credenciales OAuth en{" "}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-violet-300 hover:underline"
                >
                  Google Cloud Console
                  <ExternalLink className="h-3 w-3" />
                </a>{" "}
                (tipo: Web application).
              </li>
              <li>
                URI de redirección autorizado:
                <br />
                <code className="rounded bg-black/50 px-1 text-[11px] break-all">
                  https://couwrreiexwvwauufujt.supabase.co/auth/v1/callback
                </code>
              </li>
              <li>
                En la pantalla de consentimiento (OAuth consent screen) añade
                explícitamente el scope:
                <br />
                <code className="rounded bg-black/50 px-1 text-[11px]">
                  https://www.googleapis.com/auth/calendar.events
                </code>
                .
                <br />
                Si tu app está en modo "Testing", añádete como Test user.
              </li>
              <li>
                Activa la API "Google Calendar API" en{" "}
                <a
                  href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-violet-300 hover:underline"
                >
                  API Library
                  <ExternalLink className="h-3 w-3" />
                </a>
                .
              </li>
              <li>
                En{" "}
                <a
                  href="https://supabase.com/dashboard/project/couwrreiexwvwauufujt/auth/providers"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-violet-300 hover:underline"
                >
                  Supabase → Auth → Providers
                  <ExternalLink className="h-3 w-3" />
                </a>{" "}
                activa Google y pega Client ID + Secret.
              </li>
            </ol>
          </div>

          <div>
            <p className="mb-1 font-semibold text-zinc-200">
              3. Outlook: permisos delegados
            </p>
            <ol className="list-inside list-decimal space-y-1">
              <li>
                Registra una app en{" "}
                <a
                  href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-violet-300 hover:underline"
                >
                  Azure Portal
                  <ExternalLink className="h-3 w-3" />
                </a>{" "}
                (Multi-tenant + cuentas personales).
              </li>
              <li>
                URI de redirección (Web):
                <br />
                <code className="rounded bg-black/50 px-1 text-[11px] break-all">
                  https://couwrreiexwvwauufujt.supabase.co/auth/v1/callback
                </code>
              </li>
              <li>
                Permisos delegados de Microsoft Graph:{" "}
                <code className="rounded bg-black/50 px-1 text-[11px]">
                  Calendars.ReadWrite
                </code>{" "}
                y{" "}
                <code className="rounded bg-black/50 px-1 text-[11px]">
                  offline_access
                </code>
                . <strong>Pulsa "Grant admin consent"</strong> después de
                añadirlos.
              </li>
              <li>
                Genera un Client Secret y pégalo (junto al Application/Client
                ID) en Supabase → Auth → Providers → Azure.
              </li>
            </ol>
          </div>

          <div>
            <p className="mb-1 font-semibold text-zinc-200">
              4. (Opcional) Refresh automático de tokens en Vercel
            </p>
            <p>
              Para que los tokens se refresquen solos cuando expiren cada hora,
              añade estas variables de entorno en{" "}
              <a
                href="https://vercel.com/joses-projects-140d43ec/joseproject/settings/environment-variables"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-violet-300 hover:underline"
              >
                Vercel → Settings → Environment Variables
                <ExternalLink className="h-3 w-3" />
              </a>
              :
            </p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              <li>
                <code className="rounded bg-black/50 px-1 text-[11px]">
                  GOOGLE_CLIENT_ID
                </code>{" "}
                /{" "}
                <code className="rounded bg-black/50 px-1 text-[11px]">
                  GOOGLE_CLIENT_SECRET
                </code>
              </li>
              <li>
                <code className="rounded bg-black/50 px-1 text-[11px]">
                  MICROSOFT_CLIENT_ID
                </code>{" "}
                /{" "}
                <code className="rounded bg-black/50 px-1 text-[11px]">
                  MICROSOFT_CLIENT_SECRET
                </code>{" "}
                /{" "}
                <code className="rounded bg-black/50 px-1 text-[11px]">
                  MICROSOFT_TENANT_ID
                </code>{" "}
                (usa <code>common</code>)
              </li>
            </ul>
            <p className="mt-1 text-[11px] text-zinc-500">
              Sin esto, podrás crear eventos durante la primera hora después de
              conectar; pasada esa hora tendrías que volver a conectar.
            </p>
          </div>
        </div>
      </details>
    </div>
  );
}

function translateError(msg: string, provider: "google" | "microsoft") {
  const m = msg.toLowerCase();
  if (m.includes("provider is not enabled")) {
    return `${provider === "google" ? "Google" : "Azure"} no está activado en Supabase. Actívalo en Supabase → Auth → Providers y pega Client ID + Secret.`;
  }
  if (m.includes("manual linking is disabled")) {
    return "La opción 'Manual Linking' está deshabilitada en Supabase. Acabamos de cambiar el flujo para no necesitarla — recarga la página y vuelve a intentar.";
  }
  if (m.includes("redirect")) {
    return "URL de redirección no autorizada. Asegúrate de añadir https://couwrreiexwvwauufujt.supabase.co/auth/v1/callback en Google Cloud / Azure.";
  }
  if (m.includes("scope")) {
    return "Faltan permisos en la pantalla de consentimiento (OAuth consent screen). Añade el scope de Calendar y vuelve a intentar.";
  }
  return msg;
}
