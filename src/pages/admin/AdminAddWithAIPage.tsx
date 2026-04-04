import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  createAdminProduct,
  fetchAdminCategories,
  updateAdminProduct,
  uploadProductImage,
  type ProductImageObject,
} from "@/services/adminService";
import {
  buildVariantPreview,
  type AiDraftBenefit,
  type AiDraftExtractionResult,
  type AiDraftOptionType,
} from "@/lib/adminProductDraftAI";

interface AiDraftFunctionResponse {
  success?: boolean;
  message?: string;
  data?: AiDraftExtractionResult;
}

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const toImageJson = (images: ProductImageObject[]) =>
  images.map((image, index) => ({
    url: image.url,
    alt_text: image.alt_text,
    is_primary: index === 0,
    display_order: index,
  }));

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

const normalizeSkuToken = (value: string, fallback = "VAR") => {
  const token = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 4);
  return token || fallback;
};

const buildVariantSku = (
  baseSku: string | null,
  optionValues: Array<{ option_type: string; option_value: string }>,
  index: number,
) => {
  const base = baseSku ? normalizeSkuToken(baseSku, "SKU") : "";
  if (!base) return null;
  const suffix = optionValues.map((entry) => normalizeSkuToken(entry.option_value)).join("-");
  return suffix ? `${base}-${suffix}` : `${base}-${String(index + 1).padStart(2, "0")}`;
};

const normalizeBenefits = (benefits: AiDraftBenefit[]) =>
  benefits
    .map((entry, index) => ({
      id: crypto.randomUUID(),
      icon: entry.icon || "star",
      label: entry.label,
      description: entry.description,
      display_order: index,
    }))
    .filter((entry) => entry.label || entry.description)
    .slice(0, 6);

const normalizeOptionTypes = (optionTypes: AiDraftOptionType[]): AiDraftOptionType[] =>
  optionTypes
    .map((optionType) => ({
      name: optionType.name.trim(),
      values: optionType.values
        .map((optionValue) => ({
          value: optionValue.value.trim(),
          color_hex: optionValue.color_hex,
        }))
        .filter((optionValue) => optionValue.value.length > 0),
    }))
    .filter((optionType) => optionType.name.length > 0 && optionType.values.length > 0);

const saveDraftOptionTypesAndVariants = async ({
  productId,
  optionTypes,
  productPrice,
  skuSuggestion,
  variantStockQuantity,
}: {
  productId: string;
  optionTypes: AiDraftOptionType[];
  productPrice: number;
  skuSuggestion: string | null;
  variantStockQuantity: number;
}) => {
  const normalizedOptionTypes = normalizeOptionTypes(optionTypes);
  if (normalizedOptionTypes.length === 0) {
    return;
  }

  const optionTypeIdByName = new Map<string, string>();
  const optionValueIdByTypeAndValue = new Map<string, string>();

  for (const [typeIndex, optionType] of normalizedOptionTypes.entries()) {
    const { data: insertedType, error: insertTypeError } = await (supabase as any)
      .from("product_option_types")
      .insert({
        product_id: productId,
        name: optionType.name,
        display_order: typeIndex,
      })
      .select("id")
      .single();

    if (insertTypeError || !insertedType?.id) {
      throw insertTypeError || new Error("Failed to create option type");
    }

    const optionTypeId = insertedType.id as string;
    const optionTypeKey = optionType.name.toLowerCase();
    optionTypeIdByName.set(optionTypeKey, optionTypeId);

    for (const [valueIndex, optionValue] of optionType.values.entries()) {
      const { data: insertedValue, error: insertValueError } = await (supabase as any)
        .from("product_option_values")
        .insert({
          option_type_id: optionTypeId,
          value: optionValue.value,
          color_hex: optionValue.color_hex,
          display_order: valueIndex,
        })
        .select("id")
        .single();

      if (insertValueError || !insertedValue?.id) {
        throw insertValueError || new Error("Failed to create option value");
      }

      optionValueIdByTypeAndValue.set(`${optionTypeKey}|${optionValue.value.toLowerCase()}`, insertedValue.id as string);
    }
  }

  const previewRows = buildVariantPreview(normalizedOptionTypes);

  for (const [variantIndex, preview] of previewRows.entries()) {
    const variantSku = buildVariantSku(skuSuggestion, preview.options, variantIndex);
    const { data: insertedVariant, error: insertVariantError } = await (supabase as any)
      .from("product_variants")
      .insert({
        product_id: productId,
        label: preview.label,
        price: productPrice,
        compare_at_price: null,
        stock_quantity: variantStockQuantity,
        low_stock_threshold: 5,
        sku: variantSku,
        is_available: true,
        display_order: variantIndex,
      })
      .select("id")
      .single();

    if (insertVariantError || !insertedVariant?.id) {
      throw insertVariantError || new Error("Failed to create variant");
    }

    const variantId = insertedVariant.id as string;
    const optionLinks = preview.options
      .map((entry) => {
        const optionTypeKey = entry.option_type.toLowerCase();
        const optionValueKey = `${optionTypeKey}|${entry.option_value.toLowerCase()}`;
        const optionTypeId = optionTypeIdByName.get(optionTypeKey);
        const optionValueId = optionValueIdByTypeAndValue.get(optionValueKey);

        if (!optionTypeId || !optionValueId) {
          return null;
        }

        return {
          variant_id: variantId,
          option_type_id: optionTypeId,
          option_value_id: optionValueId,
        };
      })
      .filter(
        (entry): entry is { variant_id: string; option_type_id: string; option_value_id: string } => Boolean(entry),
      );

    if (optionLinks.length > 0) {
      const { error: linkError } = await (supabase as any).from("product_variant_options").insert(optionLinks);
      if (linkError) {
        throw linkError;
      }
    }
  }
};

