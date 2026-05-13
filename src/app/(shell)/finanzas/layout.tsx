import { FinanceTabs } from "@/components/finance/finance-tabs";

export default function FinanzasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <FinanceTabs />
      {children}
    </div>
  );
}
