"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  PanelLeft,
  PanelLeftClose,
  Timer,
  Wallet,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

const mainNav = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/finanzas", label: "Finanzas", icon: Wallet },
  { href: "/academico", label: "Académico", icon: BookOpen },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/focus", label: "Focus", icon: Timer },
];

function NavLink({
  href,
  label,
  icon: Icon,
  mobile,
  compact,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  mobile?: boolean;
  compact?: boolean;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
        mobile ? "flex-col gap-1 py-2 text-xs" : "justify-start",
        compact && "justify-center px-0",
        active
          ? "bg-violet-500/15 text-violet-200"
          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", mobile && "h-6 w-6")} />
      {!compact && <span className="truncate">{label}</span>}
    </Link>
  );
}

export function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname() ?? "";

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <div className="flex min-h-[100dvh] bg-zinc-950 text-zinc-100">
      <aside
        className={cn(
          "sticky top-0 hidden h-[100dvh] shrink-0 border-r border-white/10 bg-zinc-950/80 backdrop-blur-xl md:flex md:flex-col",
          collapsed ? "w-[72px]" : "w-56",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-3">
          {!collapsed && (
            <span className="truncate text-sm font-semibold tracking-tight text-zinc-100">
              Joseproject
            </span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
              collapsed && "mx-auto",
            )}
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          >
            {collapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2">
          {mainNav.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              compact={collapsed}
              active={isActive(item.href)}
            />
          ))}
        </nav>
        <div className="mt-auto border-t border-white/10 p-3">
          {userEmail ? (
            <div className="flex flex-col gap-2">
              {!collapsed && (
                <span className="truncate px-2 text-xs font-medium text-zinc-400">
                  {userEmail}
                </span>
              )}
              <form action={logout}>
                <button
                  type="submit"
                  title="Cerrar sesión"
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200",
                    collapsed && "justify-center px-0",
                  )}
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>Salir</span>}
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              title="Iniciar sesión"
              className={cn(
                "flex w-full items-center gap-3 rounded-xl bg-violet-500/10 px-3 py-2 text-sm font-medium text-violet-300 transition hover:bg-violet-500/20",
                collapsed && "justify-center px-0",
              )}
            >
              <LogIn className="h-5 w-5 shrink-0" />
              {!collapsed && <span>Entrar</span>}
            </Link>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 bg-zinc-950/70 px-4 backdrop-blur-xl md:hidden">
          <div className="flex items-center gap-2">
            <Menu className="h-5 w-5 text-zinc-500" aria-hidden />
            <span className="text-sm font-semibold">Joseproject</span>
          </div>
          <div className="flex items-center">
            {userEmail ? (
              <form action={logout}>
                <button type="submit" className="text-zinc-400 hover:text-zinc-200">
                  <LogOut className="h-5 w-5" />
                </button>
              </form>
            ) : (
              <Link href="/login" className="text-violet-400 hover:text-violet-300">
                <LogIn className="h-5 w-5" />
              </Link>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-white/10 bg-zinc-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
        aria-label="Navegación principal"
      >
        {mainNav.map((item) => (
          <div key={item.href} className="flex-1">
            <NavLink
              href={item.href}
              label={item.label}
              icon={item.icon}
              mobile
              active={isActive(item.href)}
            />
          </div>
        ))}
      </nav>
    </div>
  );
}
