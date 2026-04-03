import type { BrandingConfig } from "./store.types.ts";

export const brandingConfig: BrandingConfig = {
  storeName: "Vestigh Store",
  storeTagline: "Your store tagline",
  logoUrl: "assets/vicky_logo_white.png",
  faviconUrl: "/favicon.ico",
  defaultThemePreset: "atelier",
  contact: {
    email: "hello@store.com",
    phone: "",
    whatsapp: "",
    address: "",
    city: "",
    country: "Ghana",
  },
  socials: {
    instagram: "",
    facebook: "",
    twitter: "",
    tiktok: "",
  },
  currency: {
    code: "GHS",
    symbol: "GH\u20B5",
    position: "before",
  },
};
