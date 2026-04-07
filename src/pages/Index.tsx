import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StorefrontProductCard from "@/components/products/StorefrontProductCard";
import { useStorefrontConfig } from "@/contexts/StorefrontConfigContext";
import { getAllProducts, getTopSellingProductIds } from "@/services/productService";
import { formatPrice } from "@/lib/price";
import { getPrimaryImage } from "@/types/product";
import { type Product } from "@/types/product";
import { heroSlides as HERO_SLIDES } from "@/data/heroSlides";


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
      className="group cursor-pointer"
      onClick={() => navigate(`/shop/${product.slug}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") navigate(`/shop/${product.slug}`);
      }}
      aria-label={`Open ${product.name}`}
    >
      <div className="aspect-square bg-white border border-zinc-100 mb-4 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <span className="material-symbols-outlined text-zinc-300 text-5xl">image</span>
        )}
      </div>
      <h4 className="font-display font-bold text-sm uppercase tracking-tight text-zinc-900 group-hover:text-[#E8A811] transition-colors truncate">
        {product.name}
      </h4>
      <p className="font-display font-black text-sm mt-1">{formatPrice(product.price)}</p>
    </div>
  );
};

const Index = () => {
  const { storefrontConfig, storefrontCategories } = useStorefrontConfig();
  const navigate = useNavigate();
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goToSlide = (index: number) => setCurrentSlide(index);
  const nextSlide = useCallback(() => setCurrentSlide((s) => (s + 1) % HERO_SLIDES.length), []);
  const prevSlideBtn = () => setCurrentSlide((s) => (s - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);

  useEffect(() => {
    slideTimerRef.current = setTimeout(nextSlide, 5500);
    return () => {
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
    };
  }, [currentSlide, nextSlide]);

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
    <div className="bg-white text-zinc-900 font-body">
      <main>
        {/* ── Hero Slideshow ── */}
        <section
          className="relative min-h-[500px] md:h-[700px] flex items-center bg-zinc-900 overflow-hidden"
          onMouseEnter={() => { if (slideTimerRef.current) clearTimeout(slideTimerRef.current); }}
          onMouseLeave={() => { slideTimerRef.current = setTimeout(nextSlide, 5500); }}
        >
          {/* Slide images — GPU-composited crossfade + Ken Burns zoom */}
          {HERO_SLIDES.map((slide, i) => (
            <div
              key={slide.image}
              className="absolute inset-0"
              style={{
                opacity: i === currentSlide ? 1 : 0,
                zIndex: i === currentSlide ? 1 : 0,
                transition: "opacity 1200ms cubic-bezier(0.4, 0, 0.2, 1)",
                willChange: "opacity",
              }}
            >
              <img
                src={slide.image}
                alt={slide.heading.join(" ")}
                className="w-full h-full object-cover"
                style={{
                  transform: i === currentSlide ? "scale(1.06)" : "scale(1)",
                  transition: i === currentSlide ? "transform 6000ms ease-out" : "transform 1200ms cubic-bezier(0.4, 0, 0.2, 1)",
                  willChange: "transform",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
            </div>
          ))}

          {/* Slide content */}
          <div className="relative z-10 w-full">
            {HERO_SLIDES.map((slide, i) => (
              <div
                key={`content-${i}`}
                className="absolute inset-0 flex items-center px-6 lg:px-16"
                style={{
                  opacity: i === currentSlide ? 1 : 0,
                  transform: i === currentSlide ? "translateY(0)" : "translateY(16px)",
                  transition: "opacity 1000ms cubic-bezier(0.4, 0, 0.2, 1), transform 1000ms cubic-bezier(0.4, 0, 0.2, 1)",
                  willChange: "opacity, transform",
                  pointerEvents: i === currentSlide ? "auto" : "none",
                  zIndex: i === currentSlide ? 2 : 0,
                }}
              >
                <div className="max-w-[1440px] mx-auto w-full py-16 md:py-0">
                  <div className="max-w-xl">
                    <span className="text-[#E8A811] font-display font-bold uppercase tracking-[0.4em] text-[10px] mb-4 md:mb-6 block">
                      {slide.label}
                    </span>
                    <h1 className="font-display font-extrabold text-4xl sm:text-6xl md:text-8xl text-white tracking-tighter leading-[0.9] mb-6 md:mb-8 uppercase italic">
                      {slide.heading[0]}
                      <br />
                      {slide.heading[1]}
                    </h1>
                    <p className="text-white text-sm md:text-base font-medium mb-8 md:mb-10 max-w-sm opacity-90 leading-relaxed font-display">
                      {slide.sub}
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <Link
                        to={slide.cta.to}
                        className="bg-[#E8A811] text-black px-10 py-4 font-display font-black uppercase tracking-widest text-[10px] hover:bg-zinc-900 hover:text-white transition-colors"
                      >
                        {slide.cta.label}
                      </Link>
                      <Link
                        to={slide.cta2.to}
                        className="bg-white text-black px-10 py-4 font-display font-black uppercase tracking-widest text-[10px] hover:bg-zinc-100 transition-all shadow-xl"
                      >
                        {slide.cta2.label}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Prev / Next arrows — desktop only */}
          <button
            onClick={prevSlideBtn}
            aria-label="Previous slide"
            className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 items-center justify-center bg-black/30 hover:bg-[#E8A811] text-white hover:text-black transition-all duration-200 backdrop-blur-sm"
          >
            <span className="material-symbols-outlined text-xl">chevron_left</span>
          </button>
          <button
            onClick={nextSlide}
            aria-label="Next slide"
            className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 items-center justify-center bg-black/30 hover:bg-[#E8A811] text-white hover:text-black transition-all duration-200 backdrop-blur-sm"
          >
            <span className="material-symbols-outlined text-xl">chevron_right</span>
          </button>
        </section>

        {/* ── Category Tiles ── */}
        {categoryTiles.length > 0 ? (
          <section className="py-14 md:py-20 px-6 md:px-8 max-w-[1440px] mx-auto">
            <div className="grid grid-cols-2 gap-4 md:gap-8">
              {categoryTiles.slice(0, 2).map((tile) => (
                <Link
                  key={tile.key}
                  to={tile.to}
                  className="group relative aspect-[4/3] md:aspect-[16/9] overflow-hidden bg-zinc-100 block"
                >
                  <img
                    src={tile.imageUrl}
                    alt={tile.imageAlt}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                  <div className="absolute inset-0 flex flex-col justify-center items-center p-4 md:p-8 text-center">
                    <h3 className="font-display text-xl sm:text-3xl md:text-5xl text-white font-black uppercase italic tracking-tighter mb-2 md:mb-4">
                      {tile.title}
                    </h3>
                    <span className="bg-white text-black text-[9px] md:text-[10px] font-display font-black uppercase px-4 md:px-8 py-2 md:py-3 tracking-widest group-hover:bg-[#E8A811] transition-colors shadow-lg">
                      Shop {tile.title}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Additional category tiles (3+) in a balanced sub-grid */}
            {categoryTiles.length > 2 ? (() => {
              const subTiles = categoryTiles.slice(2);
              const hasOdd = subTiles.length % 2 !== 0;
              const mainTiles = hasOdd ? subTiles.slice(0, -1) : subTiles;
              const lastTile = hasOdd ? subTiles[subTiles.length - 1] : null;
              return (
                <div className="mt-4 md:mt-8 space-y-4 md:space-y-8">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
                    {mainTiles.map((tile) => (
                      <Link
                        key={tile.key}
                        to={tile.to}
                        className="group relative aspect-[4/3] overflow-hidden bg-zinc-100 block"
                      >
                        <img
                          src={tile.imageUrl}
                          alt={tile.imageAlt}
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                        <div className="absolute inset-0 flex flex-col justify-center items-center p-4 md:p-6 text-center">
                          <h3 className="font-display text-lg sm:text-2xl md:text-3xl text-white font-black uppercase italic tracking-tighter mb-2 md:mb-3">
                            {tile.title}
                          </h3>
                          <span className="bg-white text-black text-[9px] md:text-[10px] font-display font-black uppercase px-4 md:px-6 py-2 tracking-widest group-hover:bg-[#E8A811] transition-colors shadow-lg">
                            Shop Now
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {lastTile ? (
                    <Link
                      key={lastTile.key}
                      to={lastTile.to}
                      className="group relative aspect-[21/9] md:aspect-[21/6] overflow-hidden bg-zinc-100 block w-full"
                    >
                      <img
                        src={lastTile.imageUrl}
                        alt={lastTile.imageAlt}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                      <div className="absolute inset-0 flex flex-col justify-center items-center p-4 md:p-6 text-center">
                        <h3 className="font-display text-2xl sm:text-3xl md:text-4xl text-white font-black uppercase italic tracking-tighter mb-2 md:mb-3">
                          {lastTile.title}
                        </h3>
                        <span className="bg-white text-black text-[9px] md:text-[10px] font-display font-black uppercase px-6 md:px-8 py-2 md:py-3 tracking-widest group-hover:bg-[#E8A811] transition-colors shadow-lg">
                          Shop Now
                        </span>
                      </div>
                    </Link>
                  ) : null}
                </div>
              );
            })() : null}
          </section>
        ) : null}

        {/* ── Current Drops / New Arrivals ── */}
        <section className="py-6 md:py-8 px-6 md:px-8 max-w-[1440px] mx-auto border-t border-zinc-100">
          <div className="flex flex-col sm:flex-row justify-between items-end mb-8 md:mb-12 gap-4">
            <div className="max-w-md">
              <h2 className="font-display text-4xl font-bold tracking-tight uppercase italic">
                Current Drops
              </h2>
              <p className="text-zinc-500 mt-2 text-sm uppercase tracking-wider font-medium font-display">
                New arrivals from our curated brands, updated weekly.
              </p>
            </div>
            <Link
              to="/shop"
              className="font-display font-black text-[10px] uppercase tracking-widest border-b-2 border-black pb-1 hover:text-[#E8A811] hover:border-[#E8A811] transition-all whitespace-nowrap"
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
              <p className="font-display text-sm text-zinc-400 uppercase tracking-widest">
                No new arrivals available yet.
              </p>
            </div>
          )}
        </section>

        {/* ── Best Sellers ── */}
        <section className="py-14 md:py-20 bg-zinc-50 border-y border-zinc-100">
          <div className="max-w-[1440px] mx-auto px-6 md:px-8">
            <div className="flex justify-between items-end mb-8 md:mb-12">
              <div>
                <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight uppercase italic">
                  Best Sellers
                </h2>
                <p className="text-zinc-500 mt-2 text-xs md:text-sm uppercase tracking-wider font-medium font-display">
                  Most coveted pieces in the kolektion.
                </p>
              </div>
              <Link
                to="/shop"
                className="font-display font-black text-[10px] uppercase tracking-widest border-b-2 border-black pb-1 hover:text-[#E8A811] hover:border-[#E8A811] transition-all whitespace-nowrap"
              >
                Shop Best Sellers
              </Link>
            </div>

            {bestSellers.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {bestSellers.map((product) => (
                  <BestSellerCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="font-display text-sm text-zinc-400 uppercase tracking-widest">
                  No best sellers available yet.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ── Curator's Choice / Trending ── */}
        {newArrivals.length >= 4 ? (
          <section className="py-14 md:py-20 px-6 md:px-8 max-w-[1440px] mx-auto">
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
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#E8A811] mb-2 font-display">
                    Look of the Week
                  </p>
                  <h4 className="font-display font-bold text-sm uppercase italic mb-4 leading-tight">
                    {newArrivals[0].name}
                  </h4>
                  <Link
                    to={`/shop/${newArrivals[0].slug}`}
                    className="text-[10px] font-black uppercase tracking-widest border-b border-black pb-1 hover:text-[#E8A811] hover:border-[#E8A811] transition-all font-display"
                  >
                    Shop the Look
                  </Link>
                </div>
              </div>

              {/* Right: Content + product mini-grid */}
              <div className="space-y-10 lg:pl-8">
                <div className="max-w-md">
                  <span className="text-[#E8A811] font-display font-bold uppercase tracking-[0.4em] text-[10px] mb-4 block">
                    Curator's Choice
                  </span>
                  <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight uppercase italic leading-none mb-6">
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
                      <h5 className="font-display font-bold text-xs uppercase tracking-tight group-hover:text-[#E8A811] transition-colors">
                        {product.name}
                      </h5>
                      <p className="font-display font-black text-sm mt-1">{formatPrice(product.price)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Newsletter ── */}
        <section className="py-16 md:py-24 bg-black text-white overflow-hidden relative">
          <div className="max-w-[1440px] mx-auto px-6 md:px-8 relative z-10 flex flex-col items-center text-center">
            <h2 className="font-display text-4xl md:text-7xl font-bold tracking-tight uppercase italic mb-4 md:mb-6">
              Join the Kolektion
            </h2>
            <p className="text-zinc-400 text-sm md:text-base uppercase tracking-[0.3em] font-medium mb-8 md:mb-12 max-w-lg font-display">
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
                  className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm font-bold uppercase tracking-widest w-full p-0 placeholder:text-zinc-700 font-display"
                />
                <button
                  type="submit"
                  className="text-xs font-black uppercase tracking-widest ml-4 hover:text-[#E8A811] transition-colors whitespace-nowrap font-display"
                >
                  Join Now
                </button>
              </form>
            </div>
          </div>
          {/* Decorative background text */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[18vw] font-black text-white/5 uppercase italic pointer-events-none whitespace-nowrap font-display select-none">
            KOLEKTION ELITE
          </div>
        </section>

        {/* ── Trust Badges ── */}
        <section className="bg-white py-10 md:py-14 border-b border-zinc-100">
          <div className="max-w-[1440px] mx-auto px-6 md:px-8 grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12">
            {TRUST_BADGES.map((badge) => (
              <div key={badge.title} className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-zinc-50 rounded-full shrink-0">
                  <span className="material-symbols-outlined text-black text-xl md:text-2xl">{badge.icon}</span>
                </div>
                <div>
                  <h4 className="font-display font-black text-xs uppercase tracking-widest mb-1">
                    {badge.title}
                  </h4>
                  <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider font-display">
                    {badge.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
