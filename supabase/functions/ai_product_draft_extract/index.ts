import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")
const API_ENDPOINT = "aiplatform.googleapis.com"
const MODEL_ID = "gemini-3.1-flash-lite-preview"
const GENERATE_CONTENT_API = "streamGenerateContent"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const JSON_HEADERS = {
  "Content-Type": "application/json",
  ...CORS_HEADERS,
}

type InlineImageInput = {
  data?: string
  mimeType?: string
}

type RequestBody = {
  raw_input?: string
  category?: string
  images?: InlineImageInput[]
}

type EnrichmentResponse = {
  name?: string
  price?: number
  stock_quantity?: number
  stock_per_variant?: number
  short_description?: string
  full_description?: string
  meta_title?: string
  meta_description?: string
  tags?: string[]
  benefits?: Array<{
    icon?: string
    label?: string
    description?: string
  }>
  sku_suggestion?: string
  option_types?: Array<{
    name?: string
    values?: Array<
      | string
      | {
          value?: string
          color_hex?: string | null
        }
    >
  }>
}

type GeminiChunk = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
}

type OptionValue = {
  value: string
  color_hex: string | null
}

type OptionType = {
  name: string
  values: OptionValue[]
}

type DeterministicResult = {
  core_fields: {
    name: string | null
    price: number | null
    stock_quantity: number | null
    stock_per_variant: number | null
    short_description: string | null
    full_description: string | null
    meta_title: string | null
    meta_description: string | null
    tags: string[]
    benefits: Array<{ icon: string; label: string; description: string }>
    sku_suggestion: string | null
  }
  option_types: OptionType[]
  variant_preview: Array<{
    label: string
    options: Array<{ option_type: string; option_value: string }>
  }>
  warnings: string[]
  confidence_flags: {
    name_explicit: boolean
    price_explicit: boolean
    colors_explicit: boolean
    sizes_explicit: boolean
    name_inferred: boolean
    price_inferred: boolean
  }
}

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"])
const alphaSizeScale = ["XXXS", "XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "4XL", "5XL"]
const numericSizeScale = ["26", "28", "30", "32", "34", "36", "38", "40", "42", "44", "46", "48", "50"]
const sizeScales = [alphaSizeScale, numericSizeScale]

const colorSwatches: Record<string, { label: string; hex: string | null }> = {
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
  maroon: { label: "Maroon", hex: "#800000" },
}

type StoreBrandOption = {
  label: string
  slug: string
}

const storeBrandOptions: StoreBrandOption[] = [
  { label: "Nike", slug: "nike" },
  { label: "Jordan", slug: "jordan" },
  { label: "Adidas", slug: "adidas" },
  { label: "Puma", slug: "puma" },
  { label: "New Balance", slug: "new-balance" },
  { label: "Converse", slug: "converse" },
  { label: "Vans", slug: "vans" },
  { label: "Reebok", slug: "reebok" },
  { label: "ASICS", slug: "asics" },
  { label: "Skechers", slug: "skechers" },
]

const jsonResponse = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  })

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim()

const toTitleCase = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())

const canonicalOptionTypeName = (value: string) => {
  const key = normalizeWhitespace(value).toLowerCase()
  if (!key) return ""
  if (["color", "colors", "colour", "colours"].includes(key)) return "Color"
  if (["size", "sizes", "sizing"].includes(key)) return "Size"
  return toTitleCase(key)
}

const uniqueCaseInsensitive = (values: string[]) => {
  const seen = new Set<string>()
  const deduped: string[] = []

  for (const value of values) {
    const normalized = normalizeWhitespace(value)
    if (!normalized) continue
    const key = normalized.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(normalized)
  }

  return deduped
}

const BRAND_TAG_PREFIX = "brand:"
const BRAND_TOKEN_SANITIZE_REGEX = /[^a-z0-9\s-]/g
const knownBrandSlugSet = new Set(storeBrandOptions.map((brand) => brand.slug))
const knownBrandLabelToSlug = new Map(storeBrandOptions.map((brand) => [brand.label.toLowerCase(), brand.slug]))
const brandOptionsByLabelLength = [...storeBrandOptions].sort((a, b) => b.label.length - a.label.length)

const toBrandSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(BRAND_TOKEN_SANITIZE_REGEX, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")

const getBrandTag = (brandSlug: string) => {
  const normalizedSlug = toBrandSlug(brandSlug)
  return normalizedSlug ? `${BRAND_TAG_PREFIX}${normalizedSlug}` : ""
}

const parseBrandSlugFromTag = (tag: string): string | null => {
  const normalized = tag.trim()
  if (!normalized.toLowerCase().startsWith(BRAND_TAG_PREFIX)) return null
  const slug = toBrandSlug(normalized.slice(BRAND_TAG_PREFIX.length))
  return slug || null
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const parseBrandSlugFromLooseValue = (value: string): string | null => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const explicitBrandSlug = parseBrandSlugFromTag(normalized)
  if (explicitBrandSlug) return explicitBrandSlug

  const byLabel = knownBrandLabelToSlug.get(normalized.toLowerCase())
  if (byLabel) return byLabel

  const slug = toBrandSlug(normalized)
  return knownBrandSlugSet.has(slug) ? slug : null
}

const inferBrandSlugFromText = (value: string | null | undefined): string | null => {
  const normalized = normalizeWhitespace(value ?? "").toLowerCase()
  if (!normalized) return null

  for (const brand of brandOptionsByLabelLength) {
    const labelPattern = new RegExp(`(?:^|[^a-z0-9])${escapeRegex(brand.label.toLowerCase())}(?:[^a-z0-9]|$)`, "i")
    const slugPattern = new RegExp(`(?:^|[^a-z0-9])${escapeRegex(brand.slug.toLowerCase())}(?:[^a-z0-9]|$)`, "i")
    if (labelPattern.test(normalized) || slugPattern.test(normalized)) {
      return brand.slug
    }
  }

  return null
}

const getKnownBrandSlugFromTags = (tags: string[] | null | undefined): string | null => {
  if (!Array.isArray(tags)) return null

  for (const tag of tags) {
    if (typeof tag !== "string") continue
    const parsed = parseBrandSlugFromTag(tag)
    if (parsed) return parsed
  }

  for (const tag of tags) {
    if (typeof tag !== "string") continue
    const parsed = parseBrandSlugFromLooseValue(tag)
    if (parsed) return parsed
  }

  return null
}

const setBrandTagInTags = (tags: string[], brandSlug: string | null) => {
  const normalizedBrandSlug = brandSlug ? toBrandSlug(brandSlug) : ""
  const nonBrandTags = uniqueCaseInsensitive(
    tags
      .map((tag) => (typeof tag === "string" ? normalizeWhitespace(tag) : ""))
      .filter((tag) => tag.length > 0 && !tag.toLowerCase().startsWith(BRAND_TAG_PREFIX)),
  )

  if (!normalizedBrandSlug) {
    return nonBrandTags
  }

  return [getBrandTag(normalizedBrandSlug), ...nonBrandTags]
}

const normalizeTagsWithBrand = (tags: string[], fallbackBrandSlug: string | null = null) => {
  const dedupedTags = uniqueCaseInsensitive(tags)
  const selectedBrandSlug = getKnownBrandSlugFromTags(dedupedTags) ?? fallbackBrandSlug
  const withBrandTag = setBrandTagInTags(dedupedTags, selectedBrandSlug)
  if (!selectedBrandSlug) return withBrandTag

  const normalizedBrandTag = getBrandTag(selectedBrandSlug).toLowerCase()
  const selectedBrandLabel = storeBrandOptions.find((brand) => brand.slug === selectedBrandSlug)?.label.toLowerCase() ?? ""

  return withBrandTag.filter((tag) => {
    if (tag.toLowerCase() === normalizedBrandTag) return true
    const normalizedTag = normalizeWhitespace(tag).toLowerCase()
    if (normalizedTag === selectedBrandLabel) return false
    return toBrandSlug(normalizedTag) !== selectedBrandSlug
  })
}

const normalizeColorOptionValue = (value: string, colorHex?: string | null): OptionValue => {
  const normalized = normalizeWhitespace(value)
  const mapped = colorSwatches[normalized.toLowerCase()]
  return {
    value: mapped?.label ?? toTitleCase(normalized),
    color_hex: colorHex ?? mapped?.hex ?? null,
  }
}

const parsePriceValue = (raw: string): number | null => {
  const value = raw.trim().toLowerCase()
  if (!value) return null

  const withPrefix = value.match(/(?:ghs?|ghc|gh|cedi(?:s)?)\s*(\d+(?:\.\d{1,2})?)/i)
  if (withPrefix?.[1]) {
    const parsed = Number(withPrefix[1])
    return Number.isFinite(parsed) ? parsed : null
  }

  const withSuffix = value.match(/(\d+(?:\.\d{1,2})?)\s*(?:ghs?|ghc|gh|cedi(?:s)?)\b/i)
  if (withSuffix?.[1]) {
    const parsed = Number(withSuffix[1])
    return Number.isFinite(parsed) ? parsed : null
  }

  if (/^\d+(?:\.\d{1,2})?$/.test(value)) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const parseStockQuantity = (rawValue: string): number | null => {
  const match = rawValue.match(/\b(\d{1,6})\b/)
  if (!match?.[1]) return null
  const parsed = Number(match[1])
  if (!Number.isFinite(parsed)) return null
  return Math.max(0, Math.trunc(parsed))
}

const parseStockDirective = (rawValue: string): { quantity: number | null; forAllVariants: boolean } | null => {
  const normalized = normalizeWhitespace(rawValue).toLowerCase()
  if (!normalized) return null

  const mentionsStock = /\bstock(?:s)?\b|\binventory\b/.test(normalized)
  const mentionsAllVariants =
    /\b(all|each|every)\s+variants?\b/.test(normalized) ||
    /\bfor\s+variants?\b/.test(normalized) ||
    /\bper\s+variants?\b/.test(normalized) ||
    /\bfor\s+all\s+variants?\b/.test(normalized) ||
    /\bfor\s+each\s+variant\b/.test(normalized) ||
    /\bfor\s*$/.test(normalized)

  if (!mentionsStock && !mentionsAllVariants) return null

  const quantity = parseStockQuantity(normalized)
  if (quantity === null) return null

  return {
    quantity,
    forAllVariants: mentionsAllVariants,
  }
}

const splitListValues = (value: string): string[] =>
  value
    .split(/[,\n;/|]+/g)
    .flatMap((entry) => entry.split(/\band\b/gi))
    .map((entry) => normalizeWhitespace(entry))
    .filter(Boolean)

const normalizeSizeToken = (value: string) => value.trim().toUpperCase().replace(/\s+/g, "")

const looksLikeSizeToken = (token: string) => {
  const normalized = normalizeSizeToken(token)
  if (!normalized) return false
  if (/^\d{2}$/.test(normalized)) return true
  return /^(\d{1,2}[A-Z]{1,2}|[A-Z]{1,4})$/.test(normalized)
}

const expandStrictRange = (token: string): { values: string[]; warning: string | null } => {
  const match = token.match(/^([A-Za-z0-9+]+)\s*-\s*([A-Za-z0-9+]+)$/)
  if (!match) {
    return { values: [normalizeSizeToken(token)], warning: null }
  }

  const start = normalizeSizeToken(match[1] ?? "")
  const end = normalizeSizeToken(match[2] ?? "")

  for (const scale of sizeScales) {
    const startIndex = scale.indexOf(start)
    const endIndex = scale.indexOf(end)
    if (startIndex < 0 || endIndex < 0) continue
    if (startIndex > endIndex) {
      return {
        values: [`${start}-${end}`],
        warning: `Could not expand size range "${start}-${end}" because the order is reversed.`,
      }
    }
    return {
      values: scale.slice(startIndex, endIndex + 1),
      warning: null,
    }
  }

  return {
    values: [`${start}-${end}`],
    warning: `Could not expand non-standard size range "${start}-${end}".`,
  }
}

const parseSizeValues = (value: string, fromSizeField = false): { values: string[]; warnings: string[] } => {
  const normalizedInput = normalizeWhitespace(value)
  const rawTokens = splitListValues(normalizedInput)
  const tokens = rawTokens.length > 0 ? rawTokens : [normalizedInput]
  const values: string[] = []
  const warnings: string[] = []

  const sentenceRangeMatches = Array.from(
    normalizedInput.matchAll(/(?:from\s+)?([A-Za-z0-9+]{1,8})\s*(?:-|to)\s*([A-Za-z0-9+]{1,8})/gi),
  )

  for (const rangeMatch of sentenceRangeMatches) {
    const start = rangeMatch[1] ?? ""
    const end = rangeMatch[2] ?? ""
    const expanded = expandStrictRange(`${start}-${end}`)
    values.push(...expanded.values)
    if (expanded.warning) warnings.push(expanded.warning)
  }

  for (const token of tokens) {
    if (!token) continue
    if (token.includes("-") || /\bto\b/i.test(token)) {
      const inTokenRange = token.match(/([A-Za-z0-9+]{1,8})\s*(?:-|to)\s*([A-Za-z0-9+]{1,8})/i)
      if (!inTokenRange) {
        continue
      }

      const expanded = expandStrictRange(`${inTokenRange[1]}-${inTokenRange[2]}`)
      values.push(...expanded.values)
      if (expanded.warning) warnings.push(expanded.warning)
      continue
    }

    const cleanedToken = token
      .replace(/\b(from|size|sizes|between|range)\b/gi, " ")
      .replace(/[():]/g, " ")
    const normalized = normalizeSizeToken(cleanedToken)
    if (!normalized) continue
    if (fromSizeField || looksLikeSizeToken(normalized)) {
      values.push(normalized)
    }
  }

  return {
    values: uniqueCaseInsensitive(values).map((entry) => entry.toUpperCase()),
    warnings: uniqueCaseInsensitive(warnings),
  }
}

const extractColors = (value: string): OptionValue[] => {
  const normalized = normalizeWhitespace(value.toLowerCase())
  if (!normalized) return []

  const splitValues = splitListValues(value)
  const candidates =
    splitValues.length > 1
      ? splitValues
      : normalized.split(/\s+/g).length <= 6
        ? normalized.split(/\s+/g)
        : splitValues

  const colors: OptionValue[] = []
  for (const candidate of candidates) {
    const mapped = colorSwatches[candidate.toLowerCase()]
    if (!mapped) continue
    colors.push({
      value: mapped.label,
      color_hex: mapped.hex,
    })
  }

  return colors
}

const dedupeOptionValues = (values: OptionValue[]) => {
  const seen = new Set<string>()
  const deduped: OptionValue[] = []

  for (const value of values) {
    const normalized = normalizeWhitespace(value.value)
    if (!normalized) continue
    const key = normalized.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push({
      value: normalized,
      color_hex: value.color_hex ?? null,
    })
  }

  return deduped
}

const mergeOptionTypes = (
  deterministicOptionTypes: OptionType[],
  enrichmentOptionTypes: EnrichmentResponse["option_types"],
) => {
  const mergedByName = new Map<string, OptionType>()

  const appendValue = (optionTypeName: string, optionValue: OptionValue) => {
    const canonicalName = canonicalOptionTypeName(optionTypeName)
    if (!canonicalName) return

    const existing = mergedByName.get(canonicalName) ?? {
      name: canonicalName,
      values: [],
    }

    const valueKey = normalizeWhitespace(optionValue.value).toLowerCase()
    if (!valueKey) return

    const hasExisting = existing.values.some((entry) => normalizeWhitespace(entry.value).toLowerCase() === valueKey)
    if (!hasExisting) {
      existing.values.push(optionValue)
    }

    mergedByName.set(canonicalName, existing)
  }

  for (const optionType of deterministicOptionTypes) {
    const canonicalName = canonicalOptionTypeName(optionType.name)
    if (!canonicalName) continue
    for (const optionValue of optionType.values) {
      const normalizedValue =
        canonicalName === "Color"
          ? normalizeColorOptionValue(optionValue.value, optionValue.color_hex)
          : {
              value: normalizeWhitespace(optionValue.value).toUpperCase(),
              color_hex: optionValue.color_hex ?? null,
            }
      appendValue(canonicalName, normalizedValue)
    }
  }

  if (Array.isArray(enrichmentOptionTypes)) {
    for (const optionType of enrichmentOptionTypes) {
      if (!optionType || typeof optionType !== "object") continue
      const canonicalName = canonicalOptionTypeName(typeof optionType.name === "string" ? optionType.name : "")
      if (!canonicalName) continue

      const rawValues = Array.isArray(optionType.values) ? optionType.values : []
      for (const rawValue of rawValues) {
        if (typeof rawValue === "string") {
          const normalizedString = normalizeWhitespace(rawValue)
          if (!normalizedString) continue

          if (canonicalName === "Size") {
            const parsedSizes = parseSizeValues(normalizedString, true)
            for (const sizeValue of parsedSizes.values) {
              appendValue("Size", { value: sizeValue, color_hex: null })
            }
            continue
          }

          if (canonicalName === "Color") {
            appendValue("Color", normalizeColorOptionValue(normalizedString, null))
            continue
          }

          appendValue(canonicalName, { value: toTitleCase(normalizedString), color_hex: null })
          continue
        }

        if (!rawValue || typeof rawValue !== "object") continue

        const value = normalizeWhitespace(typeof rawValue.value === "string" ? rawValue.value : "")
        const colorHex = typeof rawValue.color_hex === "string" ? rawValue.color_hex : null
        if (!value) continue

        if (canonicalName === "Size") {
          const parsedSizes = parseSizeValues(value, true)
          for (const sizeValue of parsedSizes.values) {
            appendValue("Size", { value: sizeValue, color_hex: null })
          }
          continue
        }

        if (canonicalName === "Color") {
          appendValue("Color", normalizeColorOptionValue(value, colorHex))
          continue
        }

        appendValue(canonicalName, { value: toTitleCase(value), color_hex: colorHex })
      }
    }
  }

  return Array.from(mergedByName.values()).filter((optionType) => optionType.values.length > 0)
}

const buildVariantPreview = (optionTypes: OptionType[]) => {
  const activeTypes = optionTypes.filter((entry) => entry.name && entry.values.length > 0)
  if (activeTypes.length === 0) return []

  const valueArrays = activeTypes.map((optionType) =>
    optionType.values.map((value) => ({
      option_type: optionType.name,
      option_value: value.value,
    })),
  )

  const combinations = valueArrays.reduce<Array<Array<{ option_type: string; option_value: string }>>>(
    (accumulator, entries) => accumulator.flatMap((combo) => entries.map((entry) => [...combo, entry])),
    [[]],
  )

  return combinations.map((combo, index) => ({
    label: combo.map((entry) => entry.option_value).join(" / ") || `Variant ${index + 1}`,
    options: combo,
  }))
}

const normalizeKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const normalizeTextValue = (value: string) => normalizeWhitespace(value.trim().replace(/^\[+/, "").replace(/\]+$/, ""))

const deterministicExtract = (rawInput: string): DeterministicResult => {
  const lines = rawInput
    .split(/\r?\n/g)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)

  let name: string | null = null
  let price: number | null = null
  let stockQuantity: number | null = null
  let stockPerVariant: number | null = null
  let shortDescription: string | null = null
  let fullDescription: string | null = null
  let metaTitle: string | null = null
  let metaDescription: string | null = null
  let skuSuggestion: string | null = null

  const warnings: string[] = []
  const tags: string[] = []
  const colors: OptionValue[] = []
  const sizes: string[] = []

  let nameExplicit = false
  let priceExplicit = false
  let colorsExplicit = false
  let sizesExplicit = false

  for (const line of lines) {
    const keyValue = line.match(/^([^:=]+)\s*[:=]\s*(.+)$/)

    if (keyValue) {
      const key = normalizeKey(keyValue[1] ?? "")
      const value = normalizeTextValue(keyValue[2] ?? "")
      if (!value) continue

      if (key.includes("name") || key.includes("title")) {
        name = value
        nameExplicit = true
        continue
      }

      if (key.includes("price") || key.includes("amount") || key.includes("cost")) {
        const parsedPrice = parsePriceValue(value)
        if (parsedPrice !== null) {
          price = parsedPrice
          priceExplicit = true
        }
        continue
      }

      if (key.includes("stock") || key.includes("inventory")) {
        const parsedStock = parseStockDirective(value)
        if (parsedStock && parsedStock.quantity !== null) {
          if (parsedStock.forAllVariants) {
            stockPerVariant = parsedStock.quantity
          } else {
            stockQuantity = parsedStock.quantity
          }
        } else {
          const fallbackStock = parseStockQuantity(value)
          if (fallbackStock !== null) {
            stockQuantity = fallbackStock
          }
        }
        continue
      }

      if (key.includes("color")) {
        const parsedColors = extractColors(value)
        colors.push(...parsedColors)
        colorsExplicit = colorsExplicit || parsedColors.length > 0
        continue
      }

      if (key.includes("size")) {
        const parsedSizes = parseSizeValues(value, true)
        sizes.push(...parsedSizes.values)
        warnings.push(...parsedSizes.warnings)
        sizesExplicit = sizesExplicit || parsedSizes.values.length > 0
        continue
      }

      if (key.includes("short") && key.includes("description")) {
        shortDescription = value
        continue
      }

      if (key.includes("description")) {
        fullDescription = value
        continue
      }

      if (key.includes("meta") && key.includes("title")) {
        metaTitle = value
        continue
      }

      if (key.includes("meta") && key.includes("description")) {
        metaDescription = value
        continue
      }

      if (key.includes("tag")) {
        tags.push(...splitListValues(value))
        continue
      }

      if (key.includes("brand")) {
        const explicitBrandSlug = parseBrandSlugFromLooseValue(value)
        if (explicitBrandSlug) {
          tags.push(getBrandTag(explicitBrandSlug))
        }
        continue
      }

      if (key.includes("sku")) {
        skuSuggestion = value.toUpperCase()
        continue
      }

      continue
    }

    if (!priceExplicit) {
      const parsed = parsePriceValue(line)
      if (parsed !== null) {
        price = parsed
        priceExplicit = true
        continue
      }
    }

    const parsedLineStock = parseStockDirective(line)
    if (parsedLineStock && parsedLineStock.quantity !== null) {
      if (parsedLineStock.forAllVariants) {
        stockPerVariant = parsedLineStock.quantity
      } else {
        stockQuantity = parsedLineStock.quantity
      }
      continue
    }

    const lineColors = extractColors(line)
    if (lineColors.length > 0) {
      colors.push(...lineColors)
      colorsExplicit = true
      continue
    }

    const lineSizes = parseSizeValues(line, false)
    if (lineSizes.values.length > 0) {
      sizes.push(...lineSizes.values)
      warnings.push(...lineSizes.warnings)
      sizesExplicit = true
      continue
    }
  }

  const optionTypes: OptionType[] = []
  const dedupedColors = dedupeOptionValues(colors)
  const dedupedSizes = uniqueCaseInsensitive(sizes).map((entry) => entry.toUpperCase())

  if (dedupedColors.length > 0) {
    optionTypes.push({
      name: "Color",
      values: dedupedColors,
    })
  }

  if (dedupedSizes.length > 0) {
    optionTypes.push({
      name: "Size",
      values: dedupedSizes.map((entry) => ({
        value: entry,
        color_hex: null,
      })),
    })
  }

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
    variant_preview: buildVariantPreview(optionTypes),
    warnings: uniqueCaseInsensitive(warnings),
    confidence_flags: {
      name_explicit: nameExplicit,
      price_explicit: priceExplicit,
      colors_explicit: colorsExplicit,
      sizes_explicit: sizesExplicit,
      name_inferred: false,
      price_inferred: false,
    },
  }
}

