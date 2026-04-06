import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import TryOnModal from "@/components/TryOnModal";
import ProductFetchErrorState from "@/components/products/ProductFetchErrorState";
import ProductImagePlaceholder from "@/components/products/ProductImagePlaceholder";
import { storeConfig } from "@/config/store.config";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useThemeConfig } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { getCategoryLabel } from "@/lib/categories";
import { buildAuthModalSearch, buildPathWithSearch } from "@/lib/authModal";
import { formatPrice } from "@/lib/price";
import { shouldShowPriceVariesByVariantNote } from "@/lib/productPricing";
import { fetchActiveShippingRates, type ShippingRateRow } from "@/services/orderService";
import { getPaymentSettings, type PaymentSettings } from "@/services/paymentSettingsService";
import { getFeaturedProducts, getRelatedProducts } from "@/services/productService";
import {
  buildReviewerDisplayName,
  fetchCustomerProductReview,
  fetchProductReviews,
  submitProductReview,
  type ProductReview,
  type ProductReviewSummary,
} from "@/services/reviewService";
import {
  getStockQuantity,
  getPrimaryImage,
  isInStock,
  type Product,
  type ProductOptionType,
  type ProductOptionValue,
  type ProductVariant,
} from "@/types/product";
import { ChevronLeft, ChevronRight, Star, X } from "lucide-react";

const REVIEW_STAR_LEVELS = [5, 4, 3, 2, 1] as const;

const createEmptyReviewSummary = (): ProductReviewSummary => ({
  averageRating: 0,
  totalReviews: 0,
  distribution: {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  },
});

const toDisplayRating = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(5, value));
};

