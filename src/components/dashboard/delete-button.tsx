"use client";

import { Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md p-1 text-zinc-500 transition hover:bg-white/5 hover:text-rose-300 disabled:opacity-50"
      aria-label="Eliminar"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

export function DeleteForm({
  action,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children?: React.ReactNode;
}) {
  return (
    <form action={action} className="inline-flex">
      {children}
      <SubmitButton />
    </form>
  );
}
