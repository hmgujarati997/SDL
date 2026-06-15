import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api, { inr, fmtDate } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Card, Btn, inputCls } from "@/components/UI";
import { Spinner } from "@/components/Layout";
import { StatusBadge, PayBadge } from "@/components/StatusBadge";
import { Search, PlusCircle } from "lucide-react";

export default function Orders() {
  const { user } = useAuth();
  const [list, setList] = useState(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [statuses, setStatuses] = useState([]);

  useEffect(() => { api.get("/meta").then(({ data }) => setStatuses(data.statuses)).catch(() => {}); }, []);
  // Dentists must not see the lab's internal SOP — only show dentist-facing statuses.
  const DENTIST_STATUSES = ["Order Received", "Work in Progress", "Impression Awaited", "Impression Received", "Dispatched", "Delivered", "Cancelled"];
  const filterOptions = user?.role === "dentist" ? DENTIST_STATUSES : statuses;
  const load = useCallback(() => {
    const params = {};
    if (q) params.q = q;
    if (status) params.status = status;
    api.get("/orders", { params }).then(({ data }) => setList(data)).catch(() => {});
  }, [q, status]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const title = user?.role === "designer" ? "My Assignments" : user?.role === "dentist" ? "My Orders" : "Orders";

  return (
    <div>
      <PageHeader title={title} subtitle="Track and manage cases."
        action={user?.role === "dentist" && <Link to="/app/new-order"><Btn><PlusCircle className="h-4 w-4" />New Order</Btn></Link>} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-brand-taupe" />
          <input data-testid="order-search" className={inputCls + " pl-9"} placeholder="Search order no, dentist, clinic..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select data-testid="order-status-filter" className={inputCls + " sm:w-56"} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {filterOptions.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {!list ? <Spinner /> : list.length === 0 ? (
        <Card><p className="py-10 text-center text-brand-taupe">No orders found.</p></Card>
      ) : (
        <div className="grid gap-3">
          {list.map((o) => (
            <Link to={`/app/orders/${o.id}`} key={o.id} data-testid={`order-row-${o.id}`}
              className="card-hover flex flex-col gap-3 rounded-2xl border border-brand-taupe/15 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-heading text-lg font-bold">{o.batch_no}</p>
                  {o.is_remake && <span className="rounded-full bg-brand-gold/15 px-2 py-0.5 text-xs font-bold text-[#8a6d2f]">REMAKE</span>}
                  {o.urgency !== "Normal" && <span className="rounded-full bg-brand-red/10 px-2 py-0.5 text-xs font-bold text-brand-red">{o.urgency}</span>}
                </div>
                <p className="mt-1 text-sm text-brand-taupe">
                  {(o.cases || []).map((c) => c.patient_name).join(", ") || o.dentist_name} · {fmtDate(o.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {user?.role !== "designer" && <span className="font-semibold tabular text-brand-graphite">{inr(o.amounts.total)}</span>}
                <PayBadge status={o.amounts.status} />
                <StatusBadge status={o.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
