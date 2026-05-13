import { cn } from "@/lib/utils";

export function GlassCard({
  className,
  children,
  id,
}: {
  className?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "glass-panel rounded-2xl border border-white/10 p-5 shadow-xl shadow-black/40",
        className,
      )}
    >
      {children}
    </section>
  );
}
