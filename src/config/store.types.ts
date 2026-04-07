import type { ThemePresetKey } from "../themes/registry.ts";

export type CurrencyPosition = "before" | "after";
export type PaymentMode = "subaccount" | "own_account";
export type PaystackChargeBearer = "account" | "subaccount";

export type CategoryConfig = {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  enabled: boolean;
};

export type CategoryPageCopy = {
  heroDescription: string;
  editorialQuote: string;
  editorialDescription: string;
};

export type CategoryPageConfig = {
  bySlug: Record<string, Partial<CategoryPageCopy>>;
  defaults: CategoryPageCopy;
  uiText: {
    notFoundTitle: string;
    backToShopLabel: string;
    emptyCategoryMessage: string;
  };
};

export type PaymentsConfig = {
  mode: PaymentMode;
  storeId: string;
  paystack: {
    publicKey: string;
    subaccount: {
      code: string;
      platformFeePercent: number;
      bearer: PaystackChargeBearer;
    };
    secretKeyRef: string;
  };
};

export interface StoreConfig {
  storeName: string;
  storeTagline: string;
  logoUrl: string;
  faviconUrl: string;
  defaultThemePreset: ThemePresetKey;
  contact: {
    email: string;
    phone: string;
    whatsapp: string;
    address: string;
    city: string;
    country: string;
  };
  socials: {
    instagram: string;
    facebook: string;
    twitter: string;
    tiktok: string;
  };
  currency: {
    code: string;
    symbol: string;
    position: CurrencyPosition;
  };
  features: {
    tryOn: boolean;
    guestCheckout: boolean;
    discountCodes: boolean;
    orderTracking: boolean;
    reviews: boolean;
    wishlist: boolean;
  };
  categories: CategoryConfig[];
  categoryPage: CategoryPageConfig;
  payments: PaymentsConfig;
  styleSyncs: {
    apiKey: string | undefined;
    apiUrl: string | undefined;
  };
}

export type BrandingConfig = Pick<
  StoreConfig,
  "storeName" | "storeTagline" | "logoUrl" | "faviconUrl" | "defaultThemePreset" | "contact" | "socials" | "currency"
>;

export type CatalogConfig = Pick<StoreConfig, "categories" | "categoryPage">;
export type CommerceConfig = Pick<StoreConfig, "features" | "payments">;
export type IntegrationsConfig = Pick<StoreConfig, "styleSyncs">;
