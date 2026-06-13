import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { fmtDate } from "@/lib/api";
import { PageHeader, Card } from "@/components/UI";
import { Spinner } from "@/components/Layout";
import { Palette, ChevronRight, CheckCircle2 } from "lucide-react";

export default function DesignerOrders() {
  const [list, setList] = useState(null);
  useEffect(() => { api.get("/designer/orders").then(({ data }) => setList(data)).catch(() => {}); }, []);
  if (!list) return <Spinner />;

  const active = list.filter((o) => !["Delivered", "Cancelled"].includes(o.status));
  const done = list.filter((o) => ["Delivered", "Cancelled"].includes(o.status));

  return (
    <div>
      <PageHeader title="My Assignments" subtitle={`${active.length} active case${active.length === 1 ? "" : "s"}`} />
      {list.length === 0 && <Card><p className="py-10 text-center text-sm text-brand-taupe">No cases assigned to you yet.</p></Card>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {active.map((o) => (
          <Link key={o.id} to={`/app/orders/${o.id}`} data-testid={`designer-order-${o.id}`}
            className="group rounded-2xl border border-brand-taupe/15 bg-white p-5 brand-shadow transition hover:border-brand-red">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-red/10 text-brand-red"><Palette className="h-5 w-5" /></span>
              <ChevronRight className="h-5 w-5 text-brand-taupe transition group-hover:translate-x-1 group-hover:text-brand-red" />
            </div>
            <p className="mt-3 font-heading text-xl font-bold text-brand-graphite">{o.batch_no}</p>
            <p className="mt-1 text-xs text-brand-taupe">Assigned {fmtDate(o.created_at)}</p>
            {o.design_submitted
              ? <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700"><CheckCircle2 className="h-3.5 w-3.5" />Design submitted</span>
              : <span className="mt-3 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">Awaiting your design</span>}
          </Link>
        ))}
      </div>

      {done.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-brand-taupe">Completed</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {done.map((o) => (
              <Link key={o.id} to={`/app/orders/${o.id}`} className="rounded-xl border border-brand-taupe/15 bg-white px-4 py-3 text-sm font-semibold text-brand-graphite hover:border-brand-red">{o.batch_no}</Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
