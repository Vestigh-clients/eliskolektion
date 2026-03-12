import hairOil from "@/assets/products/hair-oil.jpg";
import shampoo from "@/assets/products/shampoo.jpg";
import hairMask from "@/assets/products/hair-mask.jpg";
import leaveIn from "@/assets/products/leave-in.jpg";
import blazer from "@/assets/products/blazer.jpg";
import chinos from "@/assets/products/chinos.jpg";
import shirt from "@/assets/products/shirt.jpg";
import wrapDress from "@/assets/products/wrap-dress.jpg";
import cardigan from "@/assets/products/cardigan.jpg";
import trousers from "@/assets/products/trousers.jpg";
import toteBag from "@/assets/products/tote-bag.jpg";
import crossbody from "@/assets/products/crossbody.jpg";
import clutch from "@/assets/products/clutch.jpg";
import loafers from "@/assets/products/loafers.jpg";
import sandals from "@/assets/products/sandals.jpg";
import chelseaBoots from "@/assets/products/chelsea-boots.jpg";

import categoryHaircare from "@/assets/category-haircare.jpg";
import categoryMens from "@/assets/category-mens.jpg";
import categoryWomens from "@/assets/category-womens.jpg";
import categoryBags from "@/assets/category-bags.jpg";
import categoryShoes from "@/assets/category-shoes.jpg";

import type { Category } from "@/data/products";

export const productImages: Record<string, string> = {
  "hc-001": hairOil,
  "hc-002": shampoo,
  "hc-003": hairMask,
  "hc-004": leaveIn,
  "mf-001": blazer,
  "mf-002": chinos,
  "mf-003": shirt,
  "wf-001": wrapDress,
  "wf-002": cardigan,
  "wf-003": trousers,
  "bg-001": toteBag,
  "bg-002": crossbody,
  "bg-003": clutch,
  "sh-001": loafers,
  "sh-002": sandals,
  "sh-003": chelseaBoots,
};

export const categoryImages: Record<Category, string> = {
  "hair-care": categoryHaircare,
  "mens-fashion": categoryMens,
  "womens-fashion": categoryWomens,
  "bags": categoryBags,
  "shoes": categoryShoes,
};
