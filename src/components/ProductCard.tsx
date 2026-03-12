import { Link } from "react-router-dom";
import { type Product, formatPrice, getWhatsAppLink } from "@/data/products";
import { productImages } from "@/data/images";
import { ShoppingBag, Eye } from "lucide-react";

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const image = productImages[product.id];

  return (
    <div className="group relative bg-card rounded-2xl overflow-hidden border border-border transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      {product.isBestSeller && (
        <span className="absolute top-3 left-3 z-10 bg-gold-gradient text-foreground text-xs font-body font-semibold px-3 py-1 rounded-full">
          Best Seller
        </span>
      )}

      <Link to={`/product/${product.id}`} className="block">
        <div className="aspect-square overflow-hidden bg-muted">
          <img
            src={image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      </Link>

      <div className="p-5">
        <Link to={`/product/${product.id}`}>
          <h3 className="font-display text-lg font-semibold text-foreground mb-1 group-hover:text-teal transition-colors">
            {product.name}
          </h3>
        </Link>
        <p className="font-body text-accent font-bold text-lg mb-4">
          {formatPrice(product.price)}
        </p>

        <div className="flex gap-2">
          <Link
            to={`/product/${product.id}`}
            className="flex-1 flex items-center justify-center gap-2 bg-secondary text-secondary-foreground py-2.5 rounded-lg font-body text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            <Eye size={16} />
            Quick View
          </Link>
          <a
            href={getWhatsAppLink(product.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg font-body text-sm font-medium hover:bg-teal-light transition-colors"
          >
            <ShoppingBag size={16} />
            Buy
          </a>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
