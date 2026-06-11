import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { inr, fmtDate } from "@/lib/api";
import { PageHeader } from "@/components/UI";
import { Spinner } from "@/components/Layout";

const COLS = ["Order Received", "Order Accepted", "Sent to Designer", "Design Received", "Cutting Started", "Sintering Started", "Glazing Started", "QC Done / Ready for Packaging", "Packed / Dispatch Label Printed", "Dispatched", "Delivered", "On Hold"];

export default function ProductionBoard() {
  const [orders, setOrders] = useState(null);
  useEffect(() => { api.get("/orders").then(({ data }) => setOrders(data)).catch(() => {}); }, []);
  if (!orders) return <Spinner />;
  return (
    <div>
      <PageHeader title="Production Board" subtitle="Cases across every workflow stage" />
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4" style={{ minWidth: COLS.length * 260 }}>
          {COLS.map((col) => {
            const items = orders.filter((o) => o.status === col);
            return (
              <div key={col} className="w-60 shrink-0">
                <div className="mb-2 flex items-center justify-between rounded-lg bg-brand-charcoal px-3 py-2 text-white">
                  <span className="text-xs font-semibold uppercase tracking-wider">{col}</span>
                  <span className="rounded-full bg-brand-red px-2 text-xs font-bold">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((o) => (
                    <Link key={o.id} to={`/app/orders/${o.id}`} className="block rounded-xl border border-brand-taupe/15 bg-white p-3 brand-shadow hover:border-brand-red">
                      <p className="font-bold">{o.batch_no}</p>
                      <p className="text-xs text-brand-taupe">{(o.cases || []).map((c) => c.patient_name).join(", ")}</p>
                      <p className="mt-1 text-xs text-brand-taupe">{fmtDate(o.created_at)} · {inr(o.amounts.total)}</p>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
