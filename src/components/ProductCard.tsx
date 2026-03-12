import { Link } from "react-router-dom";
import { type Product, formatPrice, getWhatsAppLink } from "@/data/products";
import { productImages } from "@/data/images";

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const image = productImages[product.id];

  return (
    <div className="group bg-card rounded-[4px] overflow-hidden">
      <Link to={`/product/${product.id}`} className="block">
        <div className="aspect-[4/5] overflow-hidden bg-muted/20">
          <img
            src={image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        </div>
      </Link>

      <div className="pt-5 text-left">
        <Link to={`/product/${product.id}`}>
          <h3 className="font-display text-[1.35rem] md:text-[1.5rem] font-normal italic leading-tight">{product.name}</h3>
        </Link>
        <p className="font-body font-light text-lg mt-2">{formatPrice(product.price)}</p>

        <a
          href={getWhatsAppLink(product.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center justify-center border border-foreground text-foreground px-6 py-3 rounded-[4px] font-body text-xs md:text-sm font-medium tracking-[0.12em] uppercase transition-colors hover:bg-foreground hover:text-background"
        >
          Add to Cart
        </a>
      </div>
    </div>
  );
};

export default ProductCard;
