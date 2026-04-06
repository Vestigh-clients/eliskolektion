import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import StorefrontProductCard from "@/components/products/StorefrontProductCard";
import ProductFetchErrorState from "@/components/products/ProductFetchErrorState";
import { useCart } from "@/contexts/CartContext";
import { useStorefrontConfig } from "@/contexts/StorefrontConfigContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatPrice } from "@/lib/price";
import { getAllProducts } from "@/services/productService";
import {
  getPrimaryImage,
  getStockQuantity,
  isInStock,
  type Product,
} from "@/types/product";

type ShopFilter = "all" | string;
type SortKey = "newest" | "price-low" | "price-high" | "popular";

interface CategoryFilterItem {
  slug: string;
  label: string;
}

interface VariationFilterOption {
  id: string;
  label: string;
  colorHex: string | null;
  displayOrder: number;
  count: number;
}

interface VariationFilterType {
  id: string;
  name: string;
  displayOrder: number;
  hasColorSwatches: boolean;
  options: VariationFilterOption[];
}

interface FilterPanelProps {
  activeFilter: ShopFilter;
  activeFilterCount: number;
  categoryCounts: Record<string, number>;
  categoryFilterItems: CategoryFilterItem[];
  clearAllFilters: () => void;
  priceCeiling: number;
  priceLimit: number;
  selectedVariationOptionIdsByType: Record<string, string[]>;
  setActiveFilter: (nextFilter: ShopFilter) => void;
  setPriceLimit: (value: number) => void;
  toggleVariationFilterOption: (typeId: string, optionId: string) => void;
  variationFilterTypes: VariationFilterType[];
}

const DEFAULT_PRICE_CEILING = 1000;
const SHOP_PAGE_SIZE_DESKTOP = 6;
const SHOP_PAGE_SIZE_MOBILE = 8;

