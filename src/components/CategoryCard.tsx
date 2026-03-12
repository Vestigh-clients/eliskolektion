import { Link } from "react-router-dom";
import type { Category } from "@/data/products";
import { categoryLabels } from "@/data/products";
import { categoryImages } from "@/data/images";

interface CategoryCardProps {
  category: Category;
}

const CategoryCard = ({ category }: CategoryCardProps) => {
  return (
    <Link
      to={`/category/${category}`}
      className="group relative block rounded-2xl overflow-hidden aspect-[3/4]"
    >
      <img
        src={categoryImages[category]}
        alt={categoryLabels[category]}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <h3 className="font-display text-xl font-bold text-card tracking-wide">
          {categoryLabels[category]}
        </h3>
        <span className="font-body text-sm text-card/70 group-hover:text-accent transition-colors">
          Shop Now →
        </span>
      </div>
    </Link>
  );
};

export default CategoryCard;
