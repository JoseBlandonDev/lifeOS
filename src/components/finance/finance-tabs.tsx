"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  Landmark,
  ListChecks,
  PiggyBank,
  Receipt,
  Target,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/finanzas", label: "Resumen", icon: Wallet, exact: true },
  { href: "/finanzas/cuentas", label: "Cuentas", icon: CreditCard },
  { href: "/finanzas/movimientos", label: "Movimientos", icon: Receipt },
  { href: "/finanzas/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { href: "/finanzas/prestamos", label: "Préstamos", icon: ListChecks },
  { href: "/finanzas/metas", label: "Metas", icon: Target },
  { href: "/finanzas/presupuesto", label: "Presupuesto", icon: PiggyBank },
  { href: "/finanzas/inversiones", label: "Inversiones", icon: Landmark },
];

export function FinanceTabs() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
      {TABS.map((t) => {
        const active = t.exact
          ? pathname === t.href
          : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition",
              active
                ? "border-violet-500/40 bg-violet-500/15 text-violet-100"
                : "border-white/10 bg-black/30 text-zinc-400 hover:bg-black/40 hover:text-zinc-200",
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