const normalizeColorHex = (colorHex: string | null) => {
  if (!colorHex) return null;
  const normalized = colorHex.trim();
  if (/^#([a-f\d]{3}|[a-f\d]{6})$/i.test(normalized)) return normalized;
  return null;
};

const normalizeVariationTypeKey = (name: string) => name.trim().toLowerCase();
const normalizeVariationOptionKey = (label: string) => label.trim().toLowerCase();

const getAvailableVariantOptionIdsByType = (product: Product) => {
  const result = new Map<string, Set<string>>();
  const variants = product.product_variants ?? [];

  for (const variant of variants) {
    if (!variant.is_available || variant.stock_quantity <= 0) continue;
    for (const optionLink of variant.product_variant_options) {
      if (!result.has(optionLink.option_type_id)) {
        result.set(optionLink.option_type_id, new Set<string>());
      }
      result.get(optionLink.option_type_id)?.add(optionLink.option_value_id);
    }
  }

  return result;
};

const getProductOptionIdsByType = (product: Product) => {
  const optionTypes = product.product_option_types ?? [];
  if (optionTypes.length === 0) return new Map<string, Set<string>>();

  const availableByType = getAvailableVariantOptionIdsByType(product);
  const hasAvailableVariantConstraints = availableByType.size > 0;
  const result = new Map<string, Set<string>>();

  for (const optionType of optionTypes) {
    const typeKey = normalizeVariationTypeKey(optionType.name);
    if (!typeKey) continue;

    const ids = result.get(typeKey) ?? new Set<string>();
    const allowedIds = availableByType.get(optionType.id);

    for (const optionValue of optionType.product_option_values) {
      const optionLabel = optionValue.value.trim();
      if (!optionLabel) continue;
      if (hasAvailableVariantConstraints && (!allowedIds || !allowedIds.has(optionValue.id))) continue;
      const optionKey = normalizeVariationOptionKey(optionLabel);
      if (!optionKey) continue;
      ids.add(optionKey);
    }

    if (ids.size > 0) result.set(typeKey, ids);
  }

  return result;
};

const collectVariationFilterTypes = (products: Product[]): VariationFilterType[] => {
  const typeMap = new Map<
    string,
    { id: string; name: string; displayOrder: number; options: Map<string, VariationFilterOption> }
  >();

  for (const product of products) {
    const optionIdsByType = getProductOptionIdsByType(product);
    const optionTypes = product.product_option_types ?? [];
    const seenOptionKeysByType = new Map<string, Set<string>>();

    for (const optionType of optionTypes) {
      const typeKey = normalizeVariationTypeKey(optionType.name);
      if (!typeKey) continue;

      const availableOptionIds = optionIdsByType.get(typeKey);
      if (!availableOptionIds || availableOptionIds.size === 0) continue;

      if (!typeMap.has(typeKey)) {
        typeMap.set(typeKey, {
          id: typeKey,
          name: optionType.name.trim() || "Variation",
          displayOrder: optionType.display_order,
          options: new Map<string, VariationFilterOption>(),
        });
      }

      const typeEntry = typeMap.get(typeKey);
      if (!typeEntry) continue;

      typeEntry.displayOrder = Math.min(typeEntry.displayOrder, optionType.display_order);
      const seenInProduct = seenOptionKeysByType.get(typeKey) ?? new Set<string>();
      seenOptionKeysByType.set(typeKey, seenInProduct);

      for (const optionValue of optionType.product_option_values) {
        const optionLabel = optionValue.value.trim();
        if (!optionLabel) continue;
        const optionKey = normalizeVariationOptionKey(optionLabel);
        if (!optionKey || !availableOptionIds.has(optionKey)) continue;

        const existing = typeEntry.options.get(optionKey);
        const normalizedColor = normalizeColorHex(optionValue.color_hex);
        if (!existing) {
          typeEntry.options.set(optionKey, {
            id: optionKey,
            label: optionLabel,
            colorHex: normalizedColor,
            displayOrder: optionValue.display_order,
            count: seenInProduct.has(optionKey) ? 0 : 1,
          });
        } else {
          if (!seenInProduct.has(optionKey)) existing.count += 1;
          existing.displayOrder = Math.min(existing.displayOrder, optionValue.display_order);
          if (!existing.colorHex && normalizedColor) existing.colorHex = normalizedColor;
        }

        seenInProduct.add(optionKey);
      }
    }
  }

  return Array.from(typeMap.values())
    .map((typeEntry) => {
      const options = Array.from(typeEntry.options.values()).sort((l, r) => {
        if (l.displayOrder !== r.displayOrder) return l.displayOrder - r.displayOrder;
        return l.label.localeCompare(r.label);
      });
      return {
        id: typeEntry.id,
        name: typeEntry.name,
        displayOrder: typeEntry.displayOrder,
        hasColorSwatches: options.some((o) => Boolean(o.colorHex)),
        options,
      };
    })
    .filter((t) => t.options.length > 0)
    .sort((l, r) => {
      if (l.displayOrder !== r.displayOrder) return l.displayOrder - r.displayOrder;
      return l.name.localeCompare(r.name);
    });
};

const sanitizeSelectedVariationFilters = (
  current: Record<string, string[]>,
  variationFilterTypes: VariationFilterType[],
) => {
  const allowedByType = new Map<string, Set<string>>();
  for (const typeEntry of variationFilterTypes) {
    allowedByType.set(typeEntry.id, new Set(typeEntry.options.map((o) => o.id)));
  }

  const next: Record<string, string[]> = {};
  let changed = false;

  for (const [typeId, selectedIds] of Object.entries(current)) {
    const allowed = allowedByType.get(typeId);
    if (!allowed) { changed = true; continue; }
    const filtered = selectedIds.filter((id) => allowed.has(id));
    if (filtered.length === 0) { if (selectedIds.length > 0) changed = true; continue; }
    if (filtered.length !== selectedIds.length) changed = true;
    next[typeId] = filtered;
  }

  if (!changed && Object.keys(next).length !== Object.keys(current).length) changed = true;
  return { next, changed };
};

const productMatchesVariationFilters = (
  product: Product,
  selectedVariationOptionIdsByType: Record<string, string[]>,
) => {
  const selections = Object.entries(selectedVariationOptionIdsByType).filter(([, ids]) => ids.length > 0);
  if (selections.length === 0) return true;

  const productOptionIdsByType = getProductOptionIdsByType(product);
  for (const [typeId, selectedIds] of selections) {
    const productOptionIds = productOptionIdsByType.get(typeId);
    if (!productOptionIds || productOptionIds.size === 0) return false;
    if (!selectedIds.some((id) => productOptionIds.has(id))) return false;
  }

  return true;
};

// ── Filter Panel ──────────────────────────────────────────────────────────────

const FilterPanel = ({
  activeFilter,
  activeFilterCount,
  categoryCounts,
  categoryFilterItems,
  clearAllFilters,
  priceCeiling,
  priceLimit,
  selectedVariationOptionIdsByType,
  setActiveFilter,
  setPriceLimit,
  toggleVariationFilterOption,
  variationFilterTypes,
}: FilterPanelProps) => {
  const heading = "text-xs font-black tracking-widest uppercase mb-5 text-zinc-400 font-manrope";

  return (
    <div className="space-y-10">
      {/* Filter header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-black tracking-widest uppercase text-zinc-400 font-manrope">
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </span>
        {activeFilterCount > 0 ? (
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-black transition-colors font-manrope"
          >
            Clear All
          </button>
        ) : null}
      </div>

      {/* Categories */}
      {categoryFilterItems.length > 0 ? (
        <div>
          <h3 className={heading}>Categories</h3>
          <ul className="space-y-3">
            <li>
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className="flex justify-between items-center w-full group"
              >
                <span
                  className={[
                    "text-sm font-bold font-manrope transition-colors",
                    activeFilter === "all" ? "text-[#E8A811]" : "text-zinc-500 group-hover:text-black",
                  ].join(" ")}
                >
                  All
                </span>
                <span
                  className={[
                    "text-xs font-manrope",
                    activeFilter === "all" ? "text-[#E8A811]" : "text-zinc-300",
                  ].join(" ")}
                >
                  ({Object.values(categoryCounts).reduce((a, b) => a + b, 0)})
                </span>
              </button>
            </li>
            {categoryFilterItems.map((category) => {
              const isActive = activeFilter === category.slug;
              return (
                <li key={category.slug}>
                  <button
                    type="button"
                    onClick={() => setActiveFilter(isActive ? "all" : category.slug)}
                    className="flex justify-between items-center w-full group"
                  >
                    <span
                      className={[
                        "text-sm font-bold font-manrope transition-colors",
                        isActive ? "text-[#E8A811]" : "text-zinc-500 group-hover:text-black",
                      ].join(" ")}
                    >
                      {category.label}
                    </span>
                    <span
                      className={[
                        "text-xs font-manrope",
                        isActive ? "text-[#E8A811]" : "text-zinc-300",
                      ].join(" ")}
                    >
                      ({categoryCounts[category.slug] ?? 0})
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {/* Variation filters */}
      {variationFilterTypes.map((variationType) => {
        const selectedIds = selectedVariationOptionIdsByType[variationType.id] ?? [];

        return (
          <div key={variationType.id}>
            <h3 className={heading}>{variationType.name}</h3>

            {variationType.hasColorSwatches ? (
              /* Color swatch chips */
              <div className="flex flex-wrap gap-2">
                {variationType.options.map((option) => {
                  const isSelected = selectedIds.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleVariationFilterOption(variationType.id, option.id)}
                      title={`${option.label} (${option.count})`}
                      className={[
                        "flex items-center gap-1.5 px-3 py-1.5 text-xs font-manrope font-bold border transition-all",
                        isSelected
                          ? "bg-black text-white border-black"
                          : "bg-white border-zinc-200 text-zinc-600 hover:border-black",
                      ].join(" ")}
                    >
                      {option.colorHex ? (
                        <span
                          className="w-3 h-3 rounded-full border border-zinc-200 shrink-0"
                          style={{ backgroundColor: option.colorHex }}
                          aria-hidden="true"
                        />
                      ) : null}
                      {option.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Button grid (sizes, etc.) */
              <div className="grid grid-cols-4 gap-2">
                {variationType.options.map((option) => {
                  const isSelected = selectedIds.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleVariationFilterOption(variationType.id, option.id)}
                      title={`${option.label} (${option.count})`}
                      className={[
                        "h-10 text-xs font-black font-manrope transition-all",
                        isSelected
                          ? "bg-black text-white"
                          : "bg-zinc-50 border border-transparent hover:border-black",
                      ].join(" ")}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Price Range */}
      <div>
        <h3 className={heading}>Price</h3>
        <div className="space-y-4">
          <input
            type="range"
            min={0}
            max={priceCeiling}
            value={priceLimit}
            onChange={(e) => setPriceLimit(Number(e.target.value))}
            className="w-full h-1 cursor-pointer appearance-none bg-zinc-200 accent-[#E8A811]"
          />
          <div className="flex justify-between text-xs font-bold font-manrope">
            <span>{formatPrice(0)}</span>
            <span>{formatPrice(priceLimit)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Shop Page ─────────────────────────────────────────────────────────────────

const Shop = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToCart } = useCart();
  const { storefrontCategories } = useStorefrontConfig();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [priceLimit, setPriceLimit] = useState(DEFAULT_PRICE_CEILING);
  const [selectedVariationOptionIdsByType, setSelectedVariationOptionIdsByType] = useState<Record<string, string[]>>({});
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(SHOP_PAGE_SIZE_DESKTOP);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAllProducts();
        setProducts(data ?? []);
      } catch (fetchError) {
        console.error(fetchError);
        setError("Failed to load products. Please refresh.");
      } finally {
        setLoading(false);
      }
    };

    void fetchProducts();
  }, []);

  const categoryFilterItems = useMemo(() => {
    const fromBackend = storefrontCategories
      .map((c) => ({ slug: c.slug.trim().toLowerCase(), label: c.name.trim() || "Category" }))
      .filter((c) => Boolean(c.slug));

    if (fromBackend.length > 0) return fromBackend;

    const seen = new Set<string>();
    return products
      .map((p) => ({
        slug: (p.categories?.slug ?? "").trim().toLowerCase(),
        label: (p.categories?.name ?? "").trim(),
      }))
      .filter((c) => {
        if (!c.slug || seen.has(c.slug)) return false;
        seen.add(c.slug);
        return true;
      })
      .map((c) => ({ slug: c.slug, label: c.label || "Category" }));
  }, [products, storefrontCategories]);

  const categoryLookup = useMemo(() => new Set(categoryFilterItems.map((i) => i.slug)), [categoryFilterItems]);
  const requestedCategory = (searchParams.get("category") ?? "").trim().toLowerCase();
  const activeFilter: ShopFilter = requestedCategory && categoryLookup.has(requestedCategory) ? requestedCategory : "all";
  const normalizedSearchTerm = (searchParams.get("q") ?? "").trim().toLowerCase();

  const setActiveFilter = (nextFilter: ShopFilter) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextFilter === "all") {
      nextParams.delete("category");
    } else {
      nextParams.set("category", nextFilter);
    }
    const query = nextParams.toString();
    navigate(query ? `/shop?${query}` : "/shop");
  };

  const searchedProducts = useMemo(() => {
    if (!normalizedSearchTerm) return products;
    return products.filter((p) => {
      const fields = [p.name, p.short_description ?? "", p.description ?? "", p.categories?.name ?? ""];
      return fields.some((f) => f.toLowerCase().includes(normalizedSearchTerm));
    });
  }, [normalizedSearchTerm, products]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of searchedProducts) {
      const slug = (p.categories?.slug ?? "").trim().toLowerCase();
      if (!slug) continue;
      counts[slug] = (counts[slug] ?? 0) + 1;
    }
    return counts;
  }, [searchedProducts]);

  const productsByCategoryAndSearch = useMemo(() => {
    if (activeFilter === "all") return searchedProducts;
    return searchedProducts.filter((p) => (p.categories?.slug ?? "").trim().toLowerCase() === activeFilter);
  }, [activeFilter, searchedProducts]);

  const variationFilterTypes = useMemo(
    () => collectVariationFilterTypes(productsByCategoryAndSearch),
    [productsByCategoryAndSearch],
  );

  useEffect(() => {
    setSelectedVariationOptionIdsByType((current) => {
      const { next, changed } = sanitizeSelectedVariationFilters(current, variationFilterTypes);
      return changed ? next : current;
    });
  }, [variationFilterTypes]);

  const priceCeiling = useMemo(() => {
    const max = products.reduce((m, p) => Math.max(m, Number(p.price) || 0), 0);
    if (max <= DEFAULT_PRICE_CEILING) return DEFAULT_PRICE_CEILING;
    return Math.ceil(max / 100) * 100;
  }, [products]);

  useEffect(() => {
    setPriceLimit(priceCeiling);
  }, [priceCeiling]);

  const filteredProducts = useMemo(() => {
    const afterVariation = productsByCategoryAndSearch.filter((p) =>
      productMatchesVariationFilters(p, selectedVariationOptionIdsByType),
    );
    const afterPrice = afterVariation.filter((p) => Number(p.price) <= priceLimit);
    const next = [...afterPrice];

    switch (sortBy) {
      case "price-low": next.sort((a, b) => Number(a.price) - Number(b.price)); break;
      case "price-high": next.sort((a, b) => Number(b.price) - Number(a.price)); break;
      case "popular":
        next.sort((a, b) => {
          if ((a.is_featured ?? false) === (b.is_featured ?? false)) return a.name.localeCompare(b.name);
          return a.is_featured ? -1 : 1;
        });
        break;
      default: break;
    }

    return next;
  }, [priceLimit, productsByCategoryAndSearch, selectedVariationOptionIdsByType, sortBy]);

  const shopPageSize = isMobile ? SHOP_PAGE_SIZE_MOBILE : SHOP_PAGE_SIZE_DESKTOP;
  const visibleProducts = useMemo(() => filteredProducts.slice(0, visibleCount), [filteredProducts, visibleCount]);
  const hasMoreProducts = visibleCount < filteredProducts.length;

  useEffect(() => {
    setVisibleCount(shopPageSize);
  }, [filteredProducts, shopPageSize]);

  // Infinite scroll
  useEffect(() => {
    const loadMoreNode = loadMoreRef.current;
    if (!loadMoreNode || loading || !hasMoreProducts) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        setVisibleCount((current) => Math.min(current + shopPageSize, filteredProducts.length));
      },
      { root: null, rootMargin: "320px 0px", threshold: 0 },
    );

    observer.observe(loadMoreNode);
    return () => observer.disconnect();
  }, [filteredProducts.length, hasMoreProducts, isMobile, loading, shopPageSize, visibleProducts.length]);

  const toggleVariationFilterOption = (typeId: string, optionId: string) => {
    setSelectedVariationOptionIdsByType((current) => {
      const currentSelected = current[typeId] ?? [];
      const nextSelected = currentSelected.includes(optionId)
        ? currentSelected.filter((id) => id !== optionId)
        : [...currentSelected, optionId];
      const next = { ...current };
      if (nextSelected.length === 0) { delete next[typeId]; } else { next[typeId] = nextSelected; }
      return next;
    });
  };

  const clearAllFilters = () => {
    setSelectedVariationOptionIdsByType({});
    setPriceLimit(priceCeiling);
    setActiveFilter("all");
  };

  const selectedVariationCount = Object.values(selectedVariationOptionIdsByType).reduce((sum, v) => sum + v.length, 0);
  const activeFilterCount =
    (activeFilter === "all" ? 0 : 1) + selectedVariationCount + (priceLimit < priceCeiling ? 1 : 0);

  const handleAddToCart = (product: Product) => {
    const basePayload = {
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      category: product.categories?.name?.trim() || "Collection",
      image_url: getPrimaryImage(product),
      image_alt: product.name,
    };

    if (product.has_variants) {
      const firstAvailableVariant = (product.product_variants ?? []).find(
        (v) => v.is_available && v.stock_quantity > 0,
      );
      if (!firstAvailableVariant) return;

      const optionValueById = new Map<string, string>();
      for (const optionType of product.product_option_types ?? []) {
        for (const optionValue of optionType.product_option_values) {
          const label = optionValue.value.trim();
          if (label) optionValueById.set(optionValue.id, label);
        }
      }

      const derivedVariantLabel = firstAvailableVariant.product_variant_options
        .map((link) => optionValueById.get(link.option_value_id) ?? "")
        .filter(Boolean)
        .join(" / ");

      addToCart({
        ...basePayload,
        price: firstAvailableVariant.price ?? product.price,
        compare_at_price: firstAvailableVariant.compare_at_price ?? product.compare_at_price ?? null,
        sku: firstAvailableVariant.sku ?? product.sku ?? null,
        stock_quantity: firstAvailableVariant.stock_quantity,
        variant_id: firstAvailableVariant.id,
        variant_label: firstAvailableVariant.label?.trim() || derivedVariantLabel || null,
      });
      return;
    }

    if (!isInStock(product)) return;

    addToCart({
      ...basePayload,
      price: product.price,
      compare_at_price: product.compare_at_price ?? null,
      sku: product.sku ?? null,
      stock_quantity: getStockQuantity(product),
      variant_id: null,
      variant_label: null,
    });
  };

  const filterPanelProps = {
    activeFilter,
    activeFilterCount,
    categoryCounts,
    categoryFilterItems,
    clearAllFilters,
    priceCeiling,
    priceLimit,
    selectedVariationOptionIdsByType,
    setActiveFilter,
    setPriceLimit,
    toggleVariationFilterOption,
    variationFilterTypes,
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-14 md:py-16">
        <ProductFetchErrorState />
      </div>
    );
  }

  return (
    <div className="bg-[#f9f9f9] font-inter text-[#1a1c1c]">
      <main className="max-w-[1440px] mx-auto px-8 pt-12 pb-24">

        {/* ── Editorial Header ── */}
        <section className="mb-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-zinc-200 pb-8">
            <div className="max-w-2xl">
              <h1 className="font-manrope font-extrabold text-5xl md:text-6xl tracking-tighter leading-none mb-6 uppercase">
                All Pieces
              </h1>
              <p className="text-zinc-500 text-lg leading-relaxed">
                A meticulously curated selection of the season's most essential pieces.
                From limited drops to high-performance streetwear.
              </p>
            </div>

            {/* Sort — desktop */}
            <div className="hidden md:flex items-center gap-4 shrink-0">
              <span className="text-xs font-semibold tracking-widest uppercase text-zinc-400 font-manrope">
                Sort by:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="text-sm font-bold border-0 border-b border-black bg-transparent pb-1 focus:ring-0 cursor-pointer font-manrope pr-6 appearance-none"
              >
                <option value="newest">Newest Arrivals</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="popular">Most Popular</option>
              </select>
              <span className="material-symbols-outlined text-sm pointer-events-none -ml-5">expand_more</span>
            </div>
          </div>
        </section>

        <div className="flex flex-col lg:flex-row gap-12">

          {/* ── Sidebar ── */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            {/* Mobile toolbar */}
            <div className="lg:hidden mb-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(true)}
                className="flex items-center gap-2 text-xs font-black uppercase tracking-widest border-b border-black pb-1 font-manrope"
              >
                <span className="material-symbols-outlined text-sm">tune</span>
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-400 font-manrope uppercase tracking-widest">
                  {loading ? "—" : filteredProducts.length} pieces
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="text-xs font-bold border-0 bg-transparent focus:ring-0 cursor-pointer font-manrope"
                >
                  <option value="newest">Newest</option>
                  <option value="price-low">Price ↑</option>
                  <option value="price-high">Price ↓</option>
                  <option value="popular">Popular</option>
                </select>
              </div>
            </div>

            {/* Desktop sticky filter panel */}
            <div className="hidden lg:block sticky top-24 max-h-[calc(100dvh-7.5rem)] overflow-y-auto hide-scrollbar">
              <FilterPanel {...filterPanelProps} />
            </div>
          </aside>

          {/* ── Product Grid ── */}
          <section className="flex-1 min-w-0">
            {/* Count bar */}
            <div className="mb-8">
              <p className="text-xs font-manrope uppercase tracking-widest text-zinc-400">
                {loading
                  ? "Loading pieces..."
                  : `Showing ${visibleProducts.length} of ${filteredProducts.length} pieces`}
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-12">
                {Array.from({ length: shopPageSize }).map((_, i) => (
                  <div key={`skeleton-${i}`} className="animate-pulse">
                    <div className="mb-5 aspect-[4/5] bg-zinc-100" />
                    <div className="h-5 w-2/3 bg-zinc-100 mb-2" />
                    <div className="h-4 w-1/3 bg-zinc-100" />
                  </div>
                ))}
              </div>
            ) : visibleProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-12">
                {visibleProducts.map((product) => (
                  <StorefrontProductCard
                    key={product.id}
                    product={product}
                    onAction={handleAddToCart}
                    actionLabel="Add to Bag"
                  />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <p className="font-manrope text-sm text-zinc-400 uppercase tracking-widest">
                  No products match the selected filters.
                </p>
              </div>
            )}

            {/* Infinite scroll sentinel */}
            {!loading && visibleProducts.length > 0 ? (
              <div className="mt-16 border-t border-zinc-200 pt-8">
                <div ref={loadMoreRef} className="h-1 w-full" aria-hidden />
                <p className="text-center font-manrope text-xs uppercase tracking-widest text-zinc-400">
                  {hasMoreProducts ? "Loading more as you scroll..." : "You've seen all pieces"}
                </p>
              </div>
            ) : null}
          </section>
        </div>
      </main>

      {/* ── Mobile Filter Drawer ── */}
      <Drawer open={isMobileFilterOpen} onOpenChange={setIsMobileFilterOpen}>
        <DrawerContent className="max-h-[88vh] bg-[#f9f9f9] border-zinc-200">
          <DrawerHeader className="border-b border-zinc-200 pb-4">
            <div className="flex items-center justify-between">
              <DrawerTitle className="font-manrope font-black text-lg uppercase tracking-tighter">
                Filter Pieces
              </DrawerTitle>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex items-center justify-center w-8 h-8 text-zinc-500 hover:text-black transition-colors"
                aria-label="Close filters"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          </DrawerHeader>

          <div className="overflow-y-auto px-6 pb-6 pt-5">
            <FilterPanel {...filterPanelProps} />
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(false)}
              className="mt-8 w-full bg-black text-white py-4 font-manrope font-black text-xs uppercase tracking-widest hover:bg-[#E8A811] hover:text-black transition-colors"
            >
              Show {filteredProducts.length} Pieces
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default Shop;
