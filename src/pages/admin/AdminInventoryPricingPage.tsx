import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { formatCurrency } from "@/lib/adminFormatting";
import {
  bulkUpdateAdminInventoryPricingRows,
  fetchAdminInventoryPricingRows,
  type AdminInventoryPricingBulkChange,
  type AdminInventoryPricingRow,
} from "@/services/adminService";

interface RowEditState {
  stock: string;
  price: string;
}

interface RowState {
  row: AdminInventoryPricingRow;
  edit: RowEditState;
  baseline: RowEditState;
  dirty: boolean;
  parsedStock: number | null;
  parsedPrice: number | null;
  stockError: string | null;
  priceError: string | null;
  serverError: string | null;
}

interface ProductGroup {
  product_id: string;
  product_name: string;
  product_image_url: string | null;
  hasVariants: boolean;
}

const toEditableNumber = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return "";
  return Number(value).toString();
};

const createInitialEdits = (rows: AdminInventoryPricingRow[]): Record<string, RowEditState> => {
  const next: Record<string, RowEditState> = {};
  for (const row of rows) {
    next[row.row_id] = {
      stock: String(Math.max(0, Math.trunc(row.stock_quantity))),
      price: row.row_type === "variant" ? toEditableNumber(row.variant_price) : toEditableNumber(row.effective_price),
    };
  }
  return next;
};

const parseStockInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return { value: null as number | null, error: "Stock is required." };
  if (!/^\d+$/.test(trimmed)) return { value: null as number | null, error: "Use whole numbers only." };
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || numeric < 0) return { value: null as number | null, error: "Stock cannot be negative." };
  return { value: Math.trunc(numeric), error: null as string | null };
};

const parsePriceInput = (value: string, rowType: AdminInventoryPricingRow["row_type"]) => {
  const trimmed = value.trim();
  if (!trimmed) {
    if (rowType === "variant") return { value: null as number | null, error: null as string | null };
    return { value: null as number | null, error: "Price is required." };
  }
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || numeric < 0) return { value: null as number | null, error: "Enter a valid non-negative price." };
  return { value: numeric, error: null as string | null };
};

