import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { inr, fmtDate } from "@/lib/api";
import { PageHeader } from "@/components/UI";
import { Spinner } from "@/components/Layout";
import { useStatuses, colorClasses } from "@/lib/statusColors";

export default function ProductionBoard() {
  const [orders, setOrders] = useState(null);
  const statuses = useStatuses();
  useEffect(() => { api.get("/orders").then(({ data }) => setOrders(data)).catch(() => {}); }, []);
  if (!orders || !statuses) return <Spinner />;

  const cols = statuses.filter((s) => s.active && s.show_on_board);

  return (
    <div>
      <PageHeader title="Production Board" subtitle="Cases across every workflow stage" />
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4" style={{ minWidth: cols.length * 260 }}>
          {cols.map((col) => {
            const items = orders.filter((o) => o.status === col.label);
            return (
              <div key={col.id} className="w-60 shrink-0">
                <div className="mb-2 flex items-center justify-between rounded-lg bg-brand-charcoal px-3 py-2 text-white">
                  <span className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${colorClasses(col.color).dot}`} />
                    <span className="text-xs font-semibold uppercase tracking-wider">{col.label}</span>
                  </span>
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
