import { AlertCircle } from "lucide-react";

interface ProductFetchErrorStateProps {
  title?: string;
}

const ProductFetchErrorState = ({ title = "Could not load products." }: ProductFetchErrorStateProps) => {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-16 text-center">
      <AlertCircle size={24} strokeWidth={1.25} className="text-[var(--color-muted-soft)]" />
      <p className="mt-4 font-display text-[22px] italic text-zinc-500">{title}</p>
      <p className="mt-2 font-body text-[12px] text-[var(--color-muted-soft)]">Please refresh the page to try again.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-5 font-body text-[11px] uppercase tracking-[0.14em] text-[#E8A811] transition-colors hover:text-[#E8A811]"
      >
        Refresh
      </button>
    </div>
  );
};

export default ProductFetchErrorState;


