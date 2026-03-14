import { useMemo, useState } from "react";
import { productImages } from "@/data/images";
import { products, type Category, type Product } from "@/data/products";
import ShopProductCard from "@/components/ShopProductCard";

type ShopFilter = "all" | Category;

const categoryOrder: Category[] = ["hair-care", "mens-fashion", "womens-fashion", "bags", "shoes"];

const filterItems: Array<{ label: string; value: ShopFilter }> = [
  { label: "All", value: "all" },
  { label: "Hair Care", value: "hair-care" },
  { label: "Men", value: "mens-fashion" },
  { label: "Women", value: "womens-fashion" },
  { label: "Bags", value: "bags" },
  { label: "Shoes", value: "shoes" },
];

const categoryNames: Record<Category, string> = {
  "hair-care": "Hair Care",
  "mens-fashion": "Men's Fashion",
  "womens-fashion": "Women's Fashion",
  "bags": "Bags",
  "shoes": "Shoes",
};

const editorialHeadlines: Record<Category, string> = {
  "hair-care": "Rituals for your most luxurious self.",
  "mens-fashion": "Dressed with intention. Built to last.",
  "womens-fashion": "Effortless elegance, every day.",
  "bags": "Carry something worth noticing.",
  "shoes": "Every step, considered.",
};

const bannerImageByCategory: Record<Category, string> = {
  "hair-care": productImages["hc-001"],
  "mens-fashion": productImages["mf-001"],
  "womens-fashion": productImages["wf-001"],
  "bags": productImages["bg-001"],
  "shoes": productImages["sh-001"],
};

const groupedProducts = products.reduce<Record<Category, Product[]>>(
  (acc, product) => {
    acc[product.category].push(product);
    return acc;
  },
  {
    "hair-care": [],
    "mens-fashion": [],
    "womens-fashion": [],
    "bags": [],
    "shoes": [],
  },
);

const renderProductRows = (items: Product[]) => {
  if (items.length === 0) {
    return null;
  }

  const standardProducts = items.slice(0, -1);
  const bannerProduct = items[items.length - 1];

  return (
    <>
      {standardProducts.length > 0 ? (
        <div className="grid grid-cols-3 gap-[2px]">
          {standardProducts.map((product) => (
            <ShopProductCard key={product.id} product={product} size="regular" />
          ))}
        </div>
      ) : null}

      <div className={standardProducts.length > 0 ? "mt-[2px]" : ""}>
        <ShopProductCard product={bannerProduct} size="banner" />
      </div>
    </>
  );
};

const Shop = () => {
  const [activeFilter, setActiveFilter] = useState<ShopFilter>("all");

  const categoriesToShow = useMemo(
    () => (activeFilter === "all" ? categoryOrder : [activeFilter]),
    [activeFilter],
  );

  const visibleProductCount = useMemo(
    () => categoriesToShow.reduce((total, category) => total + groupedProducts[category].length, 0),
    [categoriesToShow],
  );

  return (
    <div className="container mx-auto px-4 py-14 md:py-16">
      <div className="text-center mb-8">
        <h1 className="font-display text-[42px] md:text-[52px] font-light italic leading-tight">Our Collection</h1>
      </div>

      <div className="mb-12 border-b border-[#d4ccc2] pb-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2.5">
            {filterItems.map((filter) => {
              const isActive = activeFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setActiveFilter(filter.value)}
                  className={`border px-7 py-[10px] font-body text-[11px] font-light uppercase tracking-[0.1em] transition-colors duration-300 ${
                    isActive
                      ? "border-[#1A1A1A] bg-[#1A1A1A] text-[#F5F0E8]"
                      : "border-[#d4ccc2] text-foreground hover:border-foreground/40"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <p className="font-body text-[12px] font-normal text-[#888888] md:text-right">
            Showing {visibleProductCount} products
          </p>
        </div>
      </div>

      <div>
        {categoriesToShow.map((category, index) => {
          const categoryProducts = groupedProducts[category];
          const showDivider = index > 0;

          return (
            <section key={category} className={showDivider ? "pt-20" : ""}>
              {showDivider ? (
                <div className="mt-0 mb-10 border-t border-[#d4ccc2] pt-8">
                  <p className="font-body text-[10px] font-light uppercase tracking-[0.2em] text-accent">
                    {categoryNames[category]}
                  </p>
                </div>
              ) : (
                <div className="mb-10">
                  <p className="font-body text-[10px] font-light uppercase tracking-[0.2em] text-accent">
                    {categoryNames[category]}
                  </p>
                </div>
              )}

              {showDivider && activeFilter === "all" && (
                <div className="relative left-1/2 right-1/2 my-20 min-h-[60vh] w-screen -translate-x-1/2 overflow-hidden">
                  <img
                    src={bannerImageByCategory[category]}
                    alt={categoryNames[category]}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-[rgba(0,0,0,0.4)]" />

                  <div className="relative z-10 flex min-h-[60vh] items-center">
                    <div className="max-w-[600px] px-6 md:px-0 md:pl-[80px]">
                      <p className="mb-4 font-body text-[11px] font-light uppercase tracking-[0.2em] text-accent">
                        {categoryNames[category]}
                      </p>
                      <h2 className="font-display text-[38px] md:text-[52px] font-light italic leading-[1.2] text-white">
                        {editorialHeadlines[category]}
                      </h2>
                    </div>
                  </div>
                </div>
              )}

              <div>{renderProductRows(categoryProducts)}</div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default Shop;
