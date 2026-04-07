import { useEffect } from "react";
import { UserCheck, UserX } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { storeConfig, storeKeyPrefix } from "@/config/store.config";
import { useAuth } from "@/contexts/AuthContext";
import { REDIRECT_AFTER_LOGIN_KEY } from "@/services/authService";
import { buildAuthModalSearch, buildPathWithSearch } from "@/lib/authModal";

const CHECKOUT_MODE_STORAGE_KEY = `${storeKeyPrefix}_checkout_mode`;
const CHECKOUT_SESSION_STORAGE_KEY = `${storeKeyPrefix}_checkout_session_v1`;
const CHECKOUT_CONTACT_PATH = "/checkout/contact";
const CheckoutEntry = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const loginWithRedirectPath = buildPathWithSearch(
    location.pathname,
    buildAuthModalSearch(location.search, {
      mode: "login",
      redirect: CHECKOUT_CONTACT_PATH,
    }),
    location.hash,
  );

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(CHECKOUT_CONTACT_PATH, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !storeConfig.features.guestCheckout) {
      navigate(loginWithRedirectPath, { replace: true });
    }
  }, [isAuthenticated, isLoading, loginWithRedirectPath, navigate]);

  const handleGuestCheckout = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(CHECKOUT_MODE_STORAGE_KEY, "guest");
      window.sessionStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY);
      window.sessionStorage.removeItem(CHECKOUT_SESSION_STORAGE_KEY);
    }

    navigate(CHECKOUT_CONTACT_PATH);
  };

  const handleSignIn = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(CHECKOUT_MODE_STORAGE_KEY);
      window.sessionStorage.setItem(REDIRECT_AFTER_LOGIN_KEY, CHECKOUT_CONTACT_PATH);
    }

    navigate(loginWithRedirectPath);
  };

  return (
    <div className="bg-[var(--color-secondary)] px-6 py-[80px]">
      <div className="mx-auto max-w-[480px]">
        <h1 className="font-display text-[38px]  leading-[1.1] text-zinc-900">
          {storeConfig.features.guestCheckout ? "How would you like to continue?" : "Sign in to continue"}
        </h1>
        <p className="mb-12 mt-2 font-inter text-[12px] text-zinc-400">
          {storeConfig.features.guestCheckout ? "Choose an option to proceed to checkout" : "An account is required to proceed to checkout"}
        </p>

        {storeConfig.features.guestCheckout ? (
          <>
            <button
              type="button"
              onClick={handleGuestCheckout}
              className="w-full cursor-pointer rounded-[var(--border-radius)] border border-[var(--color-border)] bg-transparent px-8 py-7 text-left transition-all duration-200 ease-in-out hover:border-[var(--color-primary)]"
            >
              <div className="flex items-center justify-between">
                <UserX size={20} strokeWidth={1.3} className="text-zinc-900" />
                <span className="rounded-[var(--border-radius)] border border-[var(--color-border)] px-[10px] py-[3px] font-inter text-[9px] uppercase tracking-[0.14em] text-zinc-500">
                  Guest
                </span>
              </div>

              <p className="mt-3 font-display text-[22px]  text-zinc-900">Continue as Guest</p>
              <p className="mt-1.5 max-w-[290px] font-inter text-[12px] font-light leading-[1.7] text-zinc-500">
                No account needed. Enter your details at checkout.
              </p>
            </button>

            <div className="my-[4px] flex items-center gap-3">
              <span className="h-px flex-1 bg-[var(--color-border)]" />
              <span className="font-inter text-[11px] text-zinc-400">or</span>
              <span className="h-px flex-1 bg-[var(--color-border)]" />
            </div>
          </>
        ) : null}

        <button
          type="button"
          onClick={handleSignIn}
          className="w-full cursor-pointer rounded-[var(--border-radius)] border border-[var(--color-border)] bg-transparent px-8 py-7 text-left transition-all duration-200 ease-in-out hover:border-[var(--color-primary)]"
        >
          <div className="flex items-center justify-between">
            <UserCheck size={20} strokeWidth={1.3} className="text-[#E8A811]" />
            <span className="rounded-[var(--border-radius)] border border-[var(--color-accent)] px-[10px] py-[3px] font-inter text-[9px] uppercase tracking-[0.14em] text-[#E8A811]">
              Recommended
            </span>
          </div>

          <p className="mt-3 font-display text-[22px]  text-zinc-900">Sign In or Create Account</p>
          <p className="mt-1.5 max-w-[320px] font-inter text-[12px] font-light leading-[1.7] text-zinc-500">
            Faster checkout with saved details, order history and address book.
          </p>
        </button>
      </div>
    </div>
  );
};

export default CheckoutEntry;


