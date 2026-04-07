// ─────────────────────────────────────────────────────────────────────────────
// Hero Slideshow Configuration
//
// Edit this file to control everything shown in the homepage hero banner.
// Images must be placed in /public/assets/ and referenced as "/assets/filename"
//
// Each slide has:
//   image   — path to the background image (from /public folder)
//   label   — small gold text above the heading  (e.g. "Season Drop 2024")
//   heading — two-line bold headline             (displayed on two separate lines)
//   sub     — supporting paragraph text
//   cta     — primary gold button  { label, to }
//   cta2    — secondary white button { label, to }
// ─────────────────────────────────────────────────────────────────────────────

export interface HeroSlide {
  image: string;
  label: string;
  heading: [string, string];
  sub: string;
  cta: { label: string; to: string };
  cta2: { label: string; to: string };
}

export const heroSlides: HeroSlide[] = [
  {
    image: "/assets/homepage-hero1.png",
    label: "Season Drop 2024",
    heading: ["Step Clean,", "Dress Loud"],
    sub: "The definitive curation of rare footwear and elite streetwear for the modern digital collector.",
    cta: { label: "Shop The Selection", to: "/shop" },
    cta2: { label: "New Arrivals", to: "/shop" },
  },
  {
    image: "/assets/homepage-hero.png",
    label: "Exclusive Kolektion",
    heading: ["Own The", "Culture"],
    sub: "Curated pieces that define the intersection of streetwear and luxury. Limited quantities, maximum impact.",
    cta: { label: "Explore Now", to: "/shop" },
    cta2: { label: "View All Drops", to: "/shop" },
  },
  {
    image: "/assets/homepage-hero.jpg",
    label: "Elite Selection",
    heading: ["Rare Finds,", "Bold Moves"],
    sub: "Authentic grails sourced from the world's most coveted brands. Verified, curated, delivered.",
    cta: { label: "Shop Grails", to: "/shop" },
    cta2: { label: "Best Sellers", to: "/shop" },
  },
];
