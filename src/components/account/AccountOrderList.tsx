import { Link } from "react-router-dom";
import { formatPrice } from "@/lib/price";
import { formatStatusLabel } from "@/lib/orderPresentation";
import type { AccountOrderStatus, AccountOrderSummary } from "@/services/accountService";

interface AccountOrderListProps {
  orders: AccountOrderSummary[];
}

const formatOrderDate = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-GH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getStatusClassName = (status: AccountOrderStatus): string => {
  if (status === "delivered") {
    return "border-zinc-900 bg-zinc-900 text-white";
  }

  if (status === "shipped") {
    return "border-[#E8A811] text-[#E8A811]";
  }

  if (status === "cancelled") {
    return "border-red-600 text-red-600";
  }

  if (status === "confirmed" || status === "processing") {
    return "border-zinc-900 text-zinc-900";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-400";
};

const getItemsSummaryText = (order: AccountOrderSummary): string => {
  if (order.item_count <= 1) {
    return order.first_item_name;
  }

  return `${order.first_item_name} + [${order.item_count - 1}] more items`;
};

const AccountOrderList = ({ orders }: AccountOrderListProps) => {
  return (
    <div>
      {orders.map((order, index) => (
        <article
          key={order.id}
          className={`py-6 ${index < orders.length - 1 ? "border-b border-zinc-100" : ""}`}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="font-display font-black text-[12px] uppercase tracking-[0.1em] text-[#E8A811]">{order.order_number}</p>
              <p className="mt-1 font-inter text-[11px] text-zinc-400">{formatOrderDate(order.created_at)}</p>

              <span
                className={`mt-4 inline-flex border px-3 py-[4px] font-inter text-[9px] uppercase tracking-[0.15em] ${getStatusClassName(order.status)}`}
              >
                {formatStatusLabel(order.status)}
              </span>

              <p className="mt-4 truncate font-inter text-[12px] text-zinc-500">{getItemsSummaryText(order)}</p>

              <Link
                to={`/orders/${order.order_number}`}
                className="mt-4 inline-block font-display font-black text-[10px] uppercase tracking-widest border-b-2 border-zinc-900 pb-[2px] hover:text-[#E8A811] hover:border-[#E8A811] transition-all"
              >
                View Order
              </Link>
            </div>

            <div className="md:text-right">
              <p className="font-inter text-[10px] uppercase tracking-[0.12em] text-zinc-400">Order Total</p>
              <p className="mt-1 font-display font-bold text-[13px] text-zinc-900">{formatPrice(order.total)}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
};

export default AccountOrderList;



