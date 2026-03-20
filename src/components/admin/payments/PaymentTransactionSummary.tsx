import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/adminFormatting";
import { fetchPaymentTransactionSummary, type PaymentTransactionSummary as PaymentTransactionSummaryData } from "@/services/adminService";

const SummaryCard = ({ value, label, description }: { value: string; label: string; description: string }) => (
  <div className="border-b-2 border-[var(--color-accent)] pb-5">
    <p className="font-display text-[32px] leading-none text-[var(--color-primary)] md:text-[44px]">{value}</p>
    <p className="mt-2 font-body text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted-soft)]">{label}</p>
    <p className="mt-2 font-body text-[11px] text-[var(--color-muted-soft)]">{description}</p>
  </div>
);

const LoadingCard = () => (
  <div className="border-b-2 border-[var(--color-accent)] pb-5">
    <div className="h-9 w-32 animate-pulse bg-[var(--color-surface-alt)]" />
    <div className="mt-3 h-3 w-20 animate-pulse bg-[var(--color-surface-alt)]" />
    <div className="mt-3 h-3 w-24 animate-pulse bg-[var(--color-surface-alt)]" />
  </div>
);

const PaymentTransactionSummary = () => {
  const [summary, setSummary] = useState<PaymentTransactionSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadSummary = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const data = await fetchPaymentTransactionSummary();
        if (!isMounted) return;
        setSummary(data);
      } catch (error) {
        if (!isMounted) return;
        console.error("[payments] Failed to load transaction summary:", error);
        setSummary(null);
        setLoadError("Unable to load payment summary.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadSummary();

    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  return (
    <section>
      <p className="mb-6 font-body text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent)]">Transaction Summary</p>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-3">
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
        </div>
      ) : null}

      {!isLoading && loadError ? (
        <div className="rounded-[var(--border-radius)] border border-[rgba(var(--color-danger-rgb),0.3)] bg-[rgba(var(--color-danger-rgb),0.04)] px-4 py-5">
          <p className="font-body text-[12px] text-[var(--color-primary)]">{loadError}</p>
          <button
            type="button"
            onClick={() => setRetryCount((current) => current + 1)}
            className="mt-4 rounded-[var(--border-radius)] border border-[var(--color-border)] bg-transparent px-4 py-2 font-body text-[10px] uppercase tracking-[0.1em] text-[var(--color-primary)] transition-colors hover:border-[var(--color-primary)]"
          >
            Retry
          </button>
        </div>
      ) : null}

      {!isLoading && !loadError ? (
        <div className="grid gap-6 md:grid-cols-3">
          <SummaryCard value={formatCurrency(summary?.totalPaid ?? 0)} label="Total Paid" description="All time" />
          <SummaryCard value={formatCurrency(summary?.paidThisMonth ?? 0)} label="This Month" description="Paid orders" />
          <SummaryCard value={formatCurrency(summary?.pendingTotal ?? 0)} label="Pending" description="Pending payments" />
        </div>
      ) : null}
    </section>
  );
};

export default PaymentTransactionSummary;
