export interface StoreBrandOption {
  label: string;
  slug: string;
}

export const storeBrandOptions: StoreBrandOption[] = [
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
];

const BRAND_TAG_PREFIX = "brand:";

const toBrandSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

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

const toTitleCase = (value: string) =>
  value
    .split(/[-\s]+/g)
    .map((part) => {
      if (!part) return "";
      return part[0].toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");

const brandLabelBySlug = new Map(storeBrandOptions.map((brand) => [brand.slug, brand.label]));

export const getBrandTag = (brandSlug: string) => {
  const normalizedSlug = toBrandSlug(brandSlug);
  return normalizedSlug ? `${BRAND_TAG_PREFIX}${normalizedSlug}` : "";
};

export const parseBrandSlugFromTag = (tag: string): string | null => {
  const normalized = tag.trim();
  if (!normalized.toLowerCase().startsWith(BRAND_TAG_PREFIX)) return null;
  const slug = toBrandSlug(normalized.slice(BRAND_TAG_PREFIX.length));
  return slug || null;
};

export const getBrandSlugFromTags = (tags: string[] | null | undefined): string | null => {
  if (!Array.isArray(tags)) return null;

  for (const tag of tags) {
    if (typeof tag !== "string") continue;
    const parsed = parseBrandSlugFromTag(tag);
    if (parsed) return parsed;
  }

  return null;
};

export const getBrandLabelFromSlug = (brandSlug: string) => {
  const normalized = toBrandSlug(brandSlug);
  if (!normalized) return "";
  return brandLabelBySlug.get(normalized) ?? toTitleCase(normalized);
};

export const setBrandTagInTags = (tags: string[], brandSlug: string | null) => {
  const normalizedBrandSlug = brandSlug ? toBrandSlug(brandSlug) : "";
  const nonBrandTags = uniqueCaseInsensitive(
    tags
      .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
      .filter((tag) => tag.length > 0 && !tag.toLowerCase().startsWith(BRAND_TAG_PREFIX)),
  );

  if (!normalizedBrandSlug) {
    return nonBrandTags;
  }

  return [getBrandTag(normalizedBrandSlug), ...nonBrandTags];
};
