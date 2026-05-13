"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { syncNow } from "@/app/actions/calendar";

export function SyncNowButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => syncNow())}
      disabled={pending}
      className="flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-300 transition hover:bg-violet-500/20 disabled:opacity-50"
    >
      <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
      {pending ? "Sincronizando…" : "Sincronizar ahora"}
    </button>
  );
}