const AdminInventoryPricingPage = () => {
  const [rows, setRows] = useState<AdminInventoryPricingRow[]>([]);
  const [edits, setEdits] = useState<Record<string, RowEditState>>({});
  const [searchInput, setSearchInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [panelSaveMessage, setPanelSaveMessage] = useState<{ text: string; tone: "success" | "danger" | "neutral" } | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  const loadRows = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchAdminInventoryPricingRows();
      setRows(data);
      setEdits(createInitialEdits(data));
      setRowErrors({});
    } catch {
      setRows([]);
      setEdits({});
      setLoadError("Unable to load inventory and pricing.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useEffect(() => {
    if (selectedProductId) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedProductId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedProductId(null);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const baselineEdits = useMemo(() => createInitialEdits(rows), [rows]);

  const rowStates = useMemo<RowState[]>(() => {
    return rows.map((row) => {
      const baseline = baselineEdits[row.row_id] ?? {
        stock: String(Math.max(0, Math.trunc(row.stock_quantity))),
        price: row.row_type === "variant" ? toEditableNumber(row.variant_price) : toEditableNumber(row.effective_price),
      };
      const edit = edits[row.row_id] ?? baseline;
      const stockParse = parseStockInput(edit.stock);
      const priceParse = parsePriceInput(edit.price, row.row_type);
      const dirty = edit.stock !== baseline.stock || edit.price !== baseline.price;
      return {
        row,
        edit,
        baseline,
        dirty,
        parsedStock: stockParse.value,
        parsedPrice: priceParse.value,
        stockError: dirty ? stockParse.error : null,
        priceError: dirty ? priceParse.error : null,
        serverError: rowErrors[row.row_id] ?? null,
      };
    });
  }, [baselineEdits, edits, rowErrors, rows]);

  const productGroups = useMemo<ProductGroup[]>(() => {
    const map = new Map<string, ProductGroup>();
    for (const row of rows) {
      if (!map.has(row.product_id)) {
        map.set(row.product_id, {
          product_id: row.product_id,
          product_name: row.product_name,
          product_image_url: row.product_image_url,
          hasVariants: false,
        });
      }
      if (row.row_type === "variant") {
        const group = map.get(row.product_id);
        if (group) group.hasVariants = true;
      }
    }
    return Array.from(map.values());
  }, [rows]);

  const normalizedSearch = searchInput.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!normalizedSearch) return productGroups;
    return productGroups.filter((group) => {
      const groupRows = rows.filter((r) => r.product_id === group.product_id);
      const searchable = [
        group.product_name,
        ...groupRows.map((r) => [r.variant_label ?? "", r.sku ?? "", r.product_sku ?? "", r.variant_sku ?? ""].join(" ")),
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(normalizedSearch);
    });
  }, [normalizedSearch, productGroups, rows]);

  const selectedGroup = useMemo(
    () => productGroups.find((g) => g.product_id === selectedProductId) ?? null,
    [productGroups, selectedProductId],
  );

  const selectedRowStates = useMemo(
    () => rowStates.filter((s) => s.row.product_id === selectedProductId),
    [rowStates, selectedProductId],
  );

  const selectedDirtyStates = useMemo(() => selectedRowStates.filter((s) => s.dirty), [selectedRowStates]);

  const selectedHasInvalid = useMemo(
    () => selectedDirtyStates.some((s) => Boolean(s.stockError) || Boolean(s.priceError)),
    [selectedDirtyStates],
  );

  const selectedValidChanges = useMemo<AdminInventoryPricingBulkChange[]>(
    () =>
      selectedDirtyStates
        .filter((s) => !s.stockError && !s.priceError && typeof s.parsedStock === "number")
        .map((s) => ({
          row_id: s.row.row_id,
          row_type: s.row.row_type,
          product_id: s.row.product_id,
          variant_id: s.row.variant_id,
          stock_quantity: s.parsedStock as number,
          price: s.parsedPrice,
        })),
    [selectedDirtyStates],
  );

  const canSavePanel = selectedValidChanges.length > 0 && !selectedHasInvalid && !isSaving;

  const updateRowEdit = (rowId: string, field: keyof RowEditState, value: string) => {
    setEdits((current) => {
      const existing = current[rowId] ?? baselineEdits[rowId] ?? { stock: "0", price: "" };
      return { ...current, [rowId]: { ...existing, [field]: value } };
    });
    setRowErrors((current) => {
      if (!(rowId in current)) return current;
      const next = { ...current };
      delete next[rowId];
      return next;
    });
    setPanelSaveMessage(null);
  };

  const onUseBasePrice = (rowId: string) => updateRowEdit(rowId, "price", "");

  const onSavePanel = async () => {
    if (!canSavePanel) return;
    setIsSaving(true);
    setPanelSaveMessage(null);
    const previousEdits = edits;
    try {
      const result = await bulkUpdateAdminInventoryPricingRows(selectedValidChanges);
      setRowErrors(result.rowErrors);
      if (result.updatedCount > 0) {
        try {
          const refreshedRows = await fetchAdminInventoryPricingRows();
          const refreshedEdits = createInitialEdits(refreshedRows);
          for (const failedRowId of Object.keys(result.rowErrors)) {
            if (previousEdits[failedRowId] && refreshedEdits[failedRowId]) {
              refreshedEdits[failedRowId] = previousEdits[failedRowId];
            }
          }
          setRows(refreshedRows);
          setEdits(refreshedEdits);
        } catch {
          // Keep current state if refresh fails
        }
      }
      if (result.updatedCount > 0 && result.failedCount === 0) {
        setPanelSaveMessage({ text: `Updated ${result.updatedCount} row${result.updatedCount === 1 ? "" : "s"} successfully.`, tone: "success" });
      } else if (result.updatedCount > 0) {
        setPanelSaveMessage({ text: `Updated ${result.updatedCount}; ${result.failedCount} failed.`, tone: "neutral" });
      } else {
        setPanelSaveMessage({ text: "No rows were updated. Fix errors and try again.", tone: "danger" });
      }
    } catch {
      setPanelSaveMessage({ text: "Save failed. Please try again.", tone: "danger" });
    } finally {
      setIsSaving(false);
    }
  };

  const closePanel = () => {
    setSelectedProductId(null);
    setPanelSaveMessage(null);
  };

  const openPanel = (productId: string) => {
    setPanelSaveMessage(null);
    setSelectedProductId(productId);
  };

  // ── Panel content (shared between bottom sheet & side drawer) ─────────────

  const panelInner = selectedGroup ? (
    <>
      {/* Panel header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-5 py-4 md:px-6 md:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-10 w-8 shrink-0 overflow-hidden rounded-[8px] bg-[var(--color-surface-alt)]">
            {selectedGroup.product_image_url ? (
              <img
                src={selectedGroup.product_image_url}
                alt={selectedGroup.product_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[var(--color-surface-strong)] font-inter text-[13px] uppercase text-[var(--color-muted)]">
                {selectedGroup.product_name.slice(0, 1)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-manrope text-[15px] text-[var(--color-primary)]">{selectedGroup.product_name}</p>
            <p className="mt-0.5 font-inter text-[10px] uppercase tracking-[0.08em] text-[var(--color-muted)]">
              {selectedGroup.hasVariants ? "Has variants" : "Simple product"}
              {selectedDirtyStates.length > 0 ? (
                <span className="ml-2 text-[var(--color-accent)]">· {selectedDirtyStates.length} unsaved</span>
              ) : null}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={closePanel}
          aria-label="Close panel"
          className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center text-[var(--color-muted)] transition-colors hover:text-[var(--color-primary)]"
        >
          <X size={17} strokeWidth={1.5} />
        </button>
      </div>

      {/* Row editors */}
      <div className="flex-1 overflow-y-auto px-5 md:px-6">
        {selectedRowStates.map((state) => (
          <div key={state.row.row_id} className="border-b border-[var(--color-border)] py-5 last:border-0">
            {/* Row heading */}
            <p className="mb-4 font-inter text-[10px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
              {state.row.row_type === "variant" && state.row.variant_label
                ? state.row.variant_label
                : state.row.row_type === "variant"
                  ? "Variant"
                  : selectedGroup.hasVariants
                    ? "Base product"
                    : "Stock & Pricing"}
            </p>

            {state.row.sku ? (
              <p className="mb-3 font-inter text-[10px] text-[var(--color-muted-soft)]">SKU: {state.row.sku}</p>
            ) : null}

            <div className="grid grid-cols-2 gap-5">
              {/* Stock */}
              <label className="block">
                <span className="font-inter text-[10px] uppercase tracking-[0.08em] text-[var(--color-muted-soft)]">Stock</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={state.edit.stock}
                  onChange={(e) => updateRowEdit(state.row.row_id, "stock", e.target.value)}
                  className="mt-1.5 w-full border-0 border-b border-[var(--color-border)] bg-transparent pb-1.5 font-inter text-[14px] text-[var(--color-primary)] outline-none focus:border-[var(--color-primary)]"
                />
                {state.stockError ? (
                  <p className="mt-1 font-inter text-[10px] text-[var(--color-danger)]">{state.stockError}</p>
                ) : null}
              </label>

              {/* Price */}
              <label className="block">
                <span className="font-inter text-[10px] uppercase tracking-[0.08em] text-[var(--color-muted-soft)]">
                  Price{state.row.row_type === "variant" ? " (optional)" : ""}
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={state.edit.price}
                  onChange={(e) => updateRowEdit(state.row.row_id, "price", e.target.value)}
                  placeholder={state.row.row_type === "variant" ? "Use base" : ""}
                  className="mt-1.5 w-full border-0 border-b border-[var(--color-border)] bg-transparent pb-1.5 font-inter text-[14px] text-[var(--color-primary)] outline-none placeholder:text-[var(--color-muted-soft)] focus:border-[var(--color-primary)]"
                />
                {state.row.row_type === "variant" ? (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onUseBasePrice(state.row.row_id)}
                      className="font-inter text-[10px] uppercase tracking-[0.08em] text-[var(--color-accent)] transition-colors hover:text-[var(--color-primary)]"
                    >
                      Use base
                    </button>
                    {state.parsedPrice === null ? (
                      <span className="font-inter text-[10px] text-[var(--color-muted-soft)]">
                        Base: {formatCurrency(state.row.product_base_price)}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {state.priceError ? (
                  <p className="mt-1 font-inter text-[10px] text-[var(--color-danger)]">{state.priceError}</p>
                ) : null}
              </label>
            </div>

            {state.serverError ? (
              <p className="mt-2 font-inter text-[10px] text-[var(--color-danger)]">{state.serverError}</p>
            ) : null}
          </div>
        ))}
      </div>

      {/* Panel footer */}
      <div className="shrink-0 border-t border-[var(--color-border)] px-5 py-4 md:px-6 md:py-5">
        {panelSaveMessage ? (
          <p
            className={`mb-3 font-inter text-[11px] ${
              panelSaveMessage.tone === "success"
                ? "text-[var(--color-success)]"
                : panelSaveMessage.tone === "danger"
                  ? "text-[var(--color-danger)]"
                  : "text-[var(--color-primary)]"
            }`}
          >
            {panelSaveMessage.text}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => void onSavePanel()}
          disabled={!canSavePanel}
          className="w-full rounded-[var(--border-radius)] bg-[var(--color-primary)] py-3 font-inter text-[11px] uppercase tracking-[0.1em] text-[var(--color-secondary)] transition-colors hover:bg-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </>
  ) : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="admin-page">
      {/* Page header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title font-manrope text-[36px] text-[var(--color-primary)]">Inventory & Pricing</h1>
          <p className="mt-2 font-inter text-[12px] text-[var(--color-muted)]">
            Tap a product to update stock and pricing.
          </p>
        </div>
      </div>

      {/* Search + count */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div className="admin-search-wrap w-full max-w-[360px]">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by product name or SKU..."
            className="w-full border-0 border-b border-[var(--color-border)] bg-transparent px-0 pb-2 font-inter text-[12px] text-[var(--color-primary)] outline-none placeholder:text-[var(--color-muted-soft)] focus:border-[var(--color-primary)]"
          />
        </div>
        <p className="font-inter text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">
          {isLoading ? "—" : `${filteredGroups.length} products`}
        </p>
      </div>

      {/* Product grid */}
      {isLoading ? (
        <p className="py-16 text-center font-inter text-[12px] text-[var(--color-muted-soft)]">Loading products...</p>
      ) : loadError ? (
        <p className="py-16 text-center font-inter text-[12px] text-[var(--color-danger)]">{loadError}</p>
      ) : filteredGroups.length === 0 ? (
        <p className="py-16 text-center font-inter text-[12px] text-[var(--color-muted-soft)]">No products found.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
          {filteredGroups.map((group) => {
            const hasDirty = rowStates.some((s) => s.row.product_id === group.product_id && s.dirty);
            const isSelected = selectedProductId === group.product_id;

            return (
              <button
                key={group.product_id}
                type="button"
                onClick={() => openPanel(group.product_id)}
                aria-label={`Edit ${group.product_name}`}
                className={`group relative aspect-[3/4] w-full overflow-hidden rounded-[var(--border-radius)] bg-[var(--color-surface-alt)] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${
                  isSelected
                    ? "ring-2 ring-[var(--color-primary)] ring-offset-2"
                    : "hover:shadow-[0_4px_20px_rgba(var(--color-navbar-solid-foreground-rgb),0.12)]"
                }`}
              >
                {group.product_image_url ? (
                  <img
                    src={group.product_image_url}
                    alt={group.product_name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[var(--color-surface-strong)]">
                    <span className="font-inter text-[24px] font-light text-[var(--color-muted)]">
                      {group.product_name.slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Name overlay on hover */}
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-[rgba(0,0,0,0.65)] to-transparent p-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <p className="line-clamp-2 font-inter text-[10px] leading-snug text-white">{group.product_name}</p>
                </div>

                {/* Unsaved dot */}
                {hasDirty ? (
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[var(--color-accent)] shadow-sm" />
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Mobile bottom sheet ─────────────────────────────────────────────── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[40] bg-[rgba(var(--color-navbar-solid-foreground-rgb),0.5)] transition-opacity duration-300 md:hidden ${
          selectedProductId ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closePanel}
      />
      {/* Sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-[50] flex max-h-[88dvh] flex-col rounded-t-[16px] bg-[var(--color-secondary)] transition-transform duration-300 [transition-timing-function:cubic-bezier(0.77,0,0.175,1)] md:hidden ${
          selectedProductId ? "translate-y-0" : "translate-y-full"
        }`}
        aria-modal={Boolean(selectedProductId)}
        aria-hidden={!selectedProductId}
      >
        {/* Pull handle */}
        <div className="flex shrink-0 justify-center pt-3 pb-0">
          <div className="h-[3px] w-10 rounded-full bg-[var(--color-border)]" />
        </div>
        {panelInner}
      </div>

      {/* ── Desktop / Tablet side drawer ────────────────────────────────────── */}
      <div
        className={`fixed inset-y-0 right-0 z-[50] hidden w-[420px] max-w-[90vw] flex-col bg-[var(--color-secondary)] shadow-[-4px_0_40px_rgba(var(--color-navbar-solid-foreground-rgb),0.10)] transition-transform duration-300 [transition-timing-function:cubic-bezier(0.77,0,0.175,1)] md:flex ${
          selectedProductId ? "translate-x-0" : "translate-x-full"
        }`}
        aria-modal={Boolean(selectedProductId)}
        aria-hidden={!selectedProductId}
      >
        {panelInner}
      </div>
    </div>
  );
};

export default AdminInventoryPricingPage;
