import { storeKeyPrefix } from "@/config/store.config";

const FAVORITES_STORAGE_KEY = `${storeKeyPrefix}_favorites`;
const FAVORITES_UPDATED_EVENT = `${storeKeyPrefix}:favorites_updated`;

const sanitizeFavoriteIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string") {
      continue;
    }

    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }
    unique.add(trimmed);
  }

  return Array.from(unique);
};

const readFavoriteIds = (): string[] => {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return sanitizeFavoriteIds(parsed);
  } catch {
    return [];
  }
};

const writeFavoriteIds = (ids: string[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(FAVORITES_UPDATED_EVENT));
};

export const isProductFavorited = (productId: string): boolean => {
  if (!productId.trim()) {
    return false;
  }
  return readFavoriteIds().includes(productId);
};

export const addProductToFavorites = (productId: string): boolean => {
  const trimmedId = productId.trim();
  if (!trimmedId) {
    return false;
  }

  const ids = readFavoriteIds();
  if (ids.includes(trimmedId)) {
    return false;
  }

  writeFavoriteIds([...ids, trimmedId]);
  return true;
};

export const subscribeToFavoriteChanges = (onChange: () => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key && event.key !== FAVORITES_STORAGE_KEY) {
      return;
    }
    onChange();
  };

  window.addEventListener(FAVORITES_UPDATED_EVENT, onChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(FAVORITES_UPDATED_EVENT, onChange);
    window.removeEventListener("storage", handleStorage);
  };
};
