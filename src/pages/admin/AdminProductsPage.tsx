import { Plus, Search, Sparkles, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  deleteAdminProduct,
  fetchAdminCategories,
  fetchAdminProducts,
  fetchProductOrderCount,
  type AdminProductListItem,
} from "@/services/adminService";
import { formatCurrency } from "@/lib/adminFormatting";

const PAGE_SIZE = 20;
const defaultCategoryTabs = [{ label: "All", slug: "" }];
const availabilityTabs = [
  { label: "All", value: "all" },
  { label: "Available", value: "available" },
  { label: "Unavailable", value: "unavailable" },
] as const;

// ── Mobile filter bottom sheet ───────────────────────────────────────────────
const FilterSheet = ({
  open,
  onClose,
  availability,
  setAvailability,
  categorySlug,
  setCategorySlug,
  categoryTabs,
  setPage,
}: {
  open: boolean;
  onClose: () => void;
  availability: "all" | "available" | "unavailable";
  setAvailability: (v: "all" | "available" | "unavailable") => void;
  categorySlug: string;
  setCategorySlug: (v: string) => void;
  categoryTabs: Array<{ label: string; slug: string }>;
  setPage: (p: number) => void;
}) => {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const activeFilterCount = (availability !== "all" ? 1 : 0) + (categorySlug !== "" ? 1 : 0);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 lg:hidden ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-[28px] bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out lg:hidden ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "80dvh", overflowY: "auto" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-[rgba(var(--color-primary-rgb),0.15)]" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(var(--color-primary-rgb),0.08)]">
          <p className="font-inter text-[14px] font-semibold text-[var(--color-navbar-solid-foreground)]">Filters</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[rgba(var(--color-primary-rgb),0.06)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-5">
          <div>
            <p className="font-inter text-[10px] uppercase tracking-[0.18em] text-[var(--color-primary)] mb-2.5">Availability</p>
            <div className="flex flex-wrap gap-2">
              {availabilityTabs.map((opt) => {
                const active = availability === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setAvailability(opt.value);
                      setPage(1);
                    }}
                    className={`rounded-full border px-4 py-2 font-inter text-[10px] uppercase tracking-[0.12em] transition-colors ${
                      active ? "text-white" : "text-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    }`}
                    style={{
                      borderColor: active ? "var(--color-primary)" : "rgba(var(--color-primary-rgb),0.16)",
                      background: active ? "var(--color-primary)" : "transparent",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="font-inter text-[10px] uppercase tracking-[0.18em] text-[var(--color-primary)] mb-2.5">Categories</p>
            <div className="flex flex-wrap gap-2">
              {categoryTabs.map((tab) => {
                const active = categorySlug === tab.slug;
                return (
                  <button
                    key={tab.slug || "all"}
                    type="button"
                    onClick={() => {
                      setCategorySlug(tab.slug);
                      setPage(1);
                    }}
                    className={`rounded-full border px-4 py-2 font-inter text-[10px] uppercase tracking-[0.12em] transition-colors ${
                      active ? "text-white" : "text-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    }`}
                    style={{
                      borderColor: active ? "var(--color-primary)" : "rgba(var(--color-primary-rgb),0.16)",
                      background: active ? "var(--color-primary)" : "transparent",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full py-3 font-inter text-[11px] uppercase tracking-[0.14em] text-white"
            style={{ background: "var(--color-primary)" }}
          >
            Done{activeFilterCount > 0 ? ` · ${activeFilterCount} active` : ""}
          </button>
        </div>
        <div className="h-4" />
      </div>
    </>
  );
};

// ── Main page ────────────────────────────────────────────────────────────────
const AdminProductsPage = () => {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [availability, setAvailability] = useState<"all" | "available" | "unavailable">("all");
  const [page, setPage] = useState(1);
  const [categoryTabs, setCategoryTabs] = useState<Array<{ label: string; slug: string }>>(defaultCategoryTabs);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const [rows, setRows] = useState<AdminProductListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let isMounted = true;
    const loadProducts = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const result = await fetchAdminProducts({
          searchTerm,
          categorySlug: categorySlug || undefined,
          availability,
          page,
          pageSize: PAGE_SIZE,
        });
        if (!isMounted) return;
        setRows(result.rows);
        setTotalCount(result.totalCount);
      } catch {
        if (!isMounted) return;
        setRows([]);
        setTotalCount(0);
        setLoadError("Unable to load products.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    void loadProducts();
    return () => {
      isMounted = false;
    };
  }, [searchTerm, categorySlug, availability, page]);

  useEffect(() => {
    let isMounted = true;
    const loadCategoryTabs = async () => {
      try {
        const categories = await fetchAdminCategories();
        if (!isMounted) return;
        const tabs = [...defaultCategoryTabs, ...categories.map((c) => ({ label: c.name, slug: c.slug }))];
        setCategoryTabs(tabs);
        setCategorySlug((cur) => (!cur ? cur : tabs.some((t) => t.slug === cur) ? cur : ""));
      } catch {
        if (!isMounted) return;
        setCategoryTabs(defaultCategoryTabs);
      }
    };
    void loadCategoryTabs();
    return () => {
      isMounted = false;
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    for (let cur = start; cur <= end; cur++) pages.push(cur);
    return pages;
  }, [page, totalPages]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const onDelete = async (product: AdminProductListItem) => {
    setDeletingId(product.id);
    try {
      const usageCount = await fetchProductOrderCount(product.id);
      if (usageCount > 0) {
        window.alert(`This product has ${usageCount} orders and cannot be deleted. Set it to unavailable instead.`);
        return;
      }
      const shouldDelete = window.confirm(`Delete ${product.name}? This cannot be undone.`);
      if (!shouldDelete) return;
      await deleteAdminProduct(product.id, { name: product.name, slug: product.slug });
      const refreshed = await fetchAdminProducts({
        searchTerm,
        categorySlug: categorySlug || undefined,
        availability,
        page,
        pageSize: PAGE_SIZE,
      });
      setRows(refreshed.rows);
      setTotalCount(refreshed.totalCount);
    } finally {
      setDeletingId(null);
    }
  };

  const openEditor = (productId: string) => navigate(`/admin/products/${productId}/edit`);

  const activeFilterCount = (availability !== "all" ? 1 : 0) + (categorySlug !== "" ? 1 : 0);

  return (
    <div className="admin-page lux-page-enter overflow-visible min-h-[calc(100dvh-3.5rem)] md:min-h-[calc(100dvh-4rem)] flex flex-col">
      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col text-left">

        {/* Page header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-inter text-[11px] uppercase tracking-[0.22em] text-[var(--color-primary)]">Catalog</p>
            <h1 className="mt-3 font-manrope text-[38px] leading-[1.04] text-[var(--color-navbar-solid-foreground)] sm:text-[50px]">
              Products
            </h1>
            <p className="mt-2 max-w-[680px] font-inter text-[13px] leading-[1.8] text-[var(--color-muted)] sm:text-[14px]">
              Browse inventory, filter quickly, and jump into editing with the same smooth admin flow as Add with AI.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/admin/products/add-with-ai"
              className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 font-inter text-[11px] uppercase tracking-[0.12em] transition-colors hover:bg-[rgba(var(--color-primary-rgb),0.08)]"
              style={{
                borderColor: "rgba(var(--color-primary-rgb),0.2)",
                color: "var(--color-primary)",
                background: "rgba(var(--color-primary-rgb),0.04)",
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Add with AI
            </Link>
            <Link
              to="/admin/products/new"
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-inter text-[11px] uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--color-primary)" }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add New Product
            </Link>
          </div>
        </div>

        {/* Filter card */}
        <section
          className="mt-7 rounded-[28px] border bg-white p-4 shadow-[0_14px_48px_rgba(26,28,28,0.06)] sm:p-5"
          style={{ borderColor: "rgba(var(--color-primary-rgb),0.15)" }}
        >
          <div className="flex flex-col gap-4">
            {/* Search row */}
            <div className="flex items-center gap-2">
              <label className="relative block flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-primary)]" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by name or SKU..."
                  className="h-11 w-full rounded-full border bg-white pl-10 pr-4 font-inter text-[13px] text-[var(--color-navbar-solid-foreground)] outline-none transition-colors placeholder:text-[var(--color-muted-soft)] focus:border-[var(--color-primary)]"
                  style={{ borderColor: "rgba(var(--color-primary-rgb),0.18)" }}
                />
              </label>
              <button
                type="button"
                onClick={() => setFilterSheetOpen(true)}
                className="relative flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 font-inter text-[11px] uppercase tracking-[0.12em] text-[var(--color-primary)] transition-colors hover:bg-[rgba(var(--color-primary-rgb),0.06)] lg:hidden"
                style={{ borderColor: "rgba(var(--color-primary-rgb),0.2)" }}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filter
                {activeFilterCount > 0 && (
                  <span
                    className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full font-inter text-[9px] text-white"
                    style={{ background: "var(--color-primary)" }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Desktop filters */}
            <div className="hidden border-t border-[rgba(var(--color-primary-rgb),0.1)] pt-4 lg:flex lg:items-start lg:justify-between lg:gap-4">
              <div className="flex flex-wrap gap-2">
                {availabilityTabs.map((opt) => {
                  const active = availability === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setAvailability(opt.value);
                        setPage(1);
                      }}
                      className={`rounded-full border px-4 py-2 font-inter text-[10px] uppercase tracking-[0.12em] transition-colors ${
                        active ? "text-white" : "text-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                      }`}
                      style={{
                        borderColor: active ? "var(--color-primary)" : "rgba(var(--color-primary-rgb),0.16)",
                        background: active ? "var(--color-primary)" : "transparent",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <div className="min-w-0 lg:max-w-[56%]">
                <p className="text-right font-inter text-[10px] uppercase tracking-[0.16em] text-[var(--color-primary)]">Categories</p>
                <div className="admin-filter-scroll mt-2 flex justify-end gap-2 overflow-x-auto pb-1">
                  {categoryTabs.map((tab) => {
                    const active = categorySlug === tab.slug;
                    return (
                      <button
                        key={tab.slug || "all"}
                        type="button"
                        onClick={() => {
                          setCategorySlug(tab.slug);
                          setPage(1);
                        }}
                        className={`shrink-0 rounded-full border px-4 py-2 font-inter text-[10px] uppercase tracking-[0.12em] transition-colors ${
                          active ? "text-white" : "text-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                        }`}
                        style={{
                          borderColor: active ? "var(--color-primary)" : "rgba(var(--color-primary-rgb),0.16)",
                          background: active ? "var(--color-primary)" : "transparent",
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Count + page info */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[rgba(var(--color-primary-rgb),0.1)] pt-3">
              <p className="font-inter text-[11px] uppercase tracking-[0.12em] text-[var(--color-primary)]">
                {totalCount === 0 ? "No products found" : `${totalCount} product${totalCount === 1 ? "" : "s"} found`}
              </p>
              <p className="font-inter text-[11px] text-[var(--color-muted)]">
                Page {Math.min(page, totalPages)} of {totalPages}
              </p>
            </div>
          </div>
        </section>

        {/* Product grid */}
        {isLoading ? (
          <p className="mt-8 py-16 text-center font-inter text-[12px] text-[var(--color-muted-soft)]">Loading products...</p>
        ) : loadError ? (
          <p className="mt-8 py-16 text-center font-inter text-[12px] text-[var(--color-danger)]">{loadError}</p>
        ) : rows.length === 0 ? (
          <p className="mt-8 py-16 text-center font-inter text-[12px] text-[var(--color-muted-soft)]">No products found.</p>
        ) : (
          <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
            {rows.map((product) => {
              const threshold = product.low_stock_threshold ?? 5;
              const isLow = product.stock_quantity <= threshold && product.stock_quantity > 0;
              const isOut = product.stock_quantity === 0;

              return (
                <div key={product.id} className="group relative">
                  {/* Card — entire surface navigates to editor */}
                  <button
                    type="button"
                    onClick={() => openEditor(product.id)}
                    aria-label={`Edit ${product.name}`}
                    className="relative w-full aspect-[3/4] overflow-hidden rounded-[var(--border-radius)] bg-[var(--color-surface-alt)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[var(--color-surface-strong)]">
                        <span className="font-inter text-[24px] font-light text-[var(--color-muted)]">
                          {product.name.slice(0, 1).toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* Hover overlay — name + price */}
                    <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-[rgba(0,0,0,0.68)] to-transparent p-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <p className="line-clamp-2 font-inter text-[10px] leading-snug text-white">{product.name}</p>
                      <p className="mt-0.5 font-inter text-[11px] font-medium text-white/90">{formatCurrency(product.price)}</p>
                    </div>

                    {/* Unavailable badge — top left */}
                    {!product.is_available ? (
                      <span className="absolute top-1.5 left-1.5 rounded-full bg-[rgba(0,0,0,0.55)] px-1.5 py-0.5 font-inter text-[7px] uppercase tracking-[0.06em] text-white/90 backdrop-blur-sm">
                        Off
                      </span>
                    ) : null}

                    {/* Stock badge — bottom left */}
                    {isOut ? (
                      <span className="absolute bottom-1.5 left-1.5 rounded-full bg-[var(--color-danger)] px-1.5 py-0.5 font-inter text-[7px] uppercase tracking-[0.06em] text-white">
                        Out
                      </span>
                    ) : isLow ? (
                      <span className="absolute bottom-1.5 left-1.5 rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 font-inter text-[7px] uppercase tracking-[0.06em] text-white">
                        Low
                      </span>
                    ) : null}
                  </button>

                  {/* Delete button — top right, appears on hover */}
                  <button
                    type="button"
                    disabled={deletingId === product.id}
                    onClick={() => void onDelete(product)}
                    aria-label={`Delete ${product.name}`}
                    className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-[var(--color-muted)] opacity-0 backdrop-blur-sm transition-all duration-200 hover:bg-[var(--color-danger)] hover:text-white group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {deletingId === product.id ? (
                      <span className="h-2.5 w-2.5 animate-spin rounded-full border border-current border-t-transparent" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        <div
          className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border bg-white px-4 py-3"
          style={{ borderColor: "rgba(var(--color-primary-rgb),0.12)" }}
        >
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-full border px-4 py-2 font-inter text-[10px] uppercase tracking-[0.1em] text-[var(--color-primary)] transition-colors hover:bg-[rgba(var(--color-primary-rgb),0.06)] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ borderColor: "rgba(var(--color-primary-rgb),0.2)" }}
          >
            Previous
          </button>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {pageNumbers.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`h-8 min-w-8 rounded-full px-3 font-inter text-[11px] transition-colors ${
                  n === page
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-[var(--color-muted)] hover:bg-[rgba(var(--color-primary-rgb),0.08)] hover:text-[var(--color-primary)]"
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-full border px-4 py-2 font-inter text-[10px] uppercase tracking-[0.1em] text-[var(--color-primary)] transition-colors hover:bg-[rgba(var(--color-primary-rgb),0.06)] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ borderColor: "rgba(var(--color-primary-rgb),0.2)" }}
          >
            Next
          </button>
        </div>
      </div>

      {/* Mobile filter bottom sheet */}
      <FilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        availability={availability}
        setAvailability={setAvailability}
        categorySlug={categorySlug}
        setCategorySlug={setCategorySlug}
        categoryTabs={categoryTabs}
        setPage={setPage}
      />
    </div>
  );
};

export default AdminProductsPage;
