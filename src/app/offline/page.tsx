import Link from "next/link";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-950 p-6">
      <div className="glass-panel max-w-md rounded-2xl p-8 text-center">
        <WifiOff className="mx-auto mb-4 h-12 w-12 text-violet-400" />
        <h1 className="text-xl font-semibold text-zinc-100">
          Sin conexión
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Algunas vistas en caché siguen disponibles. Vuelve a intentarlo cuando
          recuperes la red.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-xl bg-violet-500/90 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-400"
        >
          Ir al panel
        </Link>
      </div>
    </div>
  );
}
