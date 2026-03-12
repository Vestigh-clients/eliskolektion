import { Link } from "react-router-dom";
import { type Category } from "@/data/products";
import CategoryCard from "@/components/CategoryCard";

const categories: Category[] = ["hair-care", "mens-fashion", "womens-fashion", "bags", "shoes"];

const Index = () => {
  return (
    <div>
      {/* Hero */}
      <section className="relative h-screen overflow-hidden">
        <img src="/assets/hero.png" alt="Luxuriant collection" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[rgba(0,0,0,0.35)]" />
        <div className="relative z-10 h-full flex items-end">
          <div className="p-[80px] max-w-3xl">
            <p className="font-body font-light text-[11px] tracking-[0.2em] uppercase text-accent mb-5">
              Luxury Fashion & Hair Care
            </p>
            <h1 className="font-display text-[80px] font-light tracking-[0.08em] leading-[0.9] text-white mb-5">
              LUXURIANT
            </h1>
            <p className="font-body font-light text-[16px] text-white/75 max-w-xl mb-10">
              A refined curation of timeless clothing and restorative hair essentials.
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center justify-center border border-accent bg-transparent text-accent px-[36px] py-[14px] rounded-[4px] font-body text-[12px] font-light tracking-[0.15em] uppercase transition-colors duration-300 hover:bg-accent hover:text-foreground"
            >
              Explore Collection
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-background py-[100px]">
        <div className="container mx-auto px-4">
          <p className="font-body font-light text-[11px] tracking-[0.2em] uppercase text-accent text-center mb-4">
            Our Collections
          </p>
          <h2 className="font-display text-[42px] font-normal italic text-center text-foreground mb-2">Shop by Category</h2>
          <p className="font-body font-light text-[14px] text-[#888888] text-center mb-[60px] max-w-2xl mx-auto">
          Considered categories for wardrobe staples, elevated accessories, and restorative hair care.
          </p>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-5 gap-8 min-w-[920px]">
              {categories.map((cat) => (
                <CategoryCard key={cat} category={cat} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
