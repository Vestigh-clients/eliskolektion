import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import ProductImagePlaceholder from "@/components/products/ProductImagePlaceholder";
import { getCategoryLabel } from "@/lib/categories";
import { formatPrice } from "@/lib/price";
import { toast } from "@/components/ui/sonner";
import { addProductToFavorites, isProductFavorited, subscribeToFavoriteChanges } from "@/services/favoritesService";
import { getPrimaryImage, isInStock, type Product } from "@/types/product";

interface StorefrontProductCardProps {
  product: Product;
  actionLabel?: string;
  actionHref?: string;
  onAction?: (product: Product) => void;
  badgeLabel?: string;
  badgeVariant?: "dark" | "gold";
}

const StorefrontProductCard = ({
  product,
  actionLabel = "Quick Shop",
  actionHref,
  onAction,
  badgeLabel,
  badgeVariant = "dark",
}: StorefrontProductCardProps) => {
  const navigate = useNavigate();
  const [hasImageError, setHasImageError] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const imageUrl = getPrimaryImage(product);
  const categoryLabel = product.categories?.name?.trim() || getCategoryLabel(product.categories?.slug);

  const outOfStock = !isInStock(product);
  const actionText = outOfStock && onAction ? "Out of Stock" : actionLabel;
  const productRoute = useMemo(() => actionHref || `/shop/${product.slug}`, [actionHref, product.slug]);

  useEffect(() => {
    setHasImageError(false);
  }, [imageUrl, product.id]);

  useEffect(() => {
    setIsFavorited(isProductFavorited(product.id));
  }, [product.id]);

  useEffect(() => {
    return subscribeToFavoriteChanges(() => {
      setIsFavorited(isProductFavorited(product.id));
    });
  }, [product.id]);

  const openProduct = () => navigate(productRoute);

  const handleFavoriteClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const added = addProductToFavorites(product.id);
    if (added) {
      toast(`${product.name} added to favorites`, { duration: 2200 });
    } else {
      toast(`${product.name} is already in favorites`, { duration: 2200 });
    }
    setIsFavorited(true);
  };

  const handleActionClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (onAction) {
      onAction(product);
      return;
    }
    openProduct();
  };

  return (
    <article
      className="group cursor-pointer"
      role="link"
      tabIndex={0}
      onClick={openProduct}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openProduct();
        }
      }}
      aria-label={`Open ${product.name}`}
    >
      <div className="relative aspect-[3/4] mb-4 overflow-hidden bg-zinc-50 border border-zinc-100">
        {imageUrl && !hasImageError ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
            onError={() => setHasImageError(true)}
          />
        ) : (
          <ProductImagePlaceholder className="w-full h-full" />
        )}

        {/* Badge */}
        {badgeLabel ? (
          <div className="absolute top-3 left-3">
            <span
              className={[
                "px-2 py-1 text-[9px] font-black uppercase tracking-widest font-display",
                badgeVariant === "gold"
                  ? "bg-[#E8A811] text-black"
                  : "bg-black text-white",
              ].join(" ")}
            >
              {badgeLabel}
            </span>
          </div>
        ) : null}

        {/* Favorite */}
        <button
          type="button"
          onClick={handleFavoriteClick}
          className={[
            "absolute right-3 top-3 flex h-8 w-8 items-center justify-center bg-white/90 text-sm backdrop-blur transition-colors",
            isFavorited
              ? "text-[#E8A811]"
              : "text-zinc-400 hover:text-[#E8A811]",
          ].join(" ")}
          aria-label={isFavorited ? "Saved to favorites" : "Add to favorites"}
          title={isFavorited ? "Saved to favorites" : "Add to favorites"}
        >
          <span
            className="material-symbols-outlined text-base"
            style={{ fontVariationSettings: isFavorited ? "'FILL' 1" : "'FILL' 0" }}
          >
            favorite
          </span>
        </button>

        {/* Quick Shop */}
        {/* Slide-up action button */}
        <div className="absolute bottom-0 left-0 w-full p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
          <button
            type="button"
            onClick={handleActionClick}
            disabled={outOfStock}
            className="w-full bg-[#E8A811] text-black py-4 font-display font-black text-[10px] uppercase tracking-widest hover:bg-zinc-900 hover:text-white transition-colors disabled:bg-zinc-400 disabled:cursor-not-allowed"
          >
            {actionText}
          </button>
        </div>
      </div>

      <div className="flex justify-between items-start mt-1 gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="font-display font-bold text-sm md:text-base leading-tight text-zinc-900 group-hover:text-[#E8A811] transition-colors mb-1 truncate">
            {product.name}
          </h4>
          <p className="text-zinc-400 text-xs md:text-sm font-display truncate">{categoryLabel}</p>
        </div>
        <p className="font-display font-bold text-sm md:text-base shrink-0">{formatPrice(product.price)}</p>
      </div>
    </article>
  );
};

export default StorefrontProductCard;
