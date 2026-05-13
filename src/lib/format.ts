const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const copPrecise = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCOP(amount: number, opts?: { precise?: boolean }) {
  if (!Number.isFinite(amount)) return "$0";
  if (opts?.precise) return copPrecise.format(amount);
  return cop.format(amount);
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("es-CO").format(n);
}

export function formatDateLong(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
  });
}

export function formatTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
