import authPanelImage from "@/assets/hero-bg.jpg";

export interface HomeHeroSlideConfig {
  id: string;
  imageUrl: string;
  imageAlt: string;
  label: string;
  heading: string;
  subtext: string;
  cta: {
    text: string;
    href: string;
    tone: "outline" | "primary" | "accent";
  };
}

export interface ContentConfig {
  home: {
    heroSlides: HomeHeroSlideConfig[];
    collectionsEyebrow: string;
    collectionsTitle: string;
    collectionsDescription: string;
    categoryCardCtaLabel: string;
  };
  footer: {
    description: string;
    shopLinks: Array<{ label: string; href: string }>;
    companyLinks: Array<{ label: string; href: string }>;
  };
  auth: {
    panelImageUrl: string;
    panelImageAlt: string;
  };
  about: {
    body: string;
    intro: string;
    stats: Array<{ value: string; label: string }>;
  };
}

export const contentConfig: ContentConfig = {
  home: {
    heroSlides: [
      
    ],
    collectionsEyebrow: "Our Collections",
    collectionsTitle: "Shop by Category",
    collectionsDescription: "Considered categories for wardrobe staples, elevated accessories, and restorative hair care.",
    categoryCardCtaLabel: "Shop Now ->",
  },
  footer: {
    description: "",
    shopLinks: [
 
    ],
    companyLinks: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  auth: {
    panelImageUrl: authPanelImage,
    panelImageAlt: "Brand visual",
  },
  about: {
    body: "",
    intro: "",
    stats: [
      { value: "500+", label: "Happy Customers" },
      { value: "50+", label: "Premium Products" },
      { value: "36", label: "Regions Served" },
    ],
  },
};
