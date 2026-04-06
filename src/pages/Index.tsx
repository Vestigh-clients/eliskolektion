import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StorefrontProductCard from "@/components/products/StorefrontProductCard";
import { useStorefrontConfig } from "@/contexts/StorefrontConfigContext";
import { getAllProducts, getTopSellingProductIds } from "@/services/productService";
import { formatPrice } from "@/lib/price";
import { getPrimaryImage } from "@/types/product";
import { type Product } from "@/types/product";

const TRUST_BADGES = [
  {
    icon: "local_shipping",
    title: "Global Express",
    description: "Free shipping on orders over $300",
  },
  {
    icon: "verified_user",
    title: "Authenticity Guaranteed",
    description: "Verified by expert curators",
  },
  {
    icon: "history",
    title: "Easy Returns",
    description: "30-day hassle-free return policy",
  },
];

// Inline best-seller card used in the horizontal carousel
const BestSellerCard = ({ product }: { product: Product }) => {
  const navigate = useNavigate();
  const imageUrl = getPrimaryImage(product);

  return (
    <div
      className="min-w-[260px] group cursor-pointer"
      onClick={() => navigate(`/shop/${product.slug}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") navigate(`/shop/${product.slug}`);
      }}
      aria-label={`Open ${product.name}`}
    >
      <div className="aspect-square bg-white border border-zinc-100 mb-4 p-6 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-auto object-contain transition-transform duration-700 group-hover:rotate-6 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <span className="material-symbols-outlined text-zinc-300 text-5xl">image</span>
        )}
      </div>
      <h4 className="font-manrope font-bold text-sm uppercase tracking-tight text-zinc-900 group-hover:text-[#E8A811] transition-colors">
        {product.name}
      </h4>
      <p className="font-manrope font-black text-sm mt-1">{formatPrice(product.price)}</p>
    </div>
  );
};

const Index = () => {
  const { storefrontConfig, storefrontCategories } = useStorefrontConfig();
  const navigate = useNavigate();
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [newsletterEmail, setNewsletterEmail] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadHomepageProducts = async () => {
      const [allProductsResult, topSellingIdsResult] = await Promise.allSettled([
        getAllProducts(),
        getTopSellingProductIds(4),
      ]);

      if (!isMounted) return;

      const allProducts =
        allProductsResult.status === "fulfilled" && Array.isArray(allProductsResult.value)
          ? allProductsResult.value
          : [];
      const topSellingIds =
        topSellingIdsResult.status === "fulfilled" && Array.isArray(topSellingIdsResult.value)
          ? topSellingIdsResult.value
          : [];

      const productById = new Map(allProducts.map((p) => [p.id, p]));
      const rankedBestSellers = topSellingIds
        .map((id) => productById.get(id))
        .filter((p): p is Product => Boolean(p));

      setNewArrivals(allProducts.slice(0, 4));
      setBestSellers((rankedBestSellers.length > 0 ? rankedBestSellers : allProducts).slice(0, 4));
    };

    void loadHomepageProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  const categoryTiles = useMemo(
    () =>
      storefrontCategories.map((category) => ({
        key: category.id || category.slug,
        title: category.name,
        to: `/shop?category=${encodeURIComponent(category.slug)}`,
        imageUrl: category.imageUrl || "/placeholder.svg",
        imageAlt: `${category.name} collection`,
      })),
    [storefrontCategories],
  );

  const handleNewsletterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = newsletterEmail.trim();
    if (!normalizedEmail) return;
    const supportEmail = storefrontConfig.contact.email.trim();
    if (!supportEmail) {
      navigate("/contact");
      return;
    }
    const subject = encodeURIComponent(`${storefrontConfig.storeName} newsletter signup`);
    const body = encodeURIComponent(`Please add this email to the newsletter list:\n\n${normalizedEmail}`);
    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
    setNewsletterEmail("");
  };

  return (
    <div className="bg-white text-[#1a1c1c] font-inter">
      <main>
        {/* ── Hero ── */}
        <section className="relative h-[700px] flex items-center bg-zinc-900 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src="/assets/homepage-hero1.png"
              alt="Hero Collection"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
          </div>

          <div className="relative z-10 px-8 lg:px-16 w-full max-w-[1440px] mx-auto">
            <div className="max-w-xl">
              <span className="text-[#E8A811] font-manrope font-bold uppercase tracking-[0.4em] text-[10px] mb-6 block">
                Season Drop 2024
              </span>
              <h1 className="font-manrope font-extrabold text-6xl md:text-8xl text-white tracking-tighter leading-[0.9] mb-8 uppercase italic">
                Step Clean,
                <br />
                Dress Loud
              </h1>
              <p className="text-white text-base font-medium mb-10 max-w-sm opacity-90 leading-relaxed font-manrope">
                The definitive curation of rare footwear and elite streetwear for the modern digital collector.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/shop"
                  className="bg-[#E8A811] text-black px-10 py-4 font-manrope font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all shadow-xl"
                >
                  Shop The Selection
                </Link>
                <Link
                  to="/shop"
                  className="bg-white text-black px-10 py-4 font-manrope font-black uppercase tracking-widest text-[10px] hover:bg-zinc-100 transition-all shadow-xl"
                >
                  New Arrivals
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Trust Badges ── */}
        <section className="bg-white py-12 border-b border-zinc-100">
          <div className="max-w-[1440px] mx-auto px-8 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
            {TRUST_BADGES.map((badge) => (
              <div key={badge.title} className="flex items-center gap-5">
                <div className="w-12 h-12 flex items-center justify-center bg-zinc-50 rounded-full shrink-0">
                  <span className="material-symbols-outlined text-black text-2xl">{badge.icon}</span>
                </div>
                <div>
                  <h4 className="font-manrope font-black text-xs uppercase tracking-widest mb-1">
                    {badge.title}
                  </h4>
                  <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider font-manrope">
                    {badge.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Category Tiles ── */}
        {categoryTiles.length > 0 ? (
          <section className="py-24 px-8 max-w-[1440px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {categoryTiles.slice(0, 2).map((tile) => (
                <Link
                  key={tile.key}
                  to={tile.to}
                  className="group relative aspect-[16/9] overflow-hidden bg-zinc-100 block"
                >
                  <img
                    src={tile.imageUrl}
                    alt={tile.imageAlt}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                  <div className="absolute inset-0 flex flex-col justify-center items-center p-8 text-center">
                    <h3 className="font-manrope text-4xl md:text-5xl text-white font-black uppercase italic tracking-tighter mb-4">
                      {tile.title}
                    </h3>
                    <span className="bg-white text-black text-[10px] font-manrope font-black uppercase px-8 py-3 tracking-widest group-hover:bg-[#E8A811] transition-colors shadow-lg">
                      Shop {tile.title}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Additional category tiles (3+) in a 3-col sub-grid */}
            {categoryTiles.length > 2 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mt-8">
                {categoryTiles.slice(2).map((tile) => (
                  <Link
                    key={tile.key}
                    to={tile.to}
                    className="group relative aspect-[16/9] overflow-hidden bg-zinc-100 block"
                  >
                    <img
                      src={tile.imageUrl}
                      alt={tile.imageAlt}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                    <div className="absolute inset-0 flex flex-col justify-center items-center p-6 text-center">
                      <h3 className="font-manrope text-2xl md:text-3xl text-white font-black uppercase italic tracking-tighter mb-3">
                        {tile.title}
                      </h3>
                      <span className="bg-white text-black text-[10px] font-manrope font-black uppercase px-6 py-2 tracking-widest group-hover:bg-[#E8A811] transition-colors shadow-lg">
                        Shop Now
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {/* ── Current Drops / New Arrivals ── */}
        <section className="py-24 px-8 max-w-[1440px] mx-auto border-t border-zinc-100">
          <div className="flex flex-col sm:flex-row justify-between items-end mb-12 gap-4">
            <div className="max-w-md">
              <h2 className="font-manrope text-4xl font-extrabold tracking-tighter uppercase italic">
                Current Drops
              </h2>
              <p className="text-zinc-500 mt-2 text-sm uppercase tracking-wider font-medium font-manrope">
                New arrivals from our curated brands, updated weekly.
              </p>
            </div>
            <Link
              to="/shop"
              className="font-manrope font-black text-[10px] uppercase tracking-widest border-b-2 border-black pb-1 hover:text-[#E8A811] hover:border-[#E8A811] transition-all whitespace-nowrap"
            >
              Explore Full Katalog
            </Link>
          </div>

          {newArrivals.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
              {newArrivals.map((product, index) => (
                <StorefrontProductCard
                  key={product.id}
                  product={product}
                  badgeLabel={index === 0 ? "Premium" : index === 1 ? "New Arrival" : undefined}
                  badgeVariant={index === 1 ? "gold" : "dark"}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="font-manrope text-sm text-zinc-400 uppercase tracking-widest">
                No new arrivals available yet.
              </p>
            </div>
          )}
        </section>

        {/* ── Best Sellers ── */}
        <section className="py-24 bg-zinc-50 border-y border-zinc-100">
          <div className="max-w-[1440px] mx-auto px-8">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="font-manrope text-4xl font-extrabold tracking-tighter uppercase italic">
                  Best Sellers
                </h2>
                <p className="text-zinc-500 mt-2 text-sm uppercase tracking-wider font-medium font-manrope">
                  Most coveted pieces in the kolektion.
                </p>
              </div>
              <Link
                to="/shop"
                className="font-manrope font-black text-[10px] uppercase tracking-widest border-b-2 border-black pb-1 hover:text-[#E8A811] hover:border-[#E8A811] transition-all whitespace-nowrap"
              >
                Shop Best Sellers
              </Link>
            </div>

            {bestSellers.length > 0 ? (
              <div className="flex gap-6 overflow-x-auto pb-6 hide-scrollbar">
                {bestSellers.map((product) => (
                  <BestSellerCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="font-manrope text-sm text-zinc-400 uppercase tracking-widest">
                  No best sellers available yet.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ── Curator's Choice / Trending ── */}
        {newArrivals.length >= 4 ? (
          <section className="py-24 px-8 max-w-[1440px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Left: Editorial Image */}
              <div className="relative group">
                <div className="aspect-[4/5] overflow-hidden bg-zinc-100">
                  {getPrimaryImage(newArrivals[0]) ? (
                    <img
                      src={getPrimaryImage(newArrivals[0])!}
                      alt="Featured look"
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-100" />
                  )}
                </div>
                {/* Floating card */}
                <div className="absolute -bottom-6 -right-4 md:-bottom-8 md:-right-8 w-56 md:w-64 p-5 md:p-6 bg-white shadow-2xl border border-zinc-100 hidden sm:block">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#E8A811] mb-2 font-manrope">
                    Look of the Week
                  </p>
                  <h4 className="font-manrope font-bold text-sm uppercase italic mb-4 leading-tight">
                    {newArrivals[0].name}
                  </h4>
                  <Link
                    to={`/shop/${newArrivals[0].slug}`}
                    className="text-[10px] font-black uppercase tracking-widest border-b border-black pb-1 hover:text-[#E8A811] hover:border-[#E8A811] transition-all font-manrope"
                  >
                    Shop the Look
                  </Link>
                </div>
              </div>

              {/* Right: Content + product mini-grid */}
              <div className="space-y-10 lg:pl-8">
                <div className="max-w-md">
                  <span className="text-[#E8A811] font-manrope font-bold uppercase tracking-[0.4em] text-[10px] mb-4 block">
                    Curator's Choice
                  </span>
                  <h2 className="font-manrope text-4xl md:text-5xl font-extrabold tracking-tighter uppercase italic leading-none mb-6">
                    Trending Now
                  </h2>
                  <p className="text-zinc-500 text-base leading-relaxed font-inter">
                    A curated selection of pieces that are defining the current subculture landscape.
                    No noise, just elite craftsmanship.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {newArrivals.slice(1, 3).map((product) => (
                    <div
                      key={product.id}
                      className="group cursor-pointer"
                      onClick={() => navigate(`/shop/${product.slug}`)}
                      role="link"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") navigate(`/shop/${product.slug}`);
                      }}
                      aria-label={`Open ${product.name}`}
                    >
                      <div className="aspect-[3/4] bg-zinc-50 mb-3 overflow-hidden border border-zinc-100">
                        {getPrimaryImage(product) ? (
                          <img
                            src={getPrimaryImage(product)!}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-100 flex items-center justify-center">
                            <span className="material-symbols-outlined text-zinc-300 text-4xl">image</span>
                          </div>
                        )}
                      </div>
                      <h5 className="font-manrope font-bold text-xs uppercase tracking-tight group-hover:text-[#E8A811] transition-colors">
                        {product.name}
                      </h5>
                      <p className="font-manrope font-black text-sm mt-1">{formatPrice(product.price)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Newsletter ── */}
        <section className="py-24 bg-black text-white overflow-hidden relative">
          <div className="max-w-[1440px] mx-auto px-8 relative z-10 flex flex-col items-center text-center">
            <h2 className="font-manrope text-5xl md:text-7xl font-extrabold tracking-tighter uppercase italic mb-6">
              Join the Kolektion
            </h2>
            <p className="text-zinc-400 text-sm md:text-base uppercase tracking-[0.3em] font-medium mb-12 max-w-lg font-manrope">
              Early access to limited drops and exclusive member-only pricing.
            </p>
            <div className="w-full max-w-md">
              <form
                onSubmit={handleNewsletterSubmit}
                className="flex border-b border-white/30 pb-3 focus-within:border-[#E8A811] transition-colors"
              >
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  required
                  placeholder="ENTER YOUR EMAIL ADDRESS"
                  className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm font-bold uppercase tracking-widest w-full p-0 placeholder:text-zinc-700 font-manrope"
                />
                <button
                  type="submit"
                  className="text-xs font-black uppercase tracking-widest ml-4 hover:text-[#E8A811] transition-colors whitespace-nowrap font-manrope"
                >
                  Join Now
                </button>
              </form>
            </div>
          </div>
          {/* Decorative background text */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[18vw] font-black text-white/5 uppercase italic pointer-events-none whitespace-nowrap font-manrope select-none">
            KOLEKTION ELITE
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
