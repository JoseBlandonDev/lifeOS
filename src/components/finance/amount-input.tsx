"use client";

export function AmountInput({
  name,
  required,
  placeholder,
  defaultValue,
  className,
}: {
  name: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number;
  className?: string;
}) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-500">
        $
      </span>
      <input
        name={name}
        type="text"
        inputMode="decimal"
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder ?? "0"}
        className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-6 pr-3 text-sm text-zinc-100 tabular-nums placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
      />
    </div>
  );
}
