import { cn } from "@/lib/utils";

const MAP = {
  "Order Received": "bg-brand-red/10 text-brand-red border-brand-red/20",
  "Impression Awaited": "bg-amber-100 text-amber-800 border-amber-200",
  "Impression Received": "bg-amber-100 text-amber-800 border-amber-200",
  "In-House Scanning": "bg-amber-100 text-amber-800 border-amber-200",
  "Order Accepted": "bg-blue-50 text-blue-700 border-blue-200",
  "Sent to Designer": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Design Received": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Cutting Started": "bg-purple-50 text-purple-700 border-purple-200",
  "Sintering Started": "bg-purple-50 text-purple-700 border-purple-200",
  "Glazing Started": "bg-purple-50 text-purple-700 border-purple-200",
  "QC Done / Ready for Packaging": "bg-brand-gold/15 text-[#8a6d2f] border-brand-gold/30",
  "Packed / Dispatch Label Printed": "bg-brand-gold/15 text-[#8a6d2f] border-brand-gold/30",
  "Dispatched": "bg-teal-50 text-teal-700 border-teal-200",
  "Delivered": "bg-green-100 text-green-800 border-green-200",
  "On Hold": "bg-orange-100 text-orange-800 border-orange-200",
  "Cancelled": "bg-gray-200 text-gray-600 border-gray-300",
};

export function StatusBadge({ status, className }) {
  const cls = MAP[status] || "bg-brand-taupe/10 text-brand-taupe border-brand-taupe/20";
  return (
    <span
      data-testid="status-badge"
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider whitespace-nowrap",
        cls,
        className
      )}
    >
      {status}
    </span>
  );
}

export function PayBadge({ status }) {
  const map = {
    Paid: "bg-green-100 text-green-800 border-green-200",
    "Partially Paid": "bg-amber-100 text-amber-800 border-amber-200",
    "Payment Requested": "bg-blue-50 text-blue-700 border-blue-200",
    Unpaid: "bg-gray-100 text-gray-600 border-gray-300",
    Failed: "bg-brand-red/10 text-brand-red border-brand-red/20",
    "Free Remake": "bg-brand-gold/15 text-[#8a6d2f] border-brand-gold/30",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", map[status] || map.Unpaid)}>
      {status}
    </span>
  );
}
