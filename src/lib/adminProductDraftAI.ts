import { getBrandTag, getBrandSlugFromTags as getBrandSlugFromBrandTags, setBrandTagInTags, storeBrandOptions } from "@/config/brands.config";

export interface AiDraftBenefit {
  icon: string;
  label: string;
  description: string;
}

export interface AiDraftCoreFields {
  name: string | null;
  price: number | null;
  stock_quantity: number | null;
  stock_per_variant: number | null;
  short_description: string | null;
  full_description: string | null;
  meta_title: string | null;
  meta_description: string | null;
  tags: string[];
  benefits: AiDraftBenefit[];
  sku_suggestion: string | null;
}

export interface AiDraftOptionValue {
  value: string;
  color_hex: string | null;
}

export interface AiDraftOptionType {
  name: string;
  values: AiDraftOptionValue[];
}

export interface AiDraftVariantPreview {
  label: string;
  options: Array<{
    option_type: string;
    option_value: string;
  }>;
}

export interface AiDraftConfidenceFlags {
  name_explicit: boolean;
  price_explicit: boolean;
  colors_explicit: boolean;
  sizes_explicit: boolean;
  name_inferred: boolean;
  price_inferred: boolean;
}

export interface AiDraftExtractionResult {
  core_fields: AiDraftCoreFields;
  option_types: AiDraftOptionType[];
  variant_preview: AiDraftVariantPreview[];
  warnings: string[];
  confidence_flags: AiDraftConfidenceFlags;
}

export interface AiDraftEnrichmentFields {
  name?: string | null;
  price?: number | null;
  stock_quantity?: number | null;
  stock_per_variant?: number | null;
  short_description?: string | null;
  full_description?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  tags?: string[];
  benefits?: Array<{
    icon?: string | null;
    label?: string | null;
    description?: string | null;
  }>;
  sku_suggestion?: string | null;
  option_types?: Array<{
    name?: string | null;
    values?: Array<
      | string
      | {
          value?: string | null;
          color_hex?: string | null;
        }
    >;
  }>;
}

const COLOR_SWATCHES: Record<string, { label: string; hex: string | null }> = {
  black: { label: "Black", hex: "#111111" },
  white: { label: "White", hex: "#FFFFFF" },
  cream: { label: "Cream", hex: "#FFF3E0" },
  yellow: { label: "Yellow", hex: "#FBC02D" },
  violet: { label: "Violet", hex: "#8E24AA" },
  purple: { label: "Purple", hex: "#7E57C2" },
  blue: { label: "Blue", hex: "#1E88E5" },
  navy: { label: "Navy", hex: "#1A237E" },
  red: { label: "Red", hex: "#D32F2F" },
  green: { label: "Green", hex: "#2E7D32" },
  brown: { label: "Brown", hex: "#6D4C41" },
  beige: { label: "Beige", hex: "#D7CCC8" },
  gray: { label: "Gray", hex: "#9E9E9E" },
  grey: { label: "Grey", hex: "#9E9E9E" },
  orange: { label: "Orange", hex: "#F57C00" },
  pink: { label: "Pink", hex: "#EC407A" },
  wine: { label: "Wine", hex: "#722F37" },
  gold: { label: "Gold", hex: "#C9A227" },
  silver: { label: "Silver", hex: "#B0BEC5" },
  maroon: { label: "Maroon", hex: "#800000" },
  khaki: { label: "Khaki", hex: "#BDB76B" },
};

const ALPHA_SIZE_SCALE = ["XXXS", "XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "4XL", "5XL"];
const NUMERIC_SIZE_SCALE = ["26", "28", "30", "32", "34", "36", "38", "40", "42", "44", "46", "48", "50"];
const SIZE_SCALES = [ALPHA_SIZE_SCALE, NUMERIC_SIZE_SCALE];
const KNOWN_SIZE_SET = new Set([...ALPHA_SIZE_SCALE, ...NUMERIC_SIZE_SCALE]);

const BENEFIT_ICON_FALLBACK = "star";

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

const toTitleCase = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const canonicalOptionTypeName = (value: string) => {
  const key = normalizeWhitespace(value).toLowerCase();
  if (!key) return "";
  if (["color", "colors", "colour", "colours"].includes(key)) return "Color";
  if (["size", "sizes", "sizing"].includes(key)) return "Size";
  return toTitleCase(key);
};

const uniqueCaseInsensitive = (values: string[]) => {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(normalized);
  }

  return deduped;
};

