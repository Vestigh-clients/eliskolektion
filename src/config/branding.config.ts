import type { BrandingConfig } from "./store.types";

export const brandingConfig: BrandingConfig = {
  storeName: "Vestigh Store",
  storeTagline: "Your store tagline",
  logoUrl: "assets/vicky_logo_white.png",
  faviconUrl: "/favicon.ico",
  theme: {
    primaryColor: "#243843", // deep navy-teal used in the services panel
    secondaryColor: "#ffffff", // light grey background
    accentColor: "#4A5D66", // muted steel blue derived from primary
    navbarSolidBackgroundColor: "#243843", // solid navbar background for non-hero pages
    fontHeading: "Playfair Display",
    fontBody: "Inter",
    borderRadius: "lg", // rounded cards seen in the service grid
  },
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
  pages: {
    heroTitle: "Discover Your Style",
    heroSubtitle: "Shop the latest fashion",
    heroImageUrl: "/hero.jpg",
    aboutText: "",
  },
};