const parseStreamChunks = (rawText: string): GeminiChunk[] => {
  try {
    const parsed = JSON.parse(rawText) as unknown
    if (Array.isArray(parsed)) return parsed as GeminiChunk[]
    if (parsed && typeof parsed === "object") return [parsed as GeminiChunk]
  } catch {
    const lineChunks: GeminiChunk[] = []
    const lines = rawText
      .split("\n")
      .map((line) => line.trim())
      .map((line) => (line.startsWith("data:") ? line.slice(5).trim() : line))
      .filter((line) => Boolean(line) && line !== "[DONE]")

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as unknown
        if (parsed && typeof parsed === "object") {
          lineChunks.push(parsed as GeminiChunk)
        }
      } catch {
        // Ignore non-JSON lines in stream format.
      }
    }

    if (lineChunks.length > 0) {
      return lineChunks
    }
  }

  throw new Error("Unsupported Gemini stream format")
}

const mergeDeterministicWithEnrichment = (deterministic: DeterministicResult, enrichment: EnrichmentResponse | null): DeterministicResult => {
  const source = enrichment ?? {}
  const explicitName = deterministic.core_fields.name ? normalizeWhitespace(deterministic.core_fields.name) : ""
  const inferredName = typeof source.name === "string" ? normalizeWhitespace(source.name) : ""
  const explicitPrice = deterministic.core_fields.price
  const inferredPrice = typeof source.price === "number" && Number.isFinite(source.price) ? source.price : null
  const explicitStockQuantity =
    typeof deterministic.core_fields.stock_quantity === "number" && Number.isFinite(deterministic.core_fields.stock_quantity)
      ? Math.max(0, Math.trunc(deterministic.core_fields.stock_quantity))
      : null
  const inferredStockQuantity =
    typeof source.stock_quantity === "number" && Number.isFinite(source.stock_quantity)
      ? Math.max(0, Math.trunc(source.stock_quantity))
      : null
  const explicitStockPerVariant =
    typeof deterministic.core_fields.stock_per_variant === "number" && Number.isFinite(deterministic.core_fields.stock_per_variant)
      ? Math.max(0, Math.trunc(deterministic.core_fields.stock_per_variant))
      : null
  const inferredStockPerVariant =
    typeof source.stock_per_variant === "number" && Number.isFinite(source.stock_per_variant)
      ? Math.max(0, Math.trunc(source.stock_per_variant))
      : null
  const mergedOptionTypes = mergeOptionTypes(deterministic.option_types ?? [], source.option_types)
  const mergedVariantPreview = buildVariantPreview(mergedOptionTypes)

  const warnings = [...deterministic.warnings]
  const hadDeterministicOptions = (deterministic.option_types ?? []).some((optionType) => optionType.values.length > 0)
  const hasMergedOptions = mergedOptionTypes.some((optionType) => optionType.values.length > 0)
  const nameImproved =
    Boolean(explicitName) &&
    Boolean(inferredName) &&
    explicitName.toLowerCase() !== inferredName.toLowerCase()
  const nameInferred = !deterministic.confidence_flags.name_explicit && Boolean(inferredName)
  const priceInferred = !deterministic.confidence_flags.price_explicit && inferredPrice !== null
  const stockInferred = explicitStockQuantity === null && explicitStockPerVariant === null
    && (inferredStockQuantity !== null || inferredStockPerVariant !== null)

  if (nameImproved) {
    warnings.push("Product name was improved by AI for SEO and slug quality.")
  }

  if (nameInferred) {
    warnings.push("Product name was inferred by AI from the prompt.")
  }

  if (priceInferred) {
    warnings.push("Price was inferred by AI because no explicit price was detected.")
  }

  if (stockInferred) {
    warnings.push("Stock values were inferred by AI because no explicit stock directive was detected.")
  }

  if (!hadDeterministicOptions && hasMergedOptions) {
    warnings.push("Variant options were inferred from conversational input and/or product images.")
  }

  const mergedBenefits = Array.isArray(source.benefits)
    ? source.benefits
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null
        const label = normalizeWhitespace(typeof entry.label === "string" ? entry.label : "")
        const description = normalizeWhitespace(typeof entry.description === "string" ? entry.description : "")
        if (!label && !description) return null
        return {
          icon: normalizeWhitespace(typeof entry.icon === "string" ? entry.icon : "star") || "star",
          label: label || description,
          description,
        }
      })
      .filter((entry): entry is { icon: string; label: string; description: string } => Boolean(entry))
      .slice(0, 6)
    : []

  const mergedTagsRaw = uniqueCaseInsensitive([
    ...deterministic.core_fields.tags,
    ...(Array.isArray(source.tags) ? source.tags : []),
  ])
  const inferredBrandSlug = inferBrandSlugFromText(
    [explicitName, inferredName, ...mergedTagsRaw].filter(Boolean).join(" "),
  )
  const mergedTags = normalizeTagsWithBrand(mergedTagsRaw, inferredBrandSlug)

  return {
    ...deterministic,
    option_types: mergedOptionTypes,
    variant_preview: mergedVariantPreview,
    core_fields: {
      name: inferredName || explicitName || null,
      price: explicitPrice ?? inferredPrice ?? null,
      stock_quantity: explicitStockQuantity ?? inferredStockQuantity ?? null,
      stock_per_variant: explicitStockPerVariant ?? inferredStockPerVariant ?? null,
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
      benefits: mergedBenefits,
      sku_suggestion:
        deterministic.core_fields.sku_suggestion ||
        (typeof source.sku_suggestion === "string" ? normalizeWhitespace(source.sku_suggestion).toUpperCase() : null) ||
        null,
    },
    warnings: uniqueCaseInsensitive(warnings),
    confidence_flags: {
      ...deterministic.confidence_flags,
      name_inferred: nameInferred,
      price_inferred: priceInferred,
    },
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
  }

  if (req.method !== "POST") {
    return jsonResponse(405, {
      success: false,
      message: "Method not allowed",
    })
  }

  try {
    const body = (await req.json()) as RequestBody
    const rawInput = typeof body.raw_input === "string" ? body.raw_input.trim() : ""
    const category = typeof body.category === "string" ? body.category.trim() : ""
    const inputImages = Array.isArray(body.images) ? body.images : []

    if (!rawInput) {
      return jsonResponse(400, {
        success: false,
        message: "raw_input is required.",
      })
    }

    for (const image of inputImages) {
      if (image?.mimeType && !allowedMimeTypes.has(image.mimeType)) {
        return jsonResponse(400, {
          success: false,
          message: "Unsupported image format. Use JPEG, PNG or WebP.",
        })
      }
    }

    const deterministic = deterministicExtract(rawInput)

    if (!GEMINI_API_KEY) {
      return jsonResponse(200, {
        success: true,
        data: {
          ...deterministic,
          warnings: uniqueCaseInsensitive([
            ...deterministic.warnings,
            "AI enrichment unavailable because GEMINI_API_KEY is not configured.",
          ]),
        },
      })
    }

    const aiImages = inputImages
      .filter((image) =>
        typeof image?.data === "string" &&
        image.data.trim() &&
        typeof image?.mimeType === "string" &&
        image.mimeType.trim(),
      )
      .slice(0, 4)

    const brandTagGuidance = storeBrandOptions
      .map((brand) => `${brand.label}=brand:${brand.slug}`)
      .join(", ")

    const parts: Array<Record<string, unknown>> = [
      {
        text: `You help an e-commerce admin create a product draft.
Use deterministic extraction as the highest-priority source for explicit fields.
If deterministic name is clear, keep the same product identity and only make minor clarity/SEO improvements.
Do not override deterministic price if explicitly set.
Interpret conversational phrasing naturally. Examples:
- "From S-L" should become size values S, M, L.
- "Yellow and wine" should become color options Yellow and Wine.
- "stock is 5 for all variants" should set stock_per_variant to 5.
- "stock is 12" should set stock_quantity to 12.
- If the admin asks to use colors from the uploaded images, infer Color options from the images and create variants.
When useful, infer option_types from text + images even when no strict format is used.
Brand tag rules (strict):
- A brand tag is optional. Do not force one.
- Only include a brand tag when the brand is explicitly named in text or clearly visible as logo/text in the image.
- If uncertain, return no brand tag.
- If included, return exactly one tag in format brand:slug using this mapping:
${brandTagGuidance}
- Do not invent unknown slugs.
- Do not return plain brand names as tags.

Return one valid JSON object only (no markdown, no prose).

Raw input:
${rawInput}

Category:
${category || "Not provided"}

Deterministic extraction:
${JSON.stringify(deterministic, null, 2)}

Return JSON with keys (always include all keys; use null or [] when unknown):
- name (string | null)
- price (number | null)
- stock_quantity (number | null)
- stock_per_variant (number | null)
- short_description (string)
- full_description (string)
- meta_title (string)
- meta_description (string)
- tags (string[])
- benefits (array of {icon,label,description})
- sku_suggestion (string | null)
- option_types (array of {name, values}, where values can be strings or {value,color_hex})`,
      },
    ]

    for (const image of aiImages) {
      parts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data,
        },
      })
    }

    const geminiRequest = {
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
        topP: 0.95,
        responseMimeType: "application/json",
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "OFF",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "OFF",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "OFF",
        },
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "OFF",
        },
      ],
    }

    const geminiResponse = await fetch(
      `https://${API_ENDPOINT}/v1/publishers/google/models/${MODEL_ID}:${GENERATE_CONTENT_API}?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(geminiRequest),
      },
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error("Gemini API error:", errorText)

      return jsonResponse(200, {
        success: true,
        data: {
          ...deterministic,
          warnings: uniqueCaseInsensitive([
            ...deterministic.warnings,
            "AI enrichment was skipped because the AI provider returned an error.",
          ]),
        },
      })
    }

    const reader = geminiResponse.body?.getReader()
    if (!reader) {
      throw new Error("No response body from AI provider")
    }

    const decoder = new TextDecoder()
    let rawText = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      rawText += decoder.decode(value, { stream: true })
    }
    rawText += decoder.decode()

    const chunks = parseStreamChunks(rawText)
    let generatedText = ""
    for (const chunk of chunks) {
      const text = chunk?.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) generatedText += text
    }

    let parsedEnrichment: EnrichmentResponse | null = null
    try {
      parsedEnrichment = JSON.parse(generatedText) as EnrichmentResponse
    } catch {
      parsedEnrichment = null
    }

    const merged = mergeDeterministicWithEnrichment(deterministic, parsedEnrichment)

    return jsonResponse(200, {
      success: true,
      data: merged,
    })
  } catch (error) {
    console.error("ai_product_draft_extract error:", error)
    return jsonResponse(500, {
      success: false,
      message: "Something went wrong. Please try again.",
    })
  }
})
