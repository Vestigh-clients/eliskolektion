import category_bags from "@/assets/category-bags.jpg";
import category_hair_care from "@/assets/category-haircare.jpg";
import category_men from "@/assets/category-mens.jpg";
import category_shoes from "@/assets/category-shoes.jpg";
import category_womens from "@/assets/category-womens.jpg";
import type { CatalogConfig } from "./store.types.ts";

export const catalogConfig: CatalogConfig = {
  categories: [
    {
      name: "Hair Care",
      slug: "hair-care",
      description: "",
      imageUrl: category_hair_care,
      enabled: true,
    },
    {
      name: "Men's Fashion",
      slug: "mens-fashion",
      description: "",
      imageUrl: category_men,
      enabled: true,
    },
    {
      name: "Women's Fashion",
      slug: "womens-fashion",
      description: "",
      imageUrl: category_womens,
      enabled: true,
    },
    {
      name: "Shoes",
      slug: "shoes",
      description: "",
      imageUrl: category_shoes,
      enabled: true,
    },
    {
      name: "Bags",
      slug: "bags",
      description: "",
      imageUrl: category_bags,
      enabled: true,
    },
  ],
  categoryPage: {
    bySlug: {
      "hair-care": {
        heroDescription: "A focused edit of treatments and cleansers for healthy, luminous hair.",
        editorialQuote: "Yours hair deserves a ritual, not a routine.",
        editorialDescription: "Formulas selected for strength, softness, and long-term hair health.\nLuxury begins with consistency.",
      },
      "mens-fashion": {
        heroDescription: "Modern essentials for a precise and elevated wardrobe.",
        editorialQuote: "Built for the man who notices the details.",
        editorialDescription: "Tailored essentials shaped by clean lines and durable construction.\nA focused wardrobe for everyday confidence.",
      },
      "womens-fashion": {
        heroDescription: "Intentional pieces created for everyday elegance.",
        editorialQuote: "Worn with intention. Made to last.",
        editorialDescription: "Refined silhouettes designed to move between day and evening.\nQuiet confidence in every detail.",
      },
      bags: {
        heroDescription: "Distinctive bags designed for utility and style in equal measure.",
        editorialQuote: "The right bag changes everything.",
        editorialDescription: "Structured and soft forms curated for function and statement.\nCarry pieces that complete the look.",
      },
      shoes: {
        heroDescription: "Curated footwear designed for comfort, balance, and impact.",
        editorialQuote: "Stand in something worth remembering.",
        editorialDescription: "Footwear built for comfort, finish, and timeless wear.\nEvery step grounded in quality.",
      },
    },
    defaults: {
      heroDescription: "Explore this curated category from our latest collection.",
      editorialQuote: "Crafted with intention for your wardrobe.",
      editorialDescription: "Discover quality pieces designed for comfort, style, and lasting value.",
    },
    uiText: {
      notFoundTitle: "Category Not Found",
      backToShopLabel: "\u2190 Back to Shop",
      emptyCategoryMessage: "No products available in this category right now.",
    },
  },
};