const StarRating = ({
  rating,
  className = "h-4 w-4",
}: {
  rating: number;
  className?: string;
}) => {
  const safeRating = toDisplayRating(rating);
  return (
    <div className="flex items-center gap-1" aria-label={`${safeRating.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => {
        const position = index + 1;
        const isFilled = safeRating >= position;
        return (
          <Star
            key={`rating-star-${position}`}
            className={`${className} ${isFilled ? "text-primary" : "text-on-surface-variant/35"}`}
            fill={isFilled ? "currentColor" : "none"}
            strokeWidth={1.5}
            aria-hidden
          />
        );
      })}
    </div>
  );
};

const formatReviewDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Recently";
  }

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const RelatedProductSkeleton = () => (
  <div className="flex h-full flex-col">
    <div className="lux-product-shimmer aspect-[4/5] w-full" />
    <div className="mt-3 space-y-2">
      <div className="lux-product-shimmer h-4 w-2/3" />
      <div className="lux-product-shimmer h-3 w-1/3" />
    </div>
  </div>
);

const RelatedProductTile = ({ product }: { product: Product }) => {
  const [hasImageError, setHasImageError] = useState(false);
  const imageUrl = getPrimaryImage(product);

  useEffect(() => {
    setHasImageError(false);
  }, [imageUrl, product.id]);

  return (
    <article className="group cursor-pointer">
      <Link to={`/shop/${product.slug}`} className="mb-4 block">
        <div className="relative overflow-hidden bg-white">
          {imageUrl && !hasImageError ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-80 object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onError={() => setHasImageError(true)}
            />
          ) : (
            <ProductImagePlaceholder className="h-80 w-full" />
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md py-3 text-[10px] font-bold uppercase tracking-widest text-center opacity-0 translate-y-full group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
            Quick Add
          </div>
        </div>
      </Link>
      <Link to={`/shop/${product.slug}`} className="block space-y-1">
        <h4 className="font-manrope font-bold text-sm text-black">{product.name}</h4>
        {product.categories?.name ? (
          <p className="text-zinc-500 text-[10px] uppercase font-medium mb-1">{product.categories.name}</p>
        ) : null}
        <p className="text-xs font-bold text-[#E8A811]">{formatPrice(product.price)}</p>
      </Link>
    </article>
  );
};

const clothingSizeGuideRows = [
  { size: "XS", chest: "84-88", waist: "68-72", hips: "88-92" },
  { size: "S", chest: "89-94", waist: "73-78", hips: "93-98" },
  { size: "M", chest: "95-102", waist: "79-86", hips: "99-106" },
  { size: "L", chest: "103-110", waist: "87-94", hips: "107-114" },
  { size: "XL", chest: "111-118", waist: "95-102", hips: "115-122" },
  { size: "XXL", chest: "119-126", waist: "103-110", hips: "123-130" },
];

const shoeSizeGuideRows = [
  { uk: "3", eu: "36", us: "5", foot: "22.5" },
  { uk: "4", eu: "37", us: "6", foot: "23.2" },
  { uk: "5", eu: "38", us: "7", foot: "24.0" },
  { uk: "6", eu: "39", us: "8", foot: "24.7" },
  { uk: "7", eu: "41", us: "9", foot: "25.5" },
  { uk: "8", eu: "42", us: "10", foot: "26.3" },
  { uk: "9", eu: "43", us: "11", foot: "27.0" },
  { uk: "10", eu: "44", us: "12", foot: "27.8" },
];

const ProductPageSkeleton = () => {
  return (
    <div className="mx-auto max-w-screen-2xl px-4 pb-16 pt-12 md:px-8">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-start lg:gap-16">
        <div className="space-y-4 lg:col-span-7">
          <div className="lux-product-shimmer aspect-[4/5] w-full rounded-lg" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`product-thumbnail-skeleton-${index}`} className="lux-product-shimmer aspect-square rounded-md" />
            ))}
          </div>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <div className="lux-product-shimmer h-4 w-24" />
          <div className="lux-product-shimmer h-12 w-4/5" />
          <div className="lux-product-shimmer h-8 w-44" />
          <div className="space-y-3">
            <div className="lux-product-shimmer h-4 w-full" />
            <div className="lux-product-shimmer h-4 w-[90%]" />
            <div className="lux-product-shimmer h-4 w-[84%]" />
          </div>
          <div className="space-y-3">
            <div className="lux-product-shimmer h-4 w-40" />
            <div className="flex gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`option-skeleton-${index}`} className="lux-product-shimmer h-14 w-14 rounded-md" />
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="lux-product-shimmer h-14 w-full rounded-md" />
            <div className="lux-product-shimmer h-14 w-full rounded-md" />
          </div>
        </div>
      </div>

      <section className="mt-24">
        <div className="lux-product-shimmer h-3 w-32" />
        <div className="mt-2 lux-product-shimmer h-10 w-56" />
        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <RelatedProductSkeleton key={`related-skeleton-${index}`} />
          ))}
        </div>
      </section>
    </div>
  );
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toString = (value: unknown, fallback = ""): string => {
  return typeof value === "string" ? value : fallback;
};

const toBoolean = (value: unknown): boolean => value === true;

const mapProductRecord = (value: Record<string, unknown>): Product => {
  const categoryCandidate = Array.isArray(value.categories) ? value.categories[0] : value.categories;
  const categoryRecord = categoryCandidate && typeof categoryCandidate === "object" ? (categoryCandidate as Record<string, unknown>) : {};
  const imageCandidates = Array.isArray(value.images) ? value.images : [];
  const benefitCandidates = Array.isArray(value.benefits) ? value.benefits : [];

  return {
    id: toString(value.id),
    name: toString(value.name),
    slug: toString(value.slug),
    description: toString(value.description, "") || undefined,
    short_description: toString(value.short_description, "") || undefined,
    price: toNumber(value.price),
    compare_at_price:
      value.compare_at_price === null || value.compare_at_price === undefined ? undefined : toNumber(value.compare_at_price),
    stock_quantity: Math.max(0, Math.trunc(toNumber(value.stock_quantity))),
    total_stock_quantity:
      value.total_stock_quantity === null || value.total_stock_quantity === undefined
        ? undefined
        : Math.max(0, Math.trunc(toNumber(value.total_stock_quantity))),
    in_stock: value.in_stock === null || value.in_stock === undefined ? undefined : toBoolean(value.in_stock),
    is_available: toBoolean(value.is_available),
    is_featured: value.is_featured === null || value.is_featured === undefined ? undefined : toBoolean(value.is_featured),
    images: imageCandidates
      .map((entry, index) => {
        if (typeof entry === "string") {
          return {
            url: entry,
            alt_text: "",
            is_primary: index === 0,
            display_order: index,
          };
        }
        if (!entry || typeof entry !== "object") return null;
        const record = entry as Record<string, unknown>;
        const urlCandidate = [record.url, record.image_url, record.src].find((candidate) => typeof candidate === "string");
        if (!urlCandidate || typeof urlCandidate !== "string") return null;
        return {
          url: urlCandidate,
          alt_text: typeof record.alt_text === "string" ? record.alt_text : "",
          is_primary: record.is_primary === true || record.primary === true || index === 0,
          display_order: Number.isFinite(Number(record.display_order)) ? Number(record.display_order) : index,
        };
      })
      .filter((entry): entry is Product["images"][number] => Boolean(entry))
      .sort((a, b) => a.display_order - b.display_order),
    benefits: benefitCandidates
      .map((entry) => {
        if (typeof entry === "string") {
          return { icon: "", label: entry, description: "" };
        }
        if (!entry || typeof entry !== "object") return null;
        const record = entry as Record<string, unknown>;
        const label = toString(record.label, "");
        const description = toString(record.description, "");
        if (!label && !description) return null;
        return {
          icon: toString(record.icon, ""),
          label: label || description,
          description,
        };
      })
      .filter((entry): entry is NonNullable<Product["benefits"]>[number] => Boolean(entry)),
    tags: Array.isArray(value.tags) ? value.tags.filter((entry): entry is string => typeof entry === "string") : [],
    weight_grams:
      value.weight_grams === null || value.weight_grams === undefined ? undefined : Math.max(0, Math.trunc(toNumber(value.weight_grams))),
    sku: typeof value.sku === "string" ? value.sku : undefined,
    has_variants: toBoolean(value.has_variants),
    categories: {
      id: toString(categoryRecord.id),
      name: toString(categoryRecord.name, "Uncategorized"),
      slug: toString(categoryRecord.slug),
    },
  };
};

const mapVariantRecord = (value: unknown): ProductVariant | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = toString(record.id);
  if (!id) return null;
  const optionLinks = Array.isArray(record.product_variant_options) ? record.product_variant_options : [];
  return {
    id,
    label: typeof record.label === "string" ? record.label : null,
    price: record.price === null || record.price === undefined ? null : toNumber(record.price),
    compare_at_price:
      record.compare_at_price === null || record.compare_at_price === undefined ? null : toNumber(record.compare_at_price),
    stock_quantity: Math.max(0, Math.trunc(toNumber(record.stock_quantity))),
    is_available: record.is_available !== false,
    display_order: Math.max(0, Math.trunc(toNumber(record.display_order))),
    sku: typeof record.sku === "string" ? record.sku : null,
    product_variant_options: optionLinks
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const optionRecord = entry as Record<string, unknown>;
        const optionTypeId = toString(optionRecord.option_type_id);
        const optionValueId = toString(optionRecord.option_value_id);
        if (!optionTypeId || !optionValueId) return null;
        return {
          option_type_id: optionTypeId,
          option_value_id: optionValueId,
        };
      })
      .filter((entry): entry is ProductVariant["product_variant_options"][number] => Boolean(entry)),
  };
};

const mapOptionValueRecord = (value: unknown): ProductOptionValue | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = toString(record.id);
  if (!id) return null;
  return {
    id,
    option_type_id: toString(record.option_type_id),
    value: toString(record.value),
    color_hex: typeof record.color_hex === "string" ? record.color_hex : null,
    display_order: Math.max(0, Math.trunc(toNumber(record.display_order))),
  };
};

const mapOptionTypeRecord = (value: unknown): ProductOptionType | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = toString(record.id);
  if (!id) return null;
  const optionValues = Array.isArray(record.product_option_values) ? record.product_option_values : [];
  return {
    id,
    name: toString(record.name),
    display_order: Math.max(0, Math.trunc(toNumber(record.display_order))),
    product_option_values: optionValues
      .map((entry) => mapOptionValueRecord(entry))
      .filter((entry): entry is ProductOptionValue => Boolean(entry))
      .sort((a, b) => a.display_order - b.display_order),
  };
};

const sanitizeShippingStateEntries = (entries: unknown[]): string[] => {
  const seen = new Set<string>();
  const states: string[] = [];

  entries.forEach((entry) => {
    if (typeof entry !== "string") {
      return;
    }

    const trimmed = entry.trim();
    if (!trimmed) {
      return;
    }

    const dedupeKey = trimmed.toLowerCase();
    if (seen.has(dedupeKey)) {
      return;
    }

    seen.add(dedupeKey);
    states.push(trimmed);
  });

  return states;
};

const parseShippingStateList = (value: Json | null): string[] => {
  if (Array.isArray(value)) {
    return sanitizeShippingStateEntries(value);
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return sanitizeShippingStateEntries(parsed);
      }
    } catch {
      return sanitizeShippingStateEntries(value.split(","));
    }
  }

  return [];
};

const formatShippingCoverageLabel = (states: string[]): string => {
  if (states.length === 0) {
    return "All regions";
  }

  if (states.length <= 2) {
    return states.join(", ");
  }

  return `${states.slice(0, 2).join(", ")} +${states.length - 2} more`;
};

const formatDeliveryWindow = (minimumDays: number | null, maximumDays: number | null): string => {
  const min = Number.isFinite(Number(minimumDays)) && Number(minimumDays) > 0 ? Math.round(Number(minimumDays)) : null;
  const max = Number.isFinite(Number(maximumDays)) && Number(maximumDays) > 0 ? Math.round(Number(maximumDays)) : null;

  if (min && max) {
    return min === max ? `${min} business day${min === 1 ? "" : "s"}` : `${min}-${max} business days`;
  }

  if (min) {
    return `${min}+ business days`;
  }

  if (max) {
    return `Up to ${max} business days`;
  }

  return "Estimated at checkout";
};

const formatProductWeight = (weightGrams?: number): string | null => {
  if (!weightGrams || weightGrams <= 0) {
    return null;
  }

  if (weightGrams >= 1000) {
    const kilograms = weightGrams / 1000;
    const fixed = kilograms % 1 === 0 ? kilograms.toFixed(0) : kilograms.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    return `${fixed} kg`;
  }

  return `${weightGrams} g`;
};

const ProductPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { addToCart, isCartOpen } = useCart();
  const {
    preset: {
      tokens: { primary: primaryThemeColor },
    },
  } = useThemeConfig();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [activeImage, setActiveImage] = useState<string>("");
  const [hasActiveImageError, setHasActiveImageError] = useState(false);
  const [thumbnailErrors, setThumbnailErrors] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTryOnOpen, setTryOnOpen] = useState(false);
  const [isSizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [isLightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [hasLightboxImageError, setHasLightboxImageError] = useState(false);
  const [isLightboxImageVisible, setIsLightboxImageVisible] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [optionTypes, setOptionTypes] = useState<ProductOptionType[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ProductReviewSummary>(() => createEmptyReviewSummary());
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [existingReview, setExistingReview] = useState<ProductReview | null>(null);
  const [isExistingReviewLoading, setIsExistingReviewLoading] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [reviewMessageTone, setReviewMessageTone] = useState<"success" | "error" | "info">("info");
  const [isReviewSectionOpen, setReviewSectionOpen] = useState(false);
  const [accordionNarrative, setAccordionNarrative] = useState(true);
  const [accordionSpecs, setAccordionSpecs] = useState(false);
  const [accordionShipping, setAccordionShipping] = useState(false);
  const [visibleReviewCount, setVisibleReviewCount] = useState(3);
  const [shippingRates, setShippingRates] = useState<ShippingRateRow[]>([]);
  const [isShippingRatesLoading, setIsShippingRatesLoading] = useState(true);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const lightboxTouchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!slug) {
          setProduct(null);
          setRelatedProducts([]);
          setError("Product not found.");
          return;
        }

        const { data, error: productError } = await (supabase as any)
          .from("products_with_stock")
          .select(`
            id, name, slug, description,
            short_description, price,
            compare_at_price,
            stock_quantity,
            total_stock_quantity,
            in_stock,
            is_available, has_variants,
            images, benefits, tags,
            weight_grams, sku,
            categories ( id, name, slug ),
            product_option_types (
              id,
              name,
              display_order,
              product_option_values (
                id,
                option_type_id,
                value,
                color_hex,
                display_order
              )
            ),
            product_variants (
              id, label,
              price, compare_at_price,
              stock_quantity, is_available,
              display_order, sku,
              product_variant_options (
                option_type_id,
                option_value_id
              )
            )
          `)
          .eq("slug", slug)
          .eq("is_available", true)
          .single();

        if (productError || !data) {
          throw productError ?? new Error("Product not found");
        }

        const mappedProduct = mapProductRecord(data as Record<string, unknown>);
        const variantRows = Array.isArray((data as Record<string, unknown>).product_variants)
          ? ((data as Record<string, unknown>).product_variants as unknown[])
          : [];
        const optionTypeRows = Array.isArray((data as Record<string, unknown>).product_option_types)
          ? ((data as Record<string, unknown>).product_option_types as unknown[])
          : [];
        const sortedVariants = variantRows
          .map((variant) => mapVariantRecord(variant))
          .filter((variant): variant is ProductVariant => Boolean(variant))
          .sort((a, b) => a.display_order - b.display_order);
        const sortedOptionTypes = optionTypeRows
          .map((optionType) => mapOptionTypeRecord(optionType))
          .filter((optionType): optionType is ProductOptionType => Boolean(optionType))
          .sort((a, b) => a.display_order - b.display_order);

        mappedProduct.product_variants = sortedVariants;
        mappedProduct.product_option_types = sortedOptionTypes;
        setProduct(mappedProduct);
        setVariants(sortedVariants);
        setOptionTypes(sortedOptionTypes);
        setSelectedOptions({});

        if (mappedProduct?.categories?.id) {
          const directRelated = (await getRelatedProducts(mappedProduct.categories.id, mappedProduct.id, 4)) ?? [];
          let mergedRelated = directRelated;

          if (mergedRelated.length < 4) {
            try {
              const featured = await getFeaturedProducts();
              const existingIds = new Set(mergedRelated.map((entry) => entry.id));
              existingIds.add(mappedProduct.id);

              const filler = featured.filter((entry) => !existingIds.has(entry.id));
              mergedRelated = [...mergedRelated, ...filler].slice(0, 4);
            } catch (featuredError) {
              if (import.meta.env.DEV) {
                console.error("Failed to fetch featured fallback products", featuredError);
              }
            }
          }

          setRelatedProducts(mergedRelated);
        } else {
          setRelatedProducts([]);
        }
      } catch (err) {
        console.error(err);
        setProduct(null);
        setRelatedProducts([]);
        setVariants([]);
        setOptionTypes([]);
        setSelectedOptions({});
        setError("Product not found.");
      } finally {
        setLoading(false);
      }
    };

    void fetchProduct();
  }, [slug]);

  useEffect(() => {
    let isMounted = true;

    const loadStorefrontPolicies = async () => {
      setIsShippingRatesLoading(true);

      const shippingRatesPromise = fetchActiveShippingRates().catch(() => [] as ShippingRateRow[]);
      const paymentSettingsPromise = getPaymentSettings().catch(() => null as PaymentSettings | null);

      const [activeShippingRates, activePaymentSettings] = await Promise.all([shippingRatesPromise, paymentSettingsPromise]);
      if (!isMounted) {
        return;
      }

      setShippingRates(activeShippingRates);
      setPaymentSettings(activePaymentSettings);
      setIsShippingRatesLoading(false);
    };

    void loadStorefrontPolicies();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!product?.id) {
      setReviews([]);
      setReviewSummary(createEmptyReviewSummary());
      setReviewsError(null);
      setIsReviewsLoading(false);
      setVisibleReviewCount(3);
      return;
    }
    setVisibleReviewCount(3);

    let isMounted = true;

    const loadReviews = async () => {
      setIsReviewsLoading(true);
      setReviewsError(null);
      try {
        const result = await fetchProductReviews(product.id);
        if (!isMounted) return;
        setReviews(result.reviews);
        setReviewSummary(result.summary);
      } catch {
        if (!isMounted) return;
        setReviews([]);
        setReviewSummary(createEmptyReviewSummary());
        setReviewsError("Unable to load reviews.");
      } finally {
        if (isMounted) {
          setIsReviewsLoading(false);
        }
      }
    };

    void loadReviews();

    return () => {
      isMounted = false;
    };
  }, [product?.id]);

  useEffect(() => {
    if (!product?.id || !user?.id) {
      setExistingReview(null);
      setIsExistingReviewLoading(false);
      return;
    }

    let isMounted = true;

    const loadExistingReview = async () => {
      setIsExistingReviewLoading(true);
      try {
        const review = await fetchCustomerProductReview(product.id, user.id);
        if (!isMounted) return;
        setExistingReview(review);
      } catch {
        if (!isMounted) return;
        setExistingReview(null);
      } finally {
        if (isMounted) {
          setIsExistingReviewLoading(false);
        }
      }
    };

    void loadExistingReview();

    return () => {
      isMounted = false;
    };
  }, [product?.id, user?.id]);

  useEffect(() => {
    setReviewRating(0);
    setReviewTitle("");
    setReviewBody("");
    setReviewMessage(null);
  }, [product?.id]);

  useEffect(() => {
    if (!reviewMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setReviewMessage(null);
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [reviewMessage]);

  const galleryImages = useMemo(() => {
    if (!product) {
      return [];
    }

    return product.images
      .map((image) => image.url)
      .filter((url): url is string => Boolean(url && url.trim()));
  }, [product]);

  useEffect(() => {
    setActiveImage(galleryImages[0] ?? "");
    setHasActiveImageError(false);
    setThumbnailErrors({});
  }, [galleryImages, product?.id]);

  const primaryImage = useMemo(() => (product ? getPrimaryImage(product) : ""), [product]);

  const categorySlug = product?.categories?.slug ?? "";
  const categoryLabel = product?.categories?.name || getCategoryLabel(categorySlug);
  const sortedOptionTypes = useMemo(
    () => [...optionTypes].sort((a, b) => a.display_order - b.display_order),
    [optionTypes],
  );
  const optionValueById = useMemo(() => {
    const index = new Map<string, ProductOptionValue>();
    sortedOptionTypes.forEach((optionType) => {
      optionType.product_option_values.forEach((optionValue) => {
        index.set(optionValue.id, optionValue);
      });
    });
    return index;
  }, [sortedOptionTypes]);
  const hasVariants = Boolean(product?.has_variants) && variants.length > 0 && sortedOptionTypes.length > 0;
  const selectedVariant = useMemo(() => {
    if (!hasVariants) return null;
    const selectedValueIds = Object.values(selectedOptions).filter((valueId) => valueId && valueId.trim());
    if (selectedValueIds.length !== sortedOptionTypes.length) return null;

    return (
      variants.find((variant) =>
        selectedValueIds.every((valueId) =>
          variant.product_variant_options.some((optionLink) => optionLink.option_value_id === valueId),
        ),
      ) ?? null
    );
  }, [hasVariants, selectedOptions, sortedOptionTypes.length, variants]);
  const selectedVariantLabel = useMemo(() => {
    if (!selectedVariant) return null;
    if (selectedVariant.label && selectedVariant.label.trim()) return selectedVariant.label.trim();

    const values = selectedVariant.product_variant_options
      .map((optionLink) => optionValueById.get(optionLink.option_value_id)?.value ?? "")
      .filter(Boolean);

    return values.length > 0 ? values.join(" / ") : null;
  }, [optionValueById, selectedVariant]);
  const hasAnyAvailableVariant = variants.some((variant) => variant.is_available && variant.stock_quantity > 0);
  const productStockQuantity = product ? getStockQuantity(product) : 0;
  const isOutOfStock = !product || (hasVariants ? !hasAnyAvailableVariant : !isInStock(product));
  const displayPrice = selectedVariant?.price ?? product?.price ?? 0;
  const displayComparePrice = selectedVariant?.compare_at_price ?? product?.compare_at_price ?? null;
  const hasPriceDifferenceAcrossVariants =
    hasVariants && Boolean(product) && variants.some((variant) => variant.price !== null && variant.price !== product.price);
  const showPriceVariesByVariantNote = shouldShowPriceVariesByVariantNote(
    hasPriceDifferenceAcrossVariants,
    selectedVariant?.price,
    product?.price,
  );
  const normalizedCategorySlug = categorySlug.toLowerCase();
  const showTryOn = storeConfig.features.tryOn && Boolean(primaryImage);
  const isShoeCategory = normalizedCategorySlug.includes("shoe");
  const isBagCategory = normalizedCategorySlug.includes("bag");
  const sizeOptionType = useMemo(
    () => sortedOptionTypes.find((optionType) => optionType.name.toLowerCase().includes("size")) ?? null,
    [sortedOptionTypes],
  );
  const missingOptionNames = useMemo(
    () =>
      sortedOptionTypes
        .filter((optionType) => !selectedOptions[optionType.id])
        .map((optionType) => optionType.name.toLowerCase()),
    [selectedOptions, sortedOptionTypes],
  );
  const activeImageIndex = useMemo(() => {
    const index = galleryImages.findIndex((image) => image === activeImage);
    return index >= 0 ? index : 0;
  }, [activeImage, galleryImages]);
  const lightboxImageUrl = galleryImages[lightboxIndex] ?? "";
  const lightboxHasMultipleImages = galleryImages.length > 1;

  const isOptionValueUnavailable = (optionTypeId: string, optionValueId: string) => {
    return !variants.some((variant) => {
      if (!variant.is_available || variant.stock_quantity <= 0) return false;

      const hasCurrentValue = variant.product_variant_options.some((optionLink) => optionLink.option_value_id === optionValueId);
      if (!hasCurrentValue) return false;

      return Object.entries(selectedOptions)
        .filter(([typeId]) => typeId !== optionTypeId)
        .every(([, selectedValueId]) =>
          selectedValueId
            ? variant.product_variant_options.some((optionLink) => optionLink.option_value_id === selectedValueId)
            : true,
        );
    });
  };

  const addToCartButtonText = useMemo(() => {
    if (!hasVariants) {
      return isOutOfStock ? "Out of Stock" : "Add to Cart";
    }

    if (!selectedVariant) {
      if (missingOptionNames.length > 0) return `Select ${missingOptionNames[0]}`;
      return "Select options";
    }

    if (!selectedVariant.is_available || selectedVariant.stock_quantity === 0) {
      return "Out of Stock";
    }

    return "Add to Cart";
  }, [hasVariants, isOutOfStock, missingOptionNames, selectedVariant]);

  const isAddToCartDisabled =
    !product ||
    (hasVariants
      ? !selectedVariant || !selectedVariant.is_available || selectedVariant.stock_quantity === 0
      : isOutOfStock);
  const stockStatus = useMemo(() => {
    if (!product) {
      return { text: "Out of stock", tone: "danger" as const };
    }

    if (hasVariants) {
      if (!selectedVariant) {
        return { text: "Select options to see availability", tone: "muted" as const };
      }

      if (!selectedVariant.is_available || selectedVariant.stock_quantity <= 0) {
        return { text: "Out of stock", tone: "danger" as const };
      }

      if (selectedVariant.stock_quantity <= 10) {
        return { text: `Only ${selectedVariant.stock_quantity} left in stock`, tone: "accent" as const };
      }

      return { text: "In stock", tone: "default" as const };
    }

    if (isOutOfStock) {
      return { text: "Out of stock", tone: "danger" as const };
    }

    if (productStockQuantity <= 10) {
      return { text: `Only ${productStockQuantity} left in stock`, tone: "accent" as const };
    }

    return { text: "In stock", tone: "default" as const };
  }, [hasVariants, isOutOfStock, product, productStockQuantity, selectedVariant]);
  const stockStatusToneClass =
    stockStatus.tone === "danger"
      ? "text-[var(--theme-danger)]"
      : stockStatus.tone === "accent"
        ? "text-[var(--theme-accent)]"
        : stockStatus.tone === "muted"
          ? "text-[var(--theme-text-muted)]"
          : "text-[var(--theme-success)]";
  const stockStatusIcon = stockStatus.tone === "danger" ? "error" : stockStatus.tone === "muted" ? "info" : "check_circle";
  const categoryShopLink = normalizedCategorySlug ? `/shop?category=${encodeURIComponent(normalizedCategorySlug)}` : "/shop";
  const selectedSku = selectedVariant?.sku?.trim() || product?.sku?.trim() || null;
  const productWeightLabel = formatProductWeight(product?.weight_grams);
  const shippingRateHighlights = useMemo(
    () =>
      [...shippingRates]
        .map((rate) => ({
          id: rate.id,
          rateName: typeof rate.name === "string" && rate.name.trim() ? rate.name.trim() : "Shipping",
          coverageLabel: formatShippingCoverageLabel(parseShippingStateList(rate.states)),
          fee: Math.max(0, Math.round(Number(rate.base_rate) || 0)),
          deliveryWindow: formatDeliveryWindow(rate.estimated_days_min, rate.estimated_days_max),
        }))
        .sort((left, right) => left.fee - right.fee)
        .slice(0, 3),
    [shippingRates],
  );
  const hasAdditionalShippingRates = shippingRates.length > shippingRateHighlights.length;
  const paymentMethodsSummary = useMemo(() => {
    const onlinePaymentEnabled = paymentSettings?.online_payment_enabled !== false;
    const cashOnDeliveryEnabled = Boolean(paymentSettings?.cash_on_delivery_enabled);

    if (onlinePaymentEnabled && cashOnDeliveryEnabled) {
      return "Secure online payment and cash on delivery are available at checkout.";
    }

    if (onlinePaymentEnabled) {
      return "Secure online payment is available at checkout.";
    }

    if (cashOnDeliveryEnabled) {
      return "Cash on delivery is available at checkout.";
    }

    return "Available payment methods are shown at checkout before you place your order.";
  }, [paymentSettings]);
  const productInfoLines = useMemo(() => {
    const lines = [`Category: ${categoryLabel}`];

    if (selectedSku) {
      lines.push(`SKU: ${selectedSku.toUpperCase()}`);
    }

    if (productWeightLabel) {
      lines.push(`Weight: ${productWeightLabel}`);
    }

    if (sortedOptionTypes.length > 0) {
      lines.push(`Options: ${sortedOptionTypes.map((optionType) => optionType.name).join(", ")}`);
    }

    if (product?.tags && product.tags.length > 0) {
      lines.push(`Tags: ${product.tags.slice(0, 4).join(", ")}`);
    }

    return lines;
  }, [categoryLabel, product?.tags, productWeightLabel, selectedSku, sortedOptionTypes]);
  const reviewAverageRating = reviewSummary.totalReviews > 0 ? reviewSummary.averageRating : 0;
  const reviewBodyLength = reviewBody.trim().length;
  const loginRedirectLink = buildPathWithSearch(
    location.pathname,
    buildAuthModalSearch(location.search, {
      mode: "login",
      redirect: `${location.pathname}${location.search}${location.hash}`,
    }),
    location.hash,
  );
  const canSubmitReview =
    Boolean(product?.id) &&
    Boolean(user?.id) &&
    !isSubmittingReview &&
    !isExistingReviewLoading &&
    reviewRating >= 1 &&
    reviewBodyLength >= 12 &&
    !existingReview;
  const existingReviewMessage = existingReview
    ? existingReview.status === "approved"
      ? "You already reviewed this product."
      : existingReview.status === "pending"
        ? "Your review is pending moderation."
        : "Your review is currently hidden."
    : null;

  useEffect(() => {
    if (!hasVariants) {
      setSelectedOptions({});
      return;
    }

    setSelectedOptions((current) => {
      const next = { ...current };
      let hasChanges = false;

      Object.keys(next).forEach((optionTypeId) => {
        const optionType = sortedOptionTypes.find((entry) => entry.id === optionTypeId);
        const selectedValueId = next[optionTypeId];
        const hasValue = optionType?.product_option_values.some((optionValue) => optionValue.id === selectedValueId);
        if (!optionType || !hasValue) {
          delete next[optionTypeId];
          hasChanges = true;
        }
      });

      return hasChanges ? next : current;
    });
  }, [hasVariants, sortedOptionTypes]);

  useEffect(() => {
    if (!galleryImages.length) {
      setLightboxOpen(false);
      setLightboxIndex(0);
      return;
    }

    if (activeImageIndex !== lightboxIndex) {
      setLightboxIndex(activeImageIndex);
    }
  }, [activeImageIndex, galleryImages.length, lightboxIndex]);

  useEffect(() => {
    if (!isLightboxOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightboxOpen(false);
        return;
      }

      if (!lightboxHasMultipleImages) {
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const direction = event.key === "ArrowLeft" ? -1 : 1;
        const nextIndex = (lightboxIndex + direction + galleryImages.length) % galleryImages.length;
        const nextImage = galleryImages[nextIndex] ?? "";

        setLightboxIndex(nextIndex);
        setActiveImage(nextImage);
        setHasActiveImageError(false);
        setHasLightboxImageError(false);
        setIsLightboxImageVisible(false);
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [galleryImages, isLightboxOpen, lightboxHasMultipleImages, lightboxIndex]);

  useEffect(() => {
    if (!isSizeGuideOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSizeGuideOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isSizeGuideOpen]);

  const navigateLightboxTo = (nextIndex: number) => {
    if (!galleryImages.length) {
      return;
    }

    const normalizedIndex = (nextIndex + galleryImages.length) % galleryImages.length;
    if (normalizedIndex === lightboxIndex) {
      return;
    }

    const nextImage = galleryImages[normalizedIndex] ?? "";

    setLightboxIndex(normalizedIndex);
    setActiveImage(nextImage);
    setHasActiveImageError(false);
    setHasLightboxImageError(false);
    setIsLightboxImageVisible(false);
  };

  const handleOpenLightbox = () => {
    if (!galleryImages.length || hasActiveImageError) {
      return;
    }

    setLightboxIndex(activeImageIndex);
    setHasLightboxImageError(false);
    setIsLightboxImageVisible(false);
    setLightboxOpen(true);
  };

  const handleCloseLightbox = () => {
    setLightboxOpen(false);
  };

  const handleLightboxTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    lightboxTouchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleLightboxTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (!lightboxHasMultipleImages || lightboxTouchStartXRef.current === null) {
      lightboxTouchStartXRef.current = null;
      return;
    }

    const endX = event.changedTouches[0]?.clientX ?? lightboxTouchStartXRef.current;
    const swipeDistance = lightboxTouchStartXRef.current - endX;
    lightboxTouchStartXRef.current = null;

    if (Math.abs(swipeDistance) <= 50) {
      return;
    }

    navigateLightboxTo(swipeDistance > 0 ? lightboxIndex + 1 : lightboxIndex - 1);
  };

  const handleAddToCart = () => {
    if (!product) {
      return;
    }

    if (hasVariants) {
      if (!selectedVariant || !selectedVariant.is_available || selectedVariant.stock_quantity <= 0) {
        return;
      }

      addToCart({
        product_id: product.id,
        name: product.name,
        slug: product.slug,
        category: categoryLabel,
        price: displayPrice,
        compare_at_price: displayComparePrice ?? null,
        image_url: primaryImage,
        image_alt: product.name,
        sku: selectedVariant.sku ?? product.sku ?? null,
        stock_quantity: selectedVariant.stock_quantity,
        variant_id: selectedVariant.id,
        variant_label: selectedVariantLabel,
      });
      return;
    }

    if (isOutOfStock) {
      return;
    }

    addToCart({
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      category: categoryLabel,
      price: product.price,
      compare_at_price: product.compare_at_price ?? null,
      image_url: primaryImage,
      image_alt: product.name,
      sku: product.sku ?? null,
      stock_quantity: productStockQuantity,
      variant_id: null,
      variant_label: null,
    });
  };

  const handleSubmitReview = async () => {
    if (!product?.id || !user?.id) {
      setReviewMessageTone("error");
      setReviewMessage("Please sign in to submit a review.");
      return;
    }

    if (existingReview) {
      setReviewMessageTone("info");
      setReviewMessage(existingReviewMessage || "You already reviewed this product.");
      return;
    }

    if (reviewRating < 1) {
      setReviewMessageTone("error");
      setReviewMessage("Please select a rating.");
      return;
    }

    if (reviewBodyLength < 12) {
      setReviewMessageTone("error");
      setReviewMessage("Review text must be at least 12 characters.");
      return;
    }

    setIsSubmittingReview(true);
    setReviewMessage(null);

    try {
      const result = await submitProductReview({
        productId: product.id,
        customerId: user.id,
        rating: reviewRating,
        title: reviewTitle,
        body: reviewBody,
        authorDisplayName: buildReviewerDisplayName(user),
      });

      setExistingReview(result.review);
      setReviewRating(0);
      setReviewTitle("");
      setReviewBody("");

      const refreshed = await fetchProductReviews(product.id);
      setReviews(refreshed.reviews);
      setReviewSummary(refreshed.summary);

      setReviewMessageTone("success");
      setReviewMessage(
        result.moderationRequired
          ? "Review submitted. It will appear once approved by the team."
          : "Review submitted and now visible to shoppers.",
      );
    } catch (error) {
      const errorCode =
        error && typeof error === "object" && "code" in error && typeof (error as { code?: unknown }).code === "string"
          ? (error as { code: string }).code
          : "";

      if (errorCode === "23505") {
        try {
          const existing = await fetchCustomerProductReview(product.id, user.id);
          setExistingReview(existing);
        } catch {
          // no-op
        }
        setReviewMessageTone("info");
        setReviewMessage("You already submitted a review for this product.");
      } else {
        setReviewMessageTone("error");
        setReviewMessage("Unable to submit review right now. Please try again.");
      }
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading) {
    return <ProductPageSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-20">
        <ProductFetchErrorState />
      </div>
    );
  }

  return (
    <div className="bg-surface font-manrope text-on-surface">
      <main className={`mx-auto max-w-[1440px] px-8 pt-6 ${showTryOn ? "pb-44 md:pb-0" : "pb-28 md:pb-0"}`}>
        <nav aria-label="Breadcrumb" className="py-6 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-400 font-medium">
          <Link to="/" className="transition-colors hover:text-black">
            Home
          </Link>
          <span className="material-symbols-outlined text-[12px]">chevron_right</span>
          <Link to="/shop" className="transition-colors hover:text-black">
            Shop
          </Link>
          <span className="material-symbols-outlined text-[12px]">chevron_right</span>
          <Link to={categoryShopLink} className="transition-colors hover:text-black">
            {categoryLabel}
          </Link>
          <span className="material-symbols-outlined text-[12px]">chevron_right</span>
          <span className="text-black">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:items-start mb-24">
          <div className="flex flex-col gap-3 lg:col-span-7 lg:gap-4">
            {galleryImages.length > 0 ? (
              <>
                <div className="overflow-hidden bg-white mb-4">
                  <button
                    type="button"
                    onClick={handleOpenLightbox}
                    className="group block w-full cursor-zoom-in"
                    aria-label="Open full image"
                  >
                    {activeImage && !hasActiveImageError ? (
                      <div className="overflow-hidden">
                        <img
                          src={activeImage}
                          alt={product.name}
                          className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                          onError={() => setHasActiveImageError(true)}
                        />
                      </div>
                    ) : (
                      <ProductImagePlaceholder className="aspect-[4/5] w-full" />
                    )}
                  </button>
                </div>

                <div className="flex gap-4">
                  {galleryImages.map((image, index) => {
                    const hasThumbError = thumbnailErrors[image] === true;
                    const isActive = activeImage === image;

                    return (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        onClick={() => {
                          setActiveImage(image);
                          setHasActiveImageError(false);
                          setLightboxIndex(index);
                        }}
                        className={`w-24 h-24 overflow-hidden bg-white transition-all duration-200 ${
                          isActive
                            ? "border border-black"
                            : "border border-zinc-200 hover:border-black"
                        }`}
                        aria-label={`View image ${index + 1}`}
                      >
                        {!hasThumbError ? (
                          <img
                            src={image}
                            alt={`${product.name} thumbnail ${index + 1}`}
                            className="h-full w-full object-cover"
                            onError={() =>
                              setThumbnailErrors((previous) => ({
                                ...previous,
                                [image]: true,
                              }))
                            }
                          />
                        ) : (
                          <ProductImagePlaceholder className="h-full w-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <ProductImagePlaceholder className="aspect-[4/5] w-full rounded-lg" />
            )}
          </div>

          <div className="lg:col-span-5 lg:sticky lg:top-28 pt-4">
            <div className="flex flex-col gap-6">
              <header className="flex flex-col gap-2">
                <div className="mb-2">
                  <span className={`text-[10px] uppercase tracking-widest font-bold ${stockStatusToneClass}`}>
                    {stockStatus.text}
                  </span>
                </div>
                <h1 className="font-manrope font-extrabold text-4xl mb-4 tracking-tighter text-black leading-tight">{product.name}</h1>
                {storeConfig.features.reviews && reviewSummary.totalReviews > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      document.getElementById("reviews-section")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="flex items-center gap-2 mb-3 group w-fit"
                  >
                    <StarRating rating={reviewAverageRating} className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-black transition-colors">
                      {reviewSummary.totalReviews} {reviewSummary.totalReviews === 1 ? "review" : "reviews"}
                    </span>
                  </button>
                ) : null}
                {(product.short_description || product.description) ? (
                  <p className="font-manrope text-zinc-500 text-sm mb-4 leading-relaxed max-w-md">
                    {product.short_description || product.description}
                  </p>
                ) : null}
                <div className="flex items-baseline gap-4 mb-8">
                  <p className="text-2xl font-bold text-black font-manrope">{formatPrice(displayPrice)}</p>
                  {displayComparePrice !== null && displayComparePrice > displayPrice ? (
                    <span className="text-sm text-zinc-400 line-through">{formatPrice(displayComparePrice)}</span>
                  ) : null}
                </div>
                {showPriceVariesByVariantNote ? (
                  <p className="text-xs text-on-surface-variant">Price varies by variant</p>
                ) : null}
              </header>

              {hasVariants ? (
                <div className="space-y-5">
                  {sortedOptionTypes.map((optionType) => {
                    const selectedValueId = selectedOptions[optionType.id] ?? null;
                    const selectedValue =
                      optionType.product_option_values.find((optionValue) => optionValue.id === selectedValueId) ?? null;
                    const renderAsSwatches = optionType.product_option_values.some((optionValue) => Boolean(optionValue.color_hex));
                    const optionTypeLabel = renderAsSwatches
                      ? "Color Palette"
                      : sizeOptionType?.id === optionType.id
                        ? `Select ${optionType.name}`
                        : optionType.name;

                    return (
                      <div key={optionType.id} className="space-y-3">
                        <div className="flex items-center justify-between mb-4">
                          <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">{optionTypeLabel}</label>
                          {sizeOptionType?.id === optionType.id ? (
                            <button
                              type="button"
                              onClick={() => setSizeGuideOpen(true)}
                              className="text-[10px] font-bold uppercase tracking-widest text-black underline decoration-[#E8A811] underline-offset-4"
                            >
                              Size Guide
                            </button>
                          ) : null}
                        </div>

                        {renderAsSwatches ? (
                          <div className="flex flex-wrap gap-3">
                            {optionType.product_option_values.map((optionValue) => {
                              const isUnavailable = isOptionValueUnavailable(optionType.id, optionValue.id);
                              const isSelected = selectedValueId === optionValue.id;

                              return (
                                <button
                                  key={optionValue.id}
                                  type="button"
                                  title={optionValue.value}
                                  disabled={isUnavailable}
                                  onClick={() =>
                                    setSelectedOptions((current) => ({
                                      ...current,
                                      [optionType.id]: optionValue.id,
                                    }))
                                  }
                                  className={`relative h-9 w-9 rounded-full transition-all ${
                                    isSelected
                                      ? "ring-2 ring-primary ring-offset-2 ring-offset-[var(--color-surface)]"
                                      : "border border-[rgba(186,194,201,0.35)]"
                                  } ${isUnavailable ? "cursor-not-allowed opacity-40" : "hover:scale-110"}`}
                                  style={{ backgroundColor: optionValue.color_hex || primaryThemeColor }}
                                >
                                  {isUnavailable ? (
                                    <span
                                      className="pointer-events-none absolute inset-0 rounded-full"
                                      style={{
                                        background:
                                          "linear-gradient(135deg, transparent 45%, rgba(var(--color-secondary-rgb),0.8) 45%, rgba(var(--color-secondary-rgb),0.8) 55%, transparent 55%)",
                                      }}
                                    />
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="grid grid-cols-4 gap-2">
                            {optionType.product_option_values.map((optionValue) => {
                              const isUnavailable = isOptionValueUnavailable(optionType.id, optionValue.id);
                              const isSelected = selectedValueId === optionValue.id;

                              return (
                                <button
                                  key={optionValue.id}
                                  type="button"
                                  disabled={isUnavailable}
                                  onClick={() =>
                                    setSelectedOptions((current) => ({
                                      ...current,
                                      [optionType.id]: optionValue.id,
                                    }))
                                  }
                                  className={`py-3 border text-xs font-medium transition-all ${
                                    isSelected
                                      ? "border-2 border-black font-bold text-black"
                                      : isUnavailable
                                        ? "cursor-not-allowed border-zinc-200 text-zinc-300 line-through"
                                        : "border-zinc-200 text-black hover:border-black"
                                  }`}
                                >
                                  {optionValue.value}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <div className="hidden flex-col gap-4 md:flex">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isAddToCartDisabled}
                  className={`w-full py-5 font-bold uppercase tracking-widest text-sm transition-all ${
                    isAddToCartDisabled
                      ? "cursor-not-allowed bg-zinc-300 text-zinc-500"
                      : "bg-black text-white hover:bg-zinc-800 shadow-xl active:scale-[0.98]"
                  }`}
                >
                  {addToCartButtonText}
                </button>

                {showTryOn ? (
                  <button
                    type="button"
                    onClick={() => setTryOnOpen(true)}
                    className="w-full border border-zinc-200 py-5 font-bold uppercase tracking-widest text-sm hover:border-black transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">favorite</span>
                    Virtual Try On
                  </button>
                ) : null}
              </div>

              <div className="space-y-3 mb-8 border-t border-zinc-100 pt-6">
                <div className="flex items-center gap-3 text-zinc-600">
                  <span className="material-symbols-outlined text-[#E8A811] text-[18px]">local_shipping</span>
                  <div>
                    {isShippingRatesLoading ? (
                      <p className="text-[11px] font-medium tracking-wide uppercase">Loading shipping rates...</p>
                    ) : shippingRateHighlights.length > 0 ? (
                      <p className="text-[11px] font-medium tracking-wide uppercase">
                        {shippingRateHighlights[0].rateName} ({shippingRateHighlights[0].coverageLabel}){" "}
                        <span className="text-zinc-300 mx-1">·</span> {formatPrice(shippingRateHighlights[0].fee)} delivery
                        {shippingRateHighlights[0].deliveryWindow ? ` · ${shippingRateHighlights[0].deliveryWindow}` : ""}
                      </p>
                    ) : (
                      <p className="text-[11px] font-medium tracking-wide uppercase">Shipping rates calculated at checkout</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-zinc-600">
                  <span className="material-symbols-outlined text-[#E8A811] text-[18px]">assignment_return</span>
                  <p className="text-[11px] font-medium tracking-wide uppercase">7-day returns <span className="text-zinc-300 mx-1">·</span> Easy exchanges</p>
                </div>
              </div>

              <div className="border-t border-zinc-200">
                <div className="border-b border-zinc-200">
                  <button
                    type="button"
                    onClick={() => setAccordionNarrative((v) => !v)}
                    className="flex justify-between items-center w-full py-6 text-left"
                  >
                    <span className="font-manrope font-bold text-sm tracking-tight text-black">Product Narrative</span>
                    <span className={`material-symbols-outlined text-[#E8A811] transition-transform duration-200 ${accordionNarrative ? "rotate-180" : "rotate-0"}`}>expand_more</span>
                  </button>
                  {accordionNarrative ? (
                    <div className="pb-6 text-zinc-500 text-sm leading-relaxed">
                      {product.description || product.short_description || "No description available."}
                    </div>
                  ) : null}
                </div>

                <div className="border-b border-zinc-200">
                  <button
                    type="button"
                    onClick={() => setAccordionSpecs((v) => !v)}
                    className="flex justify-between items-center w-full py-6 text-left"
                  >
                    <span className="font-manrope font-bold text-sm tracking-tight text-black">Technical Specifications</span>
                    <span className={`material-symbols-outlined text-[#E8A811] transition-transform duration-200 ${accordionSpecs ? "rotate-180" : "rotate-0"}`}>expand_more</span>
                  </button>
                  {accordionSpecs ? (
                    <div className="pb-6 space-y-2 text-zinc-500 text-sm">
                      {productInfoLines.map((line, index) => (
                        <p key={`${line}-${index}`}>· {line}</p>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="border-b border-zinc-200">
                  <button
                    type="button"
                    onClick={() => setAccordionShipping((v) => !v)}
                    className="flex justify-between items-center w-full py-6 text-left"
                  >
                    <span className="font-manrope font-bold text-sm tracking-tight text-black">Shipping &amp; Returns</span>
                    <span className={`material-symbols-outlined text-[#E8A811] transition-transform duration-200 ${accordionShipping ? "rotate-180" : "rotate-0"}`}>expand_more</span>
                  </button>
                  {accordionShipping ? (
                    <div className="pb-6 text-zinc-500 text-sm leading-relaxed">
                      {paymentMethodsSummary} Returns are accepted within 7 days of delivery in unworn condition with all original tags and packaging intact.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        {storeConfig.features.reviews ? (
          <section id="reviews-section" className={relatedProducts.length > 0 ? "mb-16" : "mb-0 pb-16"}>
            {/* Section header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10 pb-6 border-b border-zinc-100">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#E8A811] mb-2">What People Say</p>
                <h2 className="font-manrope font-extrabold text-3xl tracking-tighter text-black">Customer Reviews</h2>
              </div>
              {reviewSummary.totalReviews > 0 ? (
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-extrabold font-manrope text-black leading-none">{reviewAverageRating.toFixed(1)}</span>
                  <div>
                    <StarRating rating={reviewAverageRating} className="h-4 w-4" />
                    <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mt-1">
                      {reviewSummary.totalReviews} {reviewSummary.totalReviews === 1 ? "review" : "reviews"}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col lg:flex-row gap-12">
              {/* Left panel: rating breakdown + write review */}
              <div className="lg:w-72 shrink-0">
                {reviewSummary.totalReviews > 0 ? (
                  <div className="bg-zinc-50 p-6 mb-6">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-4">Rating Breakdown</p>
                    <div className="space-y-2.5">
                      {REVIEW_STAR_LEVELS.map((ratingLevel) => {
                        const ratingCount = reviewSummary.distribution[ratingLevel];
                        const widthPercent =
                          reviewSummary.totalReviews > 0 ? Math.round((ratingCount / reviewSummary.totalReviews) * 100) : 0;
                        return (
                          <div key={`rating-level-${ratingLevel}`} className="flex items-center gap-3">
                            <div className="flex items-center gap-0.5 w-20 shrink-0">
                              {Array.from({ length: ratingLevel }, (_, i) => (
                                <Star key={i} className="h-3 w-3 text-[#E8A811]" fill="currentColor" strokeWidth={0} />
                              ))}
                            </div>
                            <div className="flex-1 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                              <div className="h-full bg-[#E8A811] rounded-full transition-all duration-500" style={{ width: `${widthPercent}%` }} />
                            </div>
                            <span className="text-[10px] text-zinc-400 w-7 text-right shrink-0">{ratingCount}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {!isAuthenticated ? (
                  <Link
                    to={loginRedirectLink}
                    className="block w-full border-2 border-black py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all text-center"
                  >
                    Sign In to Write a Review
                  </Link>
                ) : existingReview ? (
                  <div className="bg-zinc-50 border-l-2 border-[#E8A811] p-4">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">{existingReviewMessage}</p>
                    <StarRating rating={existingReview.rating} className="h-4 w-4" />
                    <p className="mt-2 text-[10px] text-zinc-400">Submitted {formatReviewDate(existingReview.createdAt)}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setReviewSectionOpen((current) => !current)}
                      className="w-full border-2 border-black py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all"
                    >
                      {isReviewSectionOpen ? "Cancel" : "Write a Review"}
                    </button>
                    {isReviewSectionOpen ? (
                      <div className="space-y-3 bg-zinc-50 p-5">
                        {reviewMessage ? (
                          <p className={`text-xs ${reviewMessageTone === "error" ? "text-[var(--theme-danger)]" : reviewMessageTone === "success" ? "text-[var(--theme-success)]" : "text-zinc-500"}`}>
                            {reviewMessage}
                          </p>
                        ) : null}
                        {isExistingReviewLoading ? (
                          <p className="text-xs text-zinc-400">Checking your previous review...</p>
                        ) : (
                          <>
                            <div>
                              <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-400">Your Rating</p>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }, (_, index) => {
                                  const value = index + 1;
                                  const isSelected = reviewRating >= value;
                                  return (
                                    <button
                                      key={`review-select-star-${value}`}
                                      type="button"
                                      onClick={() => setReviewRating(value)}
                                      className="p-0.5 transition-transform hover:scale-110"
                                      aria-label={`Rate ${value} star${value === 1 ? "" : "s"}`}
                                    >
                                      <Star
                                        className={`h-6 w-6 ${isSelected ? "text-[#E8A811]" : "text-zinc-300"}`}
                                        fill={isSelected ? "currentColor" : "none"}
                                        strokeWidth={1.5}
                                      />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            <input
                              value={reviewTitle}
                              onChange={(event) => setReviewTitle(event.target.value)}
                              placeholder="Review title (optional)"
                              maxLength={80}
                              className="w-full h-10 bg-white border border-zinc-200 px-3 text-sm text-black outline-none focus:border-black"
                            />
                            <textarea
                              value={reviewBody}
                              onChange={(event) => setReviewBody(event.target.value)}
                              rows={4}
                              placeholder="Tell shoppers what stood out about this product."
                              className="w-full bg-white border border-zinc-200 px-3 py-2 text-sm leading-relaxed text-black outline-none focus:border-black"
                            />
                            <button
                              type="button"
                              onClick={() => void handleSubmitReview()}
                              disabled={!canSubmitReview}
                              className={`w-full py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${
                                canSubmitReview
                                  ? "bg-black text-white hover:bg-zinc-800"
                                  : "cursor-not-allowed bg-zinc-200 text-zinc-400"
                              }`}
                            >
                              {isSubmittingReview ? "Submitting..." : "Submit Review"}
                            </button>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Right panel: review list */}
              <div className="flex-1 min-w-0">
                {isReviewsLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="bg-zinc-50 p-6 animate-pulse">
                        <div className="h-3 w-24 bg-zinc-200 rounded mb-3" />
                        <div className="h-4 w-48 bg-zinc-200 rounded mb-3" />
                        <div className="h-3 w-full bg-zinc-100 rounded mb-2" />
                        <div className="h-3 w-3/4 bg-zinc-100 rounded" />
                      </div>
                    ))}
                  </div>
                ) : reviewsError ? (
                  <p className="text-sm text-[var(--theme-danger)]">{reviewsError}</p>
                ) : reviews.length === 0 ? (
                  <div className="bg-zinc-50 px-8 py-14 text-center">
                    <p className="text-sm font-medium text-zinc-400 mb-1">No reviews yet</p>
                    <p className="text-xs text-zinc-300">Be the first to share your experience.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {reviews.slice(0, visibleReviewCount).map((review) => {
                        const initials = review.authorDisplayName
                          .split(" ")
                          .map((part) => part[0] ?? "")
                          .slice(0, 2)
                          .join("")
                          .toUpperCase();
                        return (
                          <div key={review.id} className="bg-zinc-50 p-6">
                            <div className="flex items-start gap-4">
                              {/* Avatar */}
                              <div className="shrink-0 h-9 w-9 rounded-full bg-black text-white flex items-center justify-center text-[11px] font-bold tracking-wide">
                                {initials}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                  <div>
                                    <p className="text-[11px] font-bold text-black leading-none mb-1">{review.authorDisplayName}</p>
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider">{formatReviewDate(review.createdAt)}</p>
                                  </div>
                                  <StarRating rating={review.rating} className="h-3.5 w-3.5" />
                                </div>
                                {review.title ? (
                                  <h4 className="font-manrope font-bold text-sm text-black mb-2">{review.title}</h4>
                                ) : null}
                                <p className="text-zinc-500 text-sm leading-relaxed">{review.body}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {visibleReviewCount < reviews.length ? (
                      <div className="flex justify-center pt-8">
                        <button
                          type="button"
                          onClick={() => setVisibleReviewCount((n) => n + 3)}
                          className="text-[10px] font-bold uppercase tracking-widest text-black underline underline-offset-8 decoration-[#E8A811] hover:text-[#E8A811] transition-colors"
                        >
                          Load More Reviews
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </section>
        ) : null}

        {relatedProducts.length > 0 ? (
          <section className="mb-0 pb-16">
            <div className="flex items-end justify-between mb-10 pb-6 border-b border-zinc-100">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#E8A811] mb-2">Style It With</p>
                <h2 className="font-manrope font-extrabold text-3xl tracking-tighter text-black">Complete the Look</h2>
              </div>
              <Link to="/shop" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-black transition-colors">
                View All
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.slice(0, 4).map((item) => (
                <RelatedProductTile key={item.id} product={item} />
              ))}
            </div>
          </section>
        ) : null}
      </main>

      {!isCartOpen ? (
        <div className="fixed inset-x-0 bottom-0 z-[900] border-t border-zinc-200 bg-white/95 backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-screen-2xl flex-col gap-2 px-4 pb-4 pt-3">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isAddToCartDisabled}
              className={`flex items-center justify-center gap-2 py-4 text-[11px] font-bold uppercase tracking-widest transition-all ${
                isAddToCartDisabled
                  ? "cursor-not-allowed bg-zinc-300 text-zinc-500"
                  : "bg-black text-white shadow-xl active:scale-[0.98]"
              }`}
            >
              {addToCartButtonText}
            </button>

            {showTryOn ? (
              <button
                type="button"
                onClick={() => setTryOnOpen(true)}
                className="flex items-center justify-center gap-2 border border-zinc-200 py-4 text-[11px] font-bold uppercase tracking-widest text-black transition-all active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-base">favorite</span>
                Virtual Try On
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {isLightboxOpen ? (
        <div
          className="fixed inset-0 z-[2000] cursor-zoom-out bg-black/95"
          onClick={handleCloseLightbox}
          onTouchStart={handleLightboxTouchStart}
          onTouchEnd={handleLightboxTouchEnd}
          role="dialog"
          aria-modal="true"
          aria-label="Product image lightbox"
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleCloseLightbox();
            }}
            className="fixed right-6 top-6 z-[2001] text-white/70 transition-opacity duration-200 hover:text-white hover:opacity-100"
            aria-label="Close lightbox"
          >
            <X size={24} strokeWidth={1.2} />
          </button>

          {lightboxHasMultipleImages ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                navigateLightboxTo(lightboxIndex - 1);
              }}
              className="fixed left-3 top-1/2 z-[2001] -translate-y-1/2 text-white/60 transition-colors duration-200 hover:text-white md:left-6"
              aria-label="Previous image"
            >
              <ChevronLeft size={32} strokeWidth={1.2} />
            </button>
          ) : null}

          {lightboxHasMultipleImages ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                navigateLightboxTo(lightboxIndex + 1);
              }}
              className="fixed right-3 top-1/2 z-[2001] -translate-y-1/2 text-white/60 transition-colors duration-200 hover:text-white md:right-6"
              aria-label="Next image"
            >
              <ChevronRight size={32} strokeWidth={1.2} />
            </button>
          ) : null}

          <div className="flex h-full items-center justify-center p-4 md:p-8">
            {lightboxImageUrl && !hasLightboxImageError ? (
              <img
                src={lightboxImageUrl}
                alt={`${product.name} image ${lightboxIndex + 1}`}
                className={`max-h-[90vh] max-w-[90vw] cursor-default object-contain transition-opacity duration-200 ease-in ${
                  isLightboxImageVisible ? "opacity-100" : "opacity-0"
                }`}
                onClick={(event) => event.stopPropagation()}
                onLoad={() => setIsLightboxImageVisible(true)}
                onError={() => setHasLightboxImageError(true)}
              />
            ) : (
              <div onClick={(event) => event.stopPropagation()}>
                <ProductImagePlaceholder className="h-[60vh] w-[80vw] max-w-[560px]" />
              </div>
            )}
          </div>

          <p className="pointer-events-none fixed bottom-20 left-1/2 z-[2001] -translate-x-1/2 font-manrope text-[11px] tracking-[0.1em] text-white/50">
            {`${lightboxIndex + 1} / ${galleryImages.length}`}
          </p>

          <div className="lux-hide-scrollbar fixed bottom-6 left-1/2 z-[2001] flex max-w-[90vw] -translate-x-1/2 gap-2 overflow-x-auto">
            {galleryImages.map((image, index) => (
              <button
                key={`lightbox-thumb-${image}-${index}`}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  navigateLightboxTo(index);
                }}
                className={`h-[53px] w-10 shrink-0 overflow-hidden rounded-[var(--border-radius)] border-b-2 transition-opacity duration-150 ease-in ${
                  lightboxIndex === index ? "border-white opacity-100" : "border-transparent opacity-50 hover:opacity-80"
                }`}
                aria-label={`Open image ${index + 1}`}
              >
                <img src={image} alt={`${product.name} thumbnail ${index + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {isSizeGuideOpen ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 px-3 py-6"
          onClick={() => setSizeGuideOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Size Guide"
        >
          <div
            className="relative max-h-[80vh] w-full max-w-[480px] overflow-y-auto rounded-[var(--border-radius)] bg-[var(--color-secondary)] p-8 sm:p-10"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSizeGuideOpen(false)}
              className="absolute right-5 top-5 text-[var(--color-muted)] transition-colors duration-200 hover:text-[var(--color-primary)]"
              aria-label="Close size guide"
            >
              <X size={20} strokeWidth={1.4} />
            </button>

            <h3 className="font-manrope text-[28px]  text-[var(--color-primary)]">Size Guide</h3>
            <p className="mb-8 font-manrope text-[11px] text-[var(--color-muted-soft)]">{categoryLabel}</p>

            {isBagCategory ? (
              <p className="font-manrope text-[12px] leading-[1.8] text-[var(--color-muted)]">
                One size - see product dimensions in the description.
              </p>
            ) : isShoeCategory ? (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[var(--color-primary)] font-manrope text-[10px] uppercase tracking-[0.08em] text-[var(--color-secondary)]">
                    <th className="px-4 py-3 text-left">UK</th>
                    <th className="px-4 py-3 text-left">EU</th>
                    <th className="px-4 py-3 text-left">US</th>
                    <th className="px-4 py-3 text-left">Foot length (cm)</th>
                  </tr>
                </thead>
                <tbody>
                  {shoeSizeGuideRows.map((row, index) => (
                    <tr key={row.uk} className={index % 2 === 0 ? "bg-[var(--color-secondary)]" : "bg-[rgba(var(--color-navbar-solid-foreground-rgb),0.03)]"}>
                      <td className="px-4 py-2.5 font-manrope text-[12px] text-[var(--color-muted)]">{row.uk}</td>
                      <td className="px-4 py-2.5 font-manrope text-[12px] text-[var(--color-muted)]">{row.eu}</td>
                      <td className="px-4 py-2.5 font-manrope text-[12px] text-[var(--color-muted)]">{row.us}</td>
                      <td className="px-4 py-2.5 font-manrope text-[12px] text-[var(--color-muted)]">{row.foot}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[var(--color-primary)] font-manrope text-[10px] uppercase tracking-[0.08em] text-[var(--color-secondary)]">
                    <th className="px-4 py-3 text-left">Size</th>
                    <th className="px-4 py-3 text-left">Chest (cm)</th>
                    <th className="px-4 py-3 text-left">Waist (cm)</th>
                    <th className="px-4 py-3 text-left">Hips (cm)</th>
                  </tr>
                </thead>
                <tbody>
                  {clothingSizeGuideRows.map((row, index) => (
                    <tr key={row.size} className={index % 2 === 0 ? "bg-[var(--color-secondary)]" : "bg-[rgba(var(--color-navbar-solid-foreground-rgb),0.03)]"}>
                      <td className="px-4 py-2.5 font-manrope text-[12px] text-[var(--color-muted)]">{row.size}</td>
                      <td className="px-4 py-2.5 font-manrope text-[12px] text-[var(--color-muted)]">{row.chest}</td>
                      <td className="px-4 py-2.5 font-manrope text-[12px] text-[var(--color-muted)]">{row.waist}</td>
                      <td className="px-4 py-2.5 font-manrope text-[12px] text-[var(--color-muted)]">{row.hips}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <p className="mt-4 font-manrope text-[11px] leading-[1.8] text-[var(--color-muted-soft)]">
              Measurements are approximate. If you are between sizes we recommend sizing up.
            </p>
          </div>
        </div>
      ) : null}

      {showTryOn ? <TryOnModal product={product} isOpen={isTryOnOpen} onClose={() => setTryOnOpen(false)} /> : null}
    </div>
  );
};

export default ProductPage;


