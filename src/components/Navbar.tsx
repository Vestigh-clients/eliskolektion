import { FormEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useStorefrontConfig } from "@/contexts/StorefrontConfigContext";
import { buildAuthModalSearch, buildPathWithSearch } from "@/lib/authModal";

type NavItem = {
  key: string;
  label: string;
  to: string;
  type: "category" | "page";
  categorySlug?: string;
};

const CATEGORY_NAV_LIMIT = 4;

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { storefrontConfig, storefrontCategories } = useStorefrontConfig();
  const { openCart, totalItems } = useCart();
  const { isAuthenticated, isAdmin } = useAuth();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const navRowRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const navRow = navRowRef.current;
    if (!navRow) return;

    const root = document.documentElement;
    let rafId: number | null = null;

    const updateNavbarHeight = () => {
      const measuredHeight = Math.ceil(navRow.getBoundingClientRect().height);
      root.style.setProperty("--navbar-height", `${measuredHeight}px`);
    };

    const scheduleUpdate = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updateNavbarHeight();
      });
    };

    updateNavbarHeight();

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => scheduleUpdate()) : null;
    resizeObserver?.observe(navRow);
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (location.pathname !== "/shop") return;
    setSearchValue(searchParams.get("q") ?? "");
  }, [location.pathname, searchParams]);

  const normalizedCategories = useMemo(() => {
    return storefrontCategories
      .map((category) => ({
        label: category.name.trim() || "Category",
        slug: category.slug.trim().toLowerCase(),
      }))
      .filter((category) => category.slug.length > 0);
  }, [storefrontCategories]);

  const categoryItems = useMemo(() => {
    return normalizedCategories.slice(0, CATEGORY_NAV_LIMIT).map<NavItem>((category) => ({
      key: category.slug,
      label: category.label,
      to: `/shop?category=${encodeURIComponent(category.slug)}`,
      type: "category",
      categorySlug: category.slug,
    }));
  }, [normalizedCategories]);

  const navItems = useMemo<NavItem[]>(
    () => [
      { key: "shop", label: "Shop All", to: "/shop", type: "page" },
      ...categoryItems,
      { key: "about", label: "About", to: "/about", type: "page" },
      { key: "contact", label: "Contact", to: "/contact", type: "page" },
    ],
    [categoryItems],
  );

  const activeCategory = (searchParams.get("category") ?? "").trim().toLowerCase();

  const isItemActive = (item: NavItem, index: number) => {
    if (item.type === "page") return location.pathname === item.to;
    if (location.pathname === "/" && index === 1) return true;
    return location.pathname === "/shop" && activeCategory === (item.categorySlug ?? "");
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextParams = new URLSearchParams();
    const requestedCategory = (searchParams.get("category") ?? "").trim().toLowerCase();
    if (location.pathname === "/shop" && requestedCategory && categoryItems.some((item) => item.categorySlug === requestedCategory)) {
      nextParams.set("category", requestedCategory);
    }
    const normalizedSearch = searchValue.trim();
    if (normalizedSearch.length > 0) nextParams.set("q", normalizedSearch);
    const query = nextParams.toString();
    navigate(query ? `/shop?${query}` : "/shop");
  };

  const accountRoute = useMemo(() => {
    if (isAuthenticated) return "/account";
    const authSearch = buildAuthModalSearch(location.search, { mode: "login", redirect: "/account" });
    return buildPathWithSearch(location.pathname, authSearch, location.hash);
  }, [isAuthenticated, location.hash, location.pathname, location.search]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#f9f9f9] border-b border-zinc-100">
      <nav ref={navRowRef} className="flex justify-between items-center w-full px-6 py-4 max-w-[1440px] mx-auto md:px-8">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-8 lg:gap-12 min-w-0">
          <Link
            to="/"
            className="shrink-0 text-xl font-black tracking-tighter text-zinc-900 uppercase font-display"
          >
            {storefrontConfig.storeName}
          </Link>

          <div className="hidden md:flex items-center gap-6 lg:gap-8 font-display uppercase tracking-widest text-xs font-bold">
            {navItems.map((item, index) => {
              const active = isItemActive(item, index);
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  className={[
                    "whitespace-nowrap pb-1 transition-colors border-b-2",
                    active
                      ? "text-[#E8A811] border-[#E8A811]"
                      : "text-zinc-900 border-transparent hover:text-[#E8A811]",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: Search + Icons */}
        <div className="flex shrink-0 items-center gap-4 sm:gap-6">
          <form onSubmit={handleSearchSubmit} className="hidden lg:block relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">
              search
            </span>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search curated items..."
              className="bg-[#e8e8e8] border-none text-[10px] pl-10 pr-4 py-2 w-56 rounded-full focus:ring-1 focus:ring-[#E8A811] focus:outline-none uppercase font-bold tracking-widest font-display placeholder:text-zinc-500"
            />
          </form>

          <div className="flex items-center gap-3 sm:gap-4 text-[#E8A811]">
            {isAdmin ? (
              <Link
                to="/admin"
                aria-label="Open admin panel"
                className="hidden md:inline-flex items-center border border-[#E8A811] px-3 py-1.5 font-display text-[10px] font-black uppercase tracking-widest text-[#E8A811] transition-colors hover:bg-[#E8A811] hover:text-black"
              >
                Admin
              </Link>
            ) : null}

            <button
              type="button"
              onClick={openCart}
              aria-label="Open cart"
              className="relative inline-flex hover:opacity-80 transition-all duration-300 active:scale-95"
            >
              <span className="material-symbols-outlined">shopping_cart</span>
              {totalItems > 0 ? (
                <span className="absolute -right-2 -top-1.5 inline-flex min-w-[16px] justify-center rounded-full bg-black px-1.5 py-[1px] font-display text-[9px] font-black text-white">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              ) : null}
            </button>

            <Link
              to={accountRoute}
              aria-label="Open account"
              className="inline-flex hover:opacity-80 transition-all duration-300 active:scale-95"
            >
              <span className="material-symbols-outlined">person</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle mobile menu"
              className="md:hidden text-black"
            >
              <span className="material-symbols-outlined">{isMobileMenuOpen ? "close" : "menu"}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen ? (
        <div className="md:hidden bg-[#f9f9f9] border-t border-zinc-100 px-6 pb-6 pt-4">
          <form onSubmit={handleSearchSubmit} className="mb-5 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">
              search
            </span>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search..."
              className="bg-[#e8e8e8] border-none text-[10px] pl-10 pr-4 py-2 w-full rounded-full focus:ring-1 focus:ring-[#E8A811] focus:outline-none uppercase font-bold tracking-widest font-display placeholder:text-zinc-500"
            />
          </form>

          <div className="flex flex-col gap-4">
            {navItems.map((item, index) => {
              const active = isItemActive(item, index);
              return (
                <Link
                  key={`mobile-${item.key}`}
                  to={item.to}
                  className={[
                    "font-display text-xs font-bold uppercase tracking-widest transition-colors",
                    active ? "text-[#E8A811]" : "text-black hover:text-[#E8A811]",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
            {isAdmin ? (
              <Link
                to="/admin"
                className="font-display text-xs font-bold uppercase tracking-widest text-[#E8A811]"
              >
                Admin
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
};

export default Navbar;