const BRAND_TOKEN_SANITIZE_REGEX = /[^a-z0-9\s-]/g;

const knownBrandSlugSet = new Set(storeBrandOptions.map((brand) => brand.slug));
const knownBrandLabelToSlug = new Map(storeBrandOptions.map((brand) => [brand.label.toLowerCase(), brand.slug]));
const brandOptionsByLabelLength = [...storeBrandOptions].sort((a, b) => b.label.length - a.label.length);

const toBrandSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(BRAND_TOKEN_SANITIZE_REGEX, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseBrandSlugFromLooseValue = (value: string): string | null => {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return null;

  const explicitBrandSlug = getBrandSlugFromBrandTags([normalized]);
  if (explicitBrandSlug) return explicitBrandSlug;

  const byLabel = knownBrandLabelToSlug.get(normalized.toLowerCase());
  if (byLabel) return byLabel;

  const slug = toBrandSlug(normalized);
  return knownBrandSlugSet.has(slug) ? slug : null;
};

const inferBrandSlugFromText = (value: string | null | undefined): string | null => {
  const normalized = normalizeWhitespace(value ?? "").toLowerCase();
  if (!normalized) return null;

  for (const brand of brandOptionsByLabelLength) {
    const labelPattern = new RegExp(`(?:^|[^a-z0-9])${escapeRegex(brand.label.toLowerCase())}(?:[^a-z0-9]|$)`, "i");
    const slugPattern = new RegExp(`(?:^|[^a-z0-9])${escapeRegex(brand.slug.toLowerCase())}(?:[^a-z0-9]|$)`, "i");
    if (labelPattern.test(normalized) || slugPattern.test(normalized)) {
      return brand.slug;
    }
  }

  return null;
};

const getKnownBrandSlugFromTags = (tags: string[] | null | undefined): string | null => {
  const explicitBrandSlug = getBrandSlugFromBrandTags(tags);
  if (explicitBrandSlug) return explicitBrandSlug;
  if (!Array.isArray(tags)) return null;

  for (const tag of tags) {
    if (typeof tag !== "string") continue;
    const parsed = parseBrandSlugFromLooseValue(tag);
    if (parsed) return parsed;
  }

  return null;
};

const normalizeTagsWithBrand = (tags: string[], fallbackBrandSlug: string | null = null) => {
  const dedupedTags = uniqueCaseInsensitive(tags);
  const selectedBrandSlug = getKnownBrandSlugFromTags(dedupedTags) ?? fallbackBrandSlug;
  const withBrandTag = setBrandTagInTags(dedupedTags, selectedBrandSlug);
  if (!selectedBrandSlug) return withBrandTag;

  const normalizedBrandTag = getBrandTag(selectedBrandSlug).toLowerCase();
  const selectedBrandLabel = storeBrandOptions.find((brand) => brand.slug === selectedBrandSlug)?.label.toLowerCase() ?? "";

  return withBrandTag.filter((tag) => {
    if (tag.toLowerCase() === normalizedBrandTag) return true;
    const normalizedTag = normalizeWhitespace(tag).toLowerCase();
    if (normalizedTag === selectedBrandLabel) return false;
    return toBrandSlug(normalizedTag) !== selectedBrandSlug;
  });
};

const normalizeColorOptionValue = (value: string, colorHex?: string | null): AiDraftOptionValue => {
  const normalized = normalizeWhitespace(value);
  const mapped = COLOR_SWATCHES[normalized.toLowerCase()];
  return {
    value: mapped?.label ?? toTitleCase(normalized),
    color_hex: colorHex ?? mapped?.hex ?? null,
  };
};

const mergeOptionTypes = (
  deterministicOptionTypes: AiDraftOptionType[],
  enrichmentOptionTypes: AiDraftEnrichmentFields["option_types"],
) => {
  const mergedByName = new Map<string, AiDraftOptionType>();

  const appendValue = (optionTypeName: string, optionValue: AiDraftOptionValue) => {
    const canonicalName = canonicalOptionTypeName(optionTypeName);
    if (!canonicalName) return;

    const existing = mergedByName.get(canonicalName) ?? {
      name: canonicalName,
      values: [],
    };

    const valueKey = normalizeWhitespace(optionValue.value).toLowerCase();
    if (!valueKey) return;

    const hasExisting = existing.values.some((entry) => normalizeWhitespace(entry.value).toLowerCase() === valueKey);
    if (!hasExisting) {
      existing.values.push(optionValue);
    }

    mergedByName.set(canonicalName, existing);
  };

  for (const optionType of deterministicOptionTypes) {
    const canonicalName = canonicalOptionTypeName(optionType.name);
    if (!canonicalName) continue;
    for (const optionValue of optionType.values) {
      const normalizedValue =
        canonicalName === "Color"
          ? normalizeColorOptionValue(optionValue.value, optionValue.color_hex)
          : {
              value: normalizeWhitespace(optionValue.value).toUpperCase(),
              color_hex: optionValue.color_hex ?? null,
            };
      appendValue(canonicalName, normalizedValue);
    }
  }

  if (Array.isArray(enrichmentOptionTypes)) {
    for (const optionType of enrichmentOptionTypes) {
      if (!optionType || typeof optionType !== "object") continue;
      const canonicalName = canonicalOptionTypeName(typeof optionType.name === "string" ? optionType.name : "");
      if (!canonicalName) continue;

      const rawValues = Array.isArray(optionType.values) ? optionType.values : [];
      for (const rawValue of rawValues) {
        if (typeof rawValue === "string") {
          const normalizedString = normalizeWhitespace(rawValue);
          if (!normalizedString) continue;

          if (canonicalName === "Size") {
            const parsedSizes = parseSizeValues(normalizedString, true);
            for (const sizeValue of parsedSizes.values) {
              appendValue("Size", { value: sizeValue, color_hex: null });
            }
            continue;
          }

          if (canonicalName === "Color") {
            appendValue("Color", normalizeColorOptionValue(normalizedString, null));
            continue;
          }

          appendValue(canonicalName, { value: toTitleCase(normalizedString), color_hex: null });
          continue;
        }

        if (!rawValue || typeof rawValue !== "object") continue;

        const value = normalizeWhitespace(typeof rawValue.value === "string" ? rawValue.value : "");
        const colorHex = typeof rawValue.color_hex === "string" ? rawValue.color_hex : null;
        if (!value) continue;

        if (canonicalName === "Size") {
          const parsedSizes = parseSizeValues(value, true);
          for (const sizeValue of parsedSizes.values) {
            appendValue("Size", { value: sizeValue, color_hex: null });
          }
          continue;
        }

        if (canonicalName === "Color") {
          appendValue("Color", normalizeColorOptionValue(value, colorHex));
          continue;
        }

        appendValue(canonicalName, { value: toTitleCase(value), color_hex: colorHex });
      }
    }
  }

  return Array.from(mergedByName.values()).filter((optionType) => optionType.values.length > 0);
};

const normalizeKey = (key: string) =>
  key
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const parsePriceValue = (rawValue: string): number | null => {
  const normalized = rawValue.trim().toLowerCase();
  if (!normalized) return null;

  const currencyBefore = normalized.match(/(?:ghs?|ghc|gh|cedi(?:s)?)\s*(\d+(?:\.\d{1,2})?)/i);
  if (currencyBefore?.[1]) {
    const parsed = Number(currencyBefore[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const currencyAfter = normalized.match(/(\d+(?:\.\d{1,2})?)\s*(?:ghs?|ghc|gh|cedi(?:s)?)\b/i);
  if (currencyAfter?.[1]) {
    const parsed = Number(currencyAfter[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const parseStockQuantity = (rawValue: string): number | null => {
  const match = rawValue.match(/\b(\d{1,6})\b/);
  if (!match?.[1]) return null;
  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.trunc(parsed));
};

const parseStockDirective = (
  rawValue: string,
): { quantity: number | null; forAllVariants: boolean } | null => {
  const normalized = normalizeWhitespace(rawValue).toLowerCase();
  if (!normalized) return null;

  const mentionsStock = /\bstock(?:s)?\b|\binventory\b/.test(normalized);
  const mentionsAllVariants =
    /\b(all|each|every)\s+variants?\b/.test(normalized) ||
    /\bfor\s+variants?\b/.test(normalized) ||
    /\bper\s+variants?\b/.test(normalized) ||
    /\bfor\s+all\s+variants?\b/.test(normalized) ||
    /\bfor\s+each\s+variant\b/.test(normalized) ||
    /\bfor\s*$/.test(normalized);

  if (!mentionsStock && !mentionsAllVariants) {
    return null;
  }

  const quantity = parseStockQuantity(normalized);
  if (quantity === null) return null;

  return {
    quantity,
    forAllVariants: mentionsAllVariants,
  };
};

const normalizeSizeToken = (value: string) => value.trim().toUpperCase().replace(/\s+/g, "");

const looksLikeSizeToken = (token: string) => {
  const normalized = normalizeSizeToken(token);
  if (!normalized) return false;
  if (KNOWN_SIZE_SET.has(normalized)) return true;
  if (/^\d{2}$/.test(normalized)) return true;
  return /^(\d{1,2}[A-Z]{1,2}|[A-Z]{1,4})$/.test(normalized);
};

const splitListValues = (value: string): string[] =>
  value
    .split(/[,\n;/|]+/g)
    .flatMap((entry) => entry.split(/\band\b/gi))
    .map((entry) => normalizeWhitespace(entry))
    .filter(Boolean);

const extractColors = (value: string): AiDraftOptionValue[] => {
  const normalized = normalizeWhitespace(value.toLowerCase());
  if (!normalized) return [];

  const fromSplit = splitListValues(value);
  const candidates =
    fromSplit.length > 1
      ? fromSplit
      : normalized.split(/\s+/g).length <= 6
        ? normalized.split(/\s+/g)
        : fromSplit;

  const colorValues: AiDraftOptionValue[] = [];

  for (const candidate of candidates) {
    const mapped = COLOR_SWATCHES[candidate.toLowerCase()];
    if (!mapped) continue;
    colorValues.push({
      value: mapped.label,
      color_hex: mapped.hex,
    });
  }

  return colorValues;
};

const expandStrictSizeRange = (token: string): { values: string[]; warning: string | null } => {
  const rangeMatch = token.match(/^([A-Za-z0-9+]+)\s*-\s*([A-Za-z0-9+]+)$/);
  if (!rangeMatch) {
    return { values: [normalizeSizeToken(token)], warning: null };
  }

  const start = normalizeSizeToken(rangeMatch[1]);
  const end = normalizeSizeToken(rangeMatch[2]);

  for (const scale of SIZE_SCALES) {
    const startIndex = scale.indexOf(start);
    const endIndex = scale.indexOf(end);
    if (startIndex < 0 || endIndex < 0) continue;
    if (startIndex > endIndex) {
      return {
        values: [`${start}-${end}`],
        warning: `Could not expand size range "${start}-${end}" because the order is reversed.`,
      };
    }
    return {
      values: scale.slice(startIndex, endIndex + 1),
      warning: null,
    };
  }

  return {
    values: [`${start}-${end}`],
    warning: `Could not expand non-standard size range "${start}-${end}".`,
  };
};

export const parseSizeValues = (value: string, fromSizeField = false): { values: string[]; warnings: string[] } => {
  const normalizedInput = normalizeWhitespace(value);
  const rawTokens = splitListValues(normalizedInput);
  const tokens = rawTokens.length > 0 ? rawTokens : [normalizedInput];
  const warnings: string[] = [];
  const values: string[] = [];

  const sentenceRangeMatches = Array.from(
    normalizedInput.matchAll(/(?:from\s+)?([A-Za-z0-9+]{1,8})\s*(?:-|to)\s*([A-Za-z0-9+]{1,8})/gi),
  );

  for (const rangeMatch of sentenceRangeMatches) {
    const start = rangeMatch[1] ?? "";
    const end = rangeMatch[2] ?? "";
    const expanded = expandStrictSizeRange(`${start}-${end}`);
    values.push(...expanded.values);
    if (expanded.warning) {
      warnings.push(expanded.warning);
    }
  }

  for (const token of tokens) {
    if (!token) continue;
    if (token.includes("-") || /\bto\b/i.test(token)) {
      const inTokenRange = token.match(/([A-Za-z0-9+]{1,8})\s*(?:-|to)\s*([A-Za-z0-9+]{1,8})/i);
      if (!inTokenRange) {
        continue;
      }

      const expanded = expandStrictSizeRange(`${inTokenRange[1]}-${inTokenRange[2]}`);
      values.push(...expanded.values);
      if (expanded.warning) {
        warnings.push(expanded.warning);
      }
      continue;
    }

    const cleanedToken = token
      .replace(/\b(from|size|sizes|between|range)\b/gi, " ")
      .replace(/[():]/g, " ");
    const normalized = normalizeSizeToken(cleanedToken);
    if (!normalized) continue;
    if (fromSizeField || looksLikeSizeToken(normalized)) {
      values.push(normalized);
    }
  }

  return {
    values: uniqueCaseInsensitive(values).map((entry) => entry.toUpperCase()),
    warnings: uniqueCaseInsensitive(warnings),
  };
};

const normalizeTextValue = (value: string) => {
  const withoutBrackets = value.trim().replace(/^\[+/, "").replace(/\]+$/, "");
  return normalizeWhitespace(withoutBrackets);
};

export const buildVariantPreview = (optionTypes: AiDraftOptionType[]): AiDraftVariantPreview[] => {
  const activeOptionTypes = optionTypes
    .map((optionType) => ({
      name: normalizeWhitespace(optionType.name),
      values: optionType.values
        .map((value) => ({
          value: normalizeWhitespace(value.value),
          color_hex: value.color_hex ?? null,
        }))
        .filter((value) => Boolean(value.value)),
    }))
    .filter((optionType) => optionType.name && optionType.values.length > 0);

  if (activeOptionTypes.length === 0) {
    return [];
  }

  const valueArrays = activeOptionTypes.map((optionType) =>
    optionType.values.map((value) => ({
      option_type: optionType.name,
      option_value: value.value,
    })),
  );

  const combinations = valueArrays.reduce<Array<Array<{ option_type: string; option_value: string }>>>(
    (accumulator, entries) => accumulator.flatMap((combo) => entries.map((entry) => [...combo, entry])),
    [[]],
  );

  return combinations.map((combo, index) => ({
    label: combo.map((entry) => entry.option_value).join(" / ") || `Variant ${index + 1}`,
    options: combo,
  }));
};

const dedupeOptionValues = (values: AiDraftOptionValue[]) => {
  const seen = new Set<string>();
  const deduped: AiDraftOptionValue[] = [];

  for (const value of values) {
    const normalized = normalizeWhitespace(value.value);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({
      value: normalized,
      color_hex: value.color_hex ?? null,
    });
  }

  return deduped;
};

const normalizeBenefits = (value: AiDraftEnrichmentFields["benefits"]): AiDraftBenefit[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const label = normalizeWhitespace(typeof entry.label === "string" ? entry.label : "");
      const description = normalizeWhitespace(typeof entry.description === "string" ? entry.description : "");

      if (!label && !description) return null;

      return {
        icon: normalizeWhitespace(typeof entry.icon === "string" ? entry.icon : BENEFIT_ICON_FALLBACK) || BENEFIT_ICON_FALLBACK,
        label: label || description,
        description,
      } satisfies AiDraftBenefit;
    })
    .filter((entry): entry is AiDraftBenefit => Boolean(entry))
    .slice(0, 6);
};

export const extractDeterministicDraftInput = (rawInput: string): AiDraftExtractionResult => {
  const lines = rawInput
    .split(/\r?\n/g)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

  let name: string | null = null;
  let price: number | null = null;
  let stockQuantity: number | null = null;
  let stockPerVariant: number | null = null;
  let shortDescription: string | null = null;
  let fullDescription: string | null = null;
  let metaTitle: string | null = null;
  let metaDescription: string | null = null;
  let skuSuggestion: string | null = null;

  const warnings: string[] = [];
  const tags: string[] = [];
  const colorValues: AiDraftOptionValue[] = [];
  const sizeValues: string[] = [];

  let nameExplicit = false;
  let priceExplicit = false;
  let colorsExplicit = false;
  let sizesExplicit = false;

  for (const line of lines) {
    const keyValueMatch = line.match(/^([^:=]+)\s*[:=]\s*(.+)$/);

    if (keyValueMatch) {
      const normalizedKey = normalizeKey(keyValueMatch[1] ?? "");
      const normalizedValue = normalizeTextValue(keyValueMatch[2] ?? "");

      if (!normalizedValue) {
        continue;
      }

      if (normalizedKey.includes("name") || normalizedKey.includes("title")) {
        name = normalizedValue;
        nameExplicit = true;
        continue;
      }

      if (normalizedKey.includes("price") || normalizedKey.includes("amount") || normalizedKey.includes("cost")) {
        const parsed = parsePriceValue(normalizedValue);
        if (parsed !== null) {
          price = parsed;
          priceExplicit = true;
        }
        continue;
      }

      if (normalizedKey.includes("stock") || normalizedKey.includes("inventory")) {
        const stockDirective = parseStockDirective(normalizedValue);
        if (stockDirective && stockDirective.quantity !== null) {
          if (stockDirective.forAllVariants) {
            stockPerVariant = stockDirective.quantity;
          } else {
            stockQuantity = stockDirective.quantity;
          }
        } else {
          const fallbackStock = parseStockQuantity(normalizedValue);
          if (fallbackStock !== null) {
            stockQuantity = fallbackStock;
          }
        }
        continue;
      }

      if (normalizedKey.includes("color")) {
        const colors = extractColors(normalizedValue);
        colorValues.push(...colors);
        colorsExplicit = colorsExplicit || colors.length > 0;
        continue;
      }

      if (normalizedKey.includes("size")) {
        const parsedSizes = parseSizeValues(normalizedValue, true);
        sizeValues.push(...parsedSizes.values);
        warnings.push(...parsedSizes.warnings);
        sizesExplicit = sizesExplicit || parsedSizes.values.length > 0;
        continue;
      }

      if (normalizedKey.includes("tag")) {
        tags.push(...splitListValues(normalizedValue));
        continue;
      }

      if (normalizedKey.includes("brand")) {
        const explicitBrandSlug = parseBrandSlugFromLooseValue(normalizedValue);
        if (explicitBrandSlug) {
          tags.push(getBrandTag(explicitBrandSlug));
        }
        continue;
      }

      if (normalizedKey.includes("short") && normalizedKey.includes("description")) {
        shortDescription = normalizedValue;
        continue;
      }

      if (normalizedKey.includes("meta") && normalizedKey.includes("title")) {
        metaTitle = normalizedValue;
        continue;
      }

      if (normalizedKey.includes("meta") && normalizedKey.includes("description")) {
        metaDescription = normalizedValue;
        continue;
      }

      if (normalizedKey.includes("description")) {
        fullDescription = normalizedValue;
        continue;
      }

      if (normalizedKey.includes("sku")) {
        skuSuggestion = normalizedValue.toUpperCase();
      }

      continue;
    }

    if (!priceExplicit) {
      const parsedLinePrice = parsePriceValue(line);
      if (parsedLinePrice !== null) {
        price = parsedLinePrice;
        priceExplicit = true;
        continue;
      }
    }

    const parsedLineStock = parseStockDirective(line);
    if (parsedLineStock && parsedLineStock.quantity !== null) {
      if (parsedLineStock.forAllVariants) {
        stockPerVariant = parsedLineStock.quantity;
      } else {
        stockQuantity = parsedLineStock.quantity;
      }
      continue;
    }

    const colorsFromLine = extractColors(line);
    if (colorsFromLine.length > 0) {
      colorValues.push(...colorsFromLine);
      colorsExplicit = true;
      continue;
    }

    const parsedSizes = parseSizeValues(line, false);
    if (parsedSizes.values.length > 0) {
      sizeValues.push(...parsedSizes.values);
      warnings.push(...parsedSizes.warnings);
      sizesExplicit = true;
      continue;
    }
  }

  const optionTypes: AiDraftOptionType[] = [];
  const dedupedColorValues = dedupeOptionValues(colorValues);
  const dedupedSizeValues = uniqueCaseInsensitive(sizeValues).map((entry) => entry.toUpperCase());

  if (dedupedColorValues.length > 0) {
    optionTypes.push({
      name: "Color",
      values: dedupedColorValues,
    });
  }

  if (dedupedSizeValues.length > 0) {
    optionTypes.push({
      name: "Size",
      values: dedupedSizeValues.map((value) => ({
        value,
        color_hex: null,
      })),
    });
  }

  const variantPreview = buildVariantPreview(optionTypes);

  return {
    core_fields: {
      name,
      price,
      stock_quantity: stockQuantity,
      stock_per_variant: stockPerVariant,
      short_description: shortDescription,
      full_description: fullDescription,
      meta_title: metaTitle,
      meta_description: metaDescription,
      tags: normalizeTagsWithBrand(tags, inferBrandSlugFromText(rawInput)),
      benefits: [],
      sku_suggestion: skuSuggestion,
    },
    option_types: optionTypes,
    variant_preview: variantPreview,
    warnings: uniqueCaseInsensitive(warnings),
    confidence_flags: {
      name_explicit: nameExplicit,
      price_explicit: priceExplicit,
      colors_explicit: colorsExplicit,
      sizes_explicit: sizesExplicit,
      name_inferred: false,
      price_inferred: false,
    },
  };
};

export const mergeDeterministicWithEnrichment = (
  deterministic: AiDraftExtractionResult,
  enrichment: AiDraftEnrichmentFields | null | undefined,
): AiDraftExtractionResult => {
  const source = enrichment ?? {};
  const explicitName = deterministic.core_fields.name ? normalizeWhitespace(deterministic.core_fields.name) : "";
  const enrichedName = typeof source.name === "string" ? normalizeWhitespace(source.name) : "";

  const explicitPrice = deterministic.core_fields.price;
  const enrichedPrice = typeof source.price === "number" && Number.isFinite(source.price) ? source.price : null;
  const explicitStockQuantity =
    typeof deterministic.core_fields.stock_quantity === "number" && Number.isFinite(deterministic.core_fields.stock_quantity)
      ? Math.max(0, Math.trunc(deterministic.core_fields.stock_quantity))
      : null;
  const enrichedStockQuantity =
    typeof source.stock_quantity === "number" && Number.isFinite(source.stock_quantity)
      ? Math.max(0, Math.trunc(source.stock_quantity))
      : null;
  const explicitStockPerVariant =
    typeof deterministic.core_fields.stock_per_variant === "number" && Number.isFinite(deterministic.core_fields.stock_per_variant)
      ? Math.max(0, Math.trunc(deterministic.core_fields.stock_per_variant))
      : null;
  const enrichedStockPerVariant =
    typeof source.stock_per_variant === "number" && Number.isFinite(source.stock_per_variant)
      ? Math.max(0, Math.trunc(source.stock_per_variant))
      : null;

  const mergedTagsRaw = uniqueCaseInsensitive([
    ...(deterministic.core_fields.tags ?? []),
    ...(Array.isArray(source.tags) ? source.tags : []),
  ]);
  const inferredBrandSlug = inferBrandSlugFromText(
    [explicitName, enrichedName, ...mergedTagsRaw].filter(Boolean).join(" "),
  );
  const mergedTags = normalizeTagsWithBrand(mergedTagsRaw, inferredBrandSlug);
  const mergedOptionTypes = mergeOptionTypes(deterministic.option_types ?? [], source.option_types);
  const mergedVariantPreview = buildVariantPreview(mergedOptionTypes);

  const mergedName = enrichedName || explicitName || null;

  const mergedCoreFields: AiDraftCoreFields = {
    name: mergedName,
    price: explicitPrice ?? enrichedPrice ?? null,
    stock_quantity: explicitStockQuantity ?? enrichedStockQuantity ?? null,
    stock_per_variant: explicitStockPerVariant ?? enrichedStockPerVariant ?? null,
    short_description:
      deterministic.core_fields.short_description ||
      (typeof source.short_description === "string" ? normalizeWhitespace(source.short_description) : null) ||
      null,
    full_description:
      deterministic.core_fields.full_description ||
      (typeof source.full_description === "string" ? normalizeWhitespace(source.full_description) : null) ||
      null,
    meta_title:
      deterministic.core_fields.meta_title ||
      (typeof source.meta_title === "string" ? normalizeWhitespace(source.meta_title) : null) ||
      null,
    meta_description:
      deterministic.core_fields.meta_description ||
      (typeof source.meta_description === "string" ? normalizeWhitespace(source.meta_description) : null) ||
      null,
    tags: mergedTags,
    benefits: normalizeBenefits(source.benefits),
    sku_suggestion:
      deterministic.core_fields.sku_suggestion ||
      (typeof source.sku_suggestion === "string" ? normalizeWhitespace(source.sku_suggestion).toUpperCase() : null) ||
      null,
  };

  const warnings = [...(deterministic.warnings ?? [])];
  const hadDeterministicOptions = (deterministic.option_types ?? []).some((optionType) => optionType.values.length > 0);
  const hasMergedOptions = mergedOptionTypes.some((optionType) => optionType.values.length > 0);
  const nameImproved =
    Boolean(explicitName) &&
    Boolean(enrichedName) &&
    explicitName.toLowerCase() !== enrichedName.toLowerCase();
  const nameInferred = !deterministic.confidence_flags.name_explicit && Boolean(mergedCoreFields.name);
  const priceInferred = !deterministic.confidence_flags.price_explicit && mergedCoreFields.price !== null;
  const stockInferred = explicitStockQuantity === null && explicitStockPerVariant === null
    && (mergedCoreFields.stock_quantity !== null || mergedCoreFields.stock_per_variant !== null);

  if (nameImproved) {
    warnings.push("Product name was improved by AI for SEO and slug quality.");
  }

  if (nameInferred && enrichedName) {
    warnings.push("Product name was inferred by AI from the prompt.");
  }

  if (priceInferred && enrichedPrice !== null) {
    warnings.push("Price was inferred by AI because no explicit price was detected.");
  }

  if (stockInferred) {
    warnings.push("Stock values were inferred by AI because no explicit stock directive was detected.");
  }

  if (!hadDeterministicOptions && hasMergedOptions) {
    warnings.push("Variant options were inferred from conversational input and/or product images.");
  }

  return {
    ...deterministic,
    core_fields: mergedCoreFields,
    option_types: mergedOptionTypes,
    variant_preview: mergedVariantPreview,
    warnings: uniqueCaseInsensitive(warnings),
    confidence_flags: {
      ...deterministic.confidence_flags,
      name_inferred: nameInferred,
      price_inferred: priceInferred,
    },
  };
};
