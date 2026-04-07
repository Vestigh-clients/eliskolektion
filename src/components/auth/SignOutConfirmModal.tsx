interface SignOutConfirmModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const SignOutConfirmModal = ({ isOpen, isSubmitting, onConfirm, onCancel }: SignOutConfirmModalProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] bg-black/35 px-4">
      <div className="mx-auto flex min-h-screen max-w-[360px] items-center">
        <div className="w-full rounded-[var(--border-radius)] bg-[var(--color-secondary)] p-10">
          <p className="font-display text-[30px] leading-none text-[var(--color-primary)]">Sign out?</p>
          <p className="mt-4 font-body text-[12px] font-light leading-[1.8] text-zinc-500">
            You have items in your cart. They will be lost if you sign out.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="w-full bg-[#E8A811] px-4 py-[14px] font-display font-black text-[11px] uppercase tracking-widest text-black transition-colors hover:bg-zinc-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-65"
            >
              {isSubmitting ? "Please wait..." : "Sign Out Anyway"}
            </button>

            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="w-full border border-[var(--color-border)] px-4 py-[14px] font-body text-[11px] uppercase tracking-[0.16em] text-[var(--color-primary)] transition-colors hover:border-[#E8A811] disabled:cursor-not-allowed disabled:opacity-65"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignOutConfirmModal;



