import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const envValue = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const statusRows = [
  {
    label: "PAYSTACK_PUBLIC_KEY",
    isSet: envValue(import.meta.env.PAYSTACK_PUBLIC_KEY).length > 0,
  },
  {
    label: "VITE_PAYSTACK_SUBACCOUNT_CODE",
    isSet: envValue(import.meta.env.VITE_PAYSTACK_SUBACCOUNT_CODE).length > 0,
  },
] as const;

const EnvStatus = ({ isSet }: { isSet: boolean }) => (
  <span className={`inline-flex items-center gap-2 font-body text-[12px] ${isSet ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
    {isSet ? <Check size={14} strokeWidth={1.8} /> : <X size={14} strokeWidth={1.8} />}
    <span>{isSet ? "Set" : "Not set"}</span>
  </span>
);

const PaymentConfigReference = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="rounded-[var(--border-radius)] border border-[var(--color-border)] bg-transparent px-6 py-5 lg:px-10"
    >
      <CollapsibleTrigger asChild>
        <button type="button" className="flex w-full items-center justify-between gap-4 text-left">
          <span className="font-display text-[24px] italic text-[var(--color-primary)]">Configuration reference</span>
          <ChevronDown
            size={18}
            strokeWidth={1.6}
            className={`shrink-0 text-[var(--color-muted-soft)] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="mt-6 border-t border-[var(--color-border)] pt-6">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="px-0 py-3 text-left font-body text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted-soft)]">
                    Environment variable
                  </th>
                  <th className="px-0 py-3 text-left font-body text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted-soft)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {statusRows.map((row) => (
                  <tr key={row.label} className="border-b border-[var(--color-surface-strong)]">
                    <td className="py-4 pr-6 font-mono text-[12px] text-[var(--color-primary)]">{row.label}</td>
                    <td className="py-4">
                      <EnvStatus isSet={row.isSet} />
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="py-4 pr-6 font-mono text-[12px] text-[var(--color-primary)]">PAYSTACK_SECRET_KEY (edge fn)</td>
                  <td className="py-4 font-body text-[12px] text-[var(--color-muted)]">Check Supabase secrets</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 font-body text-[11px] text-[var(--color-muted-soft)]">
            To update these values, edit your environment variables and redeploy.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default PaymentConfigReference;
