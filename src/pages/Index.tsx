import { Link } from "react-router-dom";
import { Truck, Shield, Clock } from "lucide-react";
import heroImg from "@/assets/hero-bg.jpg";
import { getFeaturedProducts, getBestSellers, type Category } from "@/data/products";
import ProductCard from "@/components/ProductCard";
import CategoryCard from "@/components/CategoryCard";

const categories: Category[] = ["hair-care", "mens-fashion", "womens-fashion", "bags", "shoes"];

const Index = () => {
  const featured = getFeaturedProducts();
  const bestSellers = getBestSellers();

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        <img src={heroImg} alt="Luxuriant collection" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/50 to-transparent" />
        <div className="relative z-10 container mx-auto px-4 text-center">
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-card tracking-wider mb-6 animate-fade-in">
            LUXURIANT
          </h1>
          <p className="font-body text-lg md:text-xl text-card/80 mb-10 max-w-xl mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Luxury Fashion & Hair Care — Global and Nationwide Delivery
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <Link
              to="/shop"
              className="bg-accent text-accent-foreground px-10 py-4 rounded-lg font-body font-semibold text-sm tracking-wider hover:bg-gold-dark transition-colors"
            >
              SHOP NOW
            </Link>
            <Link
              to="/about"
              className="border border-card/40 text-card px-10 py-4 rounded-lg font-body font-semibold text-sm tracking-wider hover:bg-card/10 transition-colors"
            >
              OUR STORY
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-4">Shop by Category</h2>
        <p className="font-body text-muted-foreground text-center mb-12 max-w-lg mx-auto">
          Explore our curated collections of luxury fashion and beauty essentials.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <CategoryCard key={cat} category={cat} />
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-secondary py-20">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-4">Featured Products</h2>
          <p className="font-body text-muted-foreground text-center mb-12">
            Handpicked selections from our latest collections.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Best Sellers */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-4">Best Sellers</h2>
        <p className="font-body text-muted-foreground text-center mb-12">
          Our most loved products by customers nationwide.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {bestSellers.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Delivery Info */}
      <section className="bg-teal-gradient text-primary-foreground py-20">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12">
            We Deliver Nationwide
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <Truck className="mx-auto mb-4 text-accent" size={40} />
              <h3 className="font-display text-lg font-semibold mb-2">Fast Delivery</h3>
              <p className="font-body text-sm text-primary-foreground/70">
                Swift and reliable delivery to your doorstep, anywhere in Nigeria.
              </p>
            </div>
            <div className="text-center">
              <Shield className="mx-auto mb-4 text-accent" size={40} />
              <h3 className="font-display text-lg font-semibold mb-2">Quality Guaranteed</h3>
              <p className="font-body text-sm text-primary-foreground/70">
                Every product is carefully inspected before shipping.
              </p>
            </div>
            <div className="text-center">
              <Clock className="mx-auto mb-4 text-accent" size={40} />
              <h3 className="font-display text-lg font-semibold mb-2">Easy Ordering</h3>
              <p className="font-body text-sm text-primary-foreground/70">
                Simply browse, pick, and order via WhatsApp. It's that easy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social / CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Follow Us</h2>
        <p className="font-body text-muted-foreground mb-8 max-w-md mx-auto">
          Stay updated with our latest collections, offers, and style inspiration.
        </p>
        <div className="flex flex-wrap justify-center gap-6">
          <a href="https://instagram.com/torriefebri" target="_blank" rel="noopener noreferrer" className="font-body text-sm font-medium text-primary hover:text-accent transition-colors">
            Instagram
          </a>
          <a href="https://tiktok.com/@torrie" target="_blank" rel="noopener noreferrer" className="font-body text-sm font-medium text-primary hover:text-accent transition-colors">
            TikTok
          </a>
          <a href="https://facebook.com/luxuriant" target="_blank" rel="noopener noreferrer" className="font-body text-sm font-medium text-primary hover:text-accent transition-colors">
            Facebook
          </a>
          <a href="https://wa.me/233594817032" target="_blank" rel="noopener noreferrer" className="font-body text-sm font-medium text-primary hover:text-accent transition-colors">
            WhatsApp
          </a>
          <a href="https://snapchat.com/add/torrie_febri" target="_blank" rel="noopener noreferrer" className="font-body text-sm font-medium text-primary hover:text-accent transition-colors">
            Snapchat
          </a>
        </div>
      </section>
    </div>
  );
};

export default Index;