const AdminAddWithAIPage = () => {
  const navigate = useNavigate();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [categoryId, setCategoryId] = useState("");
  const [rawInput, setRawInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [previewResult, setPreviewResult] = useState<AiDraftExtractionResult | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const categoryRows = await fetchAdminCategories();
        if (!isMounted) return;
        setCategories(categoryRows);
      } catch {
        if (!isMounted) return;
        setErrorMessage("Unable to load categories.");
      } finally {
        if (isMounted) {
          setIsLoadingCategories(false);
        }
      }
    };

    void loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  const imagePreviewUrls = useMemo(
    () =>
      files.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [files],
  );

  useEffect(() => {
    return () => {
      imagePreviewUrls.forEach((entry) => URL.revokeObjectURL(entry.url));
    };
  }, [imagePreviewUrls]);

  const selectedCategoryName = useMemo(
    () => categories.find((category) => category.id === categoryId)?.name ?? "",
    [categories, categoryId],
  );

  const onSelectFiles = (inputFiles: FileList | null) => {
    if (!inputFiles?.length) {
      return;
    }

    const incoming = Array.from(inputFiles).filter(
      (file) => ALLOWED_IMAGE_TYPES.has(file.type) && file.size <= MAX_IMAGE_BYTES,
    );
    const availableSlots = Math.max(0, MAX_IMAGES - files.length);
    const next = [...files, ...incoming.slice(0, availableSlots)];
    setFiles(next);
  };

  const onRemoveFile = (targetIndex: number) => {
    setFiles((current) => current.filter((_, index) => index !== targetIndex));
  };

  useEffect(() => {
    const textarea = promptTextareaRef.current;
    if (!textarea) return;
    const minHeight = window.matchMedia("(max-width: 640px)").matches ? 136 : 210;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.max(minHeight, textarea.scrollHeight)}px`;
  }, [rawInput]);

  const createDraft = async () => {
    if (!categoryId) {
      setErrorMessage("Select a category before creating with AI.");
      return;
    }

    if (!rawInput.trim()) {
      setErrorMessage("Enter product notes in the prompt field.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setWarnings([]);

    try {
      const imagePayloads = await Promise.all(
        files.map(async (file) => ({
          data: await fileToBase64(file),
          mimeType: file.type,
        })),
      );

      const { data, error } = await supabase.functions.invoke("ai_product_draft_extract", {
        body: {
          raw_input: rawInput.trim(),
          category: selectedCategoryName || undefined,
          images: imagePayloads,
        },
      });

      const response = (data ?? {}) as AiDraftFunctionResponse;
      if (error || !response.success || !response.data) {
        setErrorMessage(response.message || "AI extraction failed. Please try again.");
        return;
      }

      const extraction = response.data;
      setPreviewResult(extraction);
      setWarnings(extraction.warnings ?? []);

      const extractedName = extraction.core_fields.name?.trim() || "Untitled Product";
      const extractedPrice =
        typeof extraction.core_fields.price === "number" && Number.isFinite(extraction.core_fields.price)
          ? Math.max(0, extraction.core_fields.price)
          : 0;
      const extractedStockQuantity =
        typeof extraction.core_fields.stock_quantity === "number" && Number.isFinite(extraction.core_fields.stock_quantity)
          ? Math.max(0, Math.trunc(extraction.core_fields.stock_quantity))
          : null;
      const extractedStockPerVariant =
        typeof extraction.core_fields.stock_per_variant === "number" && Number.isFinite(extraction.core_fields.stock_per_variant)
          ? Math.max(0, Math.trunc(extraction.core_fields.stock_per_variant))
          : null;
      const hasVariants = extraction.option_types.length > 0;
      const variantCount = Math.max(1, extraction.variant_preview.length || 0);
      const variantStockQuantity = hasVariants ? extractedStockPerVariant ?? extractedStockQuantity ?? 0 : 0;
      const initialProductStock = hasVariants
        ? variantStockQuantity * variantCount
        : extractedStockQuantity ?? extractedStockPerVariant ?? 0;
      const draftSlug = `${slugify(extractedName) || "product"}-${Math.random().toString(36).slice(2, 8)}`;

      const created = await createAdminProduct(
        {
          name: extractedName,
          slug: draftSlug,
          short_description: extraction.core_fields.short_description || null,
          description: extraction.core_fields.full_description || null,
          category_id: categoryId,
          price: extractedPrice,
          compare_at_price: null,
          cost_price: null,
          sku: extraction.core_fields.sku_suggestion || null,
          stock_quantity: initialProductStock,
          low_stock_threshold: 5,
          has_variants: hasVariants,
          is_available: false,
          is_featured: false,
          images: [],
          benefits: normalizeBenefits(extraction.core_fields.benefits),
          tags: extraction.core_fields.tags,
          weight_grams: null,
          meta_title: extraction.core_fields.meta_title || null,
          meta_description: extraction.core_fields.meta_description || null,
        } as never,
      );

      if (hasVariants) {
        await saveDraftOptionTypesAndVariants({
          productId: created.id,
          optionTypes: extraction.option_types,
          productPrice: extractedPrice,
          skuSuggestion: extraction.core_fields.sku_suggestion,
          variantStockQuantity,
        });
      }

      if (files.length > 0) {
        const uploaded: ProductImageObject[] = [];
        for (const file of files) {
          const result = await uploadProductImage(created.id, file);
          uploaded.push({
            url: result.url,
            alt_text: extractedName || file.name,
            is_primary: false,
            display_order: 0,
          });
        }

        const normalizedImages = uploaded.map((image, index) => ({
          ...image,
          is_primary: index === 0,
          display_order: index,
        }));

        if (normalizedImages.length > 0) {
          await updateAdminProduct(
            created.id,
            {
              images: toImageJson(normalizedImages),
            },
            created as never,
          );
        }
      }

      navigate(`/admin/products/${created.id}/edit`, { replace: true });
    } catch {
      setErrorMessage("Unable to create AI draft right now. Your prompt and images are still here to retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-page pb-24 md:pb-0">
      <div className="admin-page-header flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="admin-page-title font-display text-[34px] italic text-[var(--color-primary)]">Add with AI</h1>
          <p className="mt-1 font-body text-[11px] text-[var(--color-muted-soft)]">
            Turn product notes and images into a ready draft in one step.
          </p>
        </div>
        <Link
          to="/admin/products"
          className="font-body text-[10px] uppercase tracking-[0.1em] text-[var(--color-accent)] hover:text-[var(--color-primary)]"
        >
          Back to products
        </Link>
      </div>

      <div className="relative mt-10 flex min-h-[calc(100vh-290px)] flex-col items-center justify-center">
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[360px] w-[92%] max-w-[1120px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[95px]"
          style={{ background: "rgba(var(--color-navbar-solid-foreground-rgb),0.08)" }}
        />

        <p className="mb-8 text-center font-display text-[40px] italic leading-[1.1] text-[var(--color-primary)] md:text-[56px]">
          Ready when you are.
        </p>

        <div className="relative z-10 w-full max-w-[980px]">
          {errorMessage ? (
            <p className="mb-4 rounded-[var(--border-radius)] border border-[rgba(var(--color-danger-rgb),0.35)] bg-[rgba(var(--color-danger-rgb),0.08)] px-4 py-3 font-body text-[12px] text-[var(--color-danger)]">
              {errorMessage}
            </p>
          ) : null}

          {warnings.length > 0 ? (
            <div className="mb-4 rounded-[var(--border-radius)] border border-[var(--color-border)] bg-[rgba(var(--color-navbar-solid-foreground-rgb),0.06)] px-4 py-3">
              <p className="mb-2 font-body text-[10px] uppercase tracking-[0.12em] text-[var(--color-accent)]">AI Notes</p>
              <ul className="space-y-1">
                {warnings.map((warning) => (
                  <li key={warning} className="font-body text-[11px] text-[var(--color-muted)]">
                    - {warning}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div
            className="overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]"
            style={{
              borderRadius: "34px",
              boxShadow: "0 30px 90px rgba(var(--color-navbar-solid-foreground-rgb),0.14)",
            }}
          >
            <textarea
              ref={promptTextareaRef}
              value={rawInput}
              onChange={(event) => setRawInput(event.target.value)}
              disabled={isSubmitting}
              placeholder={`incomplete name =[Three set]
price =180gh
Cream
Yellow
Violet
S-L`}
              className="w-full overflow-y-hidden border-0 bg-transparent px-4 py-4 font-body text-[14px] leading-[1.65] text-[var(--color-primary)] outline-none placeholder:text-[var(--color-muted-soft)] sm:px-6 sm:py-6 sm:text-[16px] sm:leading-[1.75]"
            />

            <div className="border-t border-[var(--color-border)] px-4 py-3">
              <div className="overflow-x-auto pb-1">
                <div className="flex min-w-max items-center gap-2">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="inline-flex items-center rounded-full border border-[var(--color-border)] px-3 py-1.5 font-body text-[10px] uppercase tracking-[0.08em] text-[var(--color-primary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-2 sm:text-[11px]"
                  >
                    + Add Images
                  </button>

                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={isSubmitting}
                    onChange={(event) => {
                      onSelectFiles(event.currentTarget.files);
                      event.currentTarget.value = "";
                    }}
                    className="hidden"
                  />

                  <div className="relative inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-1.5 pr-7 sm:gap-2 sm:px-3 sm:py-2 sm:pr-9">
                    <span className="hidden font-body text-[10px] uppercase tracking-[0.1em] text-[var(--color-muted-soft)] sm:inline">
                      Category
                    </span>
                    <select
                      aria-label="Category"
                      value={categoryId}
                      onChange={(event) => setCategoryId(event.target.value)}
                      disabled={isLoadingCategories || isSubmitting}
                      className="min-w-[108px] appearance-none border-0 bg-transparent font-body text-[11px] text-[var(--color-primary)] outline-none sm:min-w-[160px] sm:text-[12px]"
                    >
                      <option value="">{isLoadingCategories ? "Loading..." : "Select"}</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-body text-[11px] text-[var(--color-muted-soft)] sm:right-3 sm:text-[13px]">
                      &#709;
                    </span>
                  </div>

                  <span className="rounded-full border border-[var(--color-border)] px-2 py-1.5 font-body text-[9px] uppercase tracking-[0.09em] text-[var(--color-muted-soft)] sm:px-3 sm:py-2 sm:text-[10px]">
                    {files.length}/{MAX_IMAGES} images
                  </span>
                  <span className="w-2 sm:w-5" />

                  <button
                    type="button"
                    onClick={() => void createDraft()}
                    disabled={isSubmitting || isLoadingCategories}
                    className={`ml-auto rounded-full px-5 py-2.5 font-body text-[11px] uppercase tracking-[0.1em] transition-colors ${
                      isSubmitting || isLoadingCategories
                        ? "cursor-not-allowed border border-[var(--color-border)] text-[var(--color-muted-soft)] opacity-65"
                        : "border border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-secondary)] hover:bg-[var(--color-accent)]"
                    }`}
                  >
                    {isSubmitting ? "Creating Draft..." : "Create Draft with AI"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-3 text-center font-body text-[10px] text-[var(--color-muted-soft)]">
            Price and options from your prompt stay explicit. Name can be refined for SEO and slug quality.
          </p>

          {imagePreviewUrls.length > 0 ? (
            <div className="mt-5 grid grid-cols-3 gap-3 md:grid-cols-6">
              {imagePreviewUrls.map((entry, index) => (
                <div
                  key={`${entry.file.name}-${index}`}
                  className="relative overflow-hidden rounded-[var(--border-radius)] border border-[var(--color-border)] bg-[var(--color-surface-alt)]"
                  style={{ aspectRatio: "3 / 4" }}
                >
                  <img src={entry.url} alt={entry.file.name} className="h-full w-full object-cover" />
                  {index === 0 ? (
                    <span className="absolute left-1 top-1 bg-[var(--color-primary)] px-2 py-0.5 font-body text-[8px] uppercase tracking-[0.08em] text-[var(--color-secondary)]">
                      Primary
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onRemoveFile(index)}
                    disabled={isSubmitting}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-[var(--border-radius)] bg-[rgba(var(--color-navbar-solid-foreground-rgb),0.78)] font-body text-[12px] leading-none text-[var(--color-secondary)] transition-colors hover:bg-[var(--color-danger)] disabled:opacity-50"
                    aria-label={`Remove ${entry.file.name}`}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {previewResult ? (
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <div className="rounded-[var(--border-radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                <p className="font-body text-[10px] uppercase tracking-[0.1em] text-[var(--color-muted-soft)]">Name</p>
                <p className="mt-1 font-body text-[12px] text-[var(--color-primary)]">
                  {previewResult.core_fields.name || "AI inferred later"}
                </p>
              </div>
              <div className="rounded-[var(--border-radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                <p className="font-body text-[10px] uppercase tracking-[0.1em] text-[var(--color-muted-soft)]">Price</p>
                <p className="mt-1 font-body text-[12px] text-[var(--color-primary)]">
                  {typeof previewResult.core_fields.price === "number"
                    ? `GH${previewResult.core_fields.price.toFixed(2)}`
                    : "AI inferred later"}
                </p>
              </div>
              <div className="rounded-[var(--border-radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                <p className="font-body text-[10px] uppercase tracking-[0.1em] text-[var(--color-muted-soft)]">Variants</p>
                <p className="mt-1 font-body text-[12px] text-[var(--color-primary)]">
                  {previewResult.variant_preview.length} combinations
                </p>
              </div>
              <div className="rounded-[var(--border-radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                <p className="font-body text-[10px] uppercase tracking-[0.1em] text-[var(--color-muted-soft)]">Stock</p>
                <p className="mt-1 font-body text-[12px] text-[var(--color-primary)]">
                  {typeof previewResult.core_fields.stock_per_variant === "number"
                    ? `${previewResult.core_fields.stock_per_variant} each variant`
                    : typeof previewResult.core_fields.stock_quantity === "number"
                      ? `${previewResult.core_fields.stock_quantity} total`
                      : "Not specified"}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AdminAddWithAIPage;
