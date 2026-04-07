import { Link } from "react-router-dom";
import SignOutConfirmModal from "@/components/auth/SignOutConfirmModal";
import { useAuth } from "@/contexts/AuthContext";
import { useSignOutWithCartWarning } from "@/hooks/useSignOutWithCartWarning";

const AccountHome = () => {
  const { user } = useAuth();
  const { isConfirmOpen, isSubmitting, requestSignOut, confirmSignOut, cancelSignOut } = useSignOutWithCartWarning();

  const displayName =
    user?.user_metadata?.first_name && user?.user_metadata?.last_name
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
      : user?.email ?? "My Account";

  return (
    <div className="bg-white px-6 py-[80px] sm:px-6">
      <div className="mx-auto max-w-[720px]">
        <p className="font-inter text-[10px] uppercase tracking-[0.2em] text-[#E8A811]">Account</p>
        <h1 className="mt-3 font-display text-[40px] font-extrabold tracking-tighter uppercase text-zinc-900 sm:text-[52px]">
          {displayName}
        </h1>
        <p className="mt-4 font-inter text-[13px] leading-[1.8] text-zinc-500">
          Manage your profile and orders from here.
        </p>

        <div className="mt-10 grid gap-3 sm:max-w-[340px]">
          <Link
            to="/account/orders"
            className="border border-zinc-200 px-5 py-[14px] font-inter text-[11px] uppercase tracking-[0.14em] text-zinc-900 transition-colors hover:border-zinc-900"
          >
            My Orders
          </Link>

          <button
            type="button"
            onClick={requestSignOut}
            className="bg-[#E8A811] px-5 py-[14px] text-left font-display font-black text-[11px] uppercase tracking-widest text-black transition-colors hover:bg-zinc-900 hover:text-white"
          >
            Sign Out
          </button>
        </div>
      </div>

      <SignOutConfirmModal
        isOpen={isConfirmOpen}
        isSubmitting={isSubmitting}
        onConfirm={confirmSignOut}
        onCancel={cancelSignOut}
      />
    </div>
  );
};

export default AccountHome;



