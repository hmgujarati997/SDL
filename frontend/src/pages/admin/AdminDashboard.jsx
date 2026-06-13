import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { inr } from "@/lib/api";
import { PageHeader, StatCard, Card } from "@/components/UI";
import { Spinner } from "@/components/Layout";
import { Inbox, Clock, Package, Truck, CheckCircle2, AlertTriangle, Wallet, MessageSquare, RotateCcw, ClipboardList, Boxes } from "lucide-react";

export default function AdminDashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/admin/dashboard").then(({ data }) => setD(data)).catch(() => {}); }, []);
  if (!d) return <Spinner />;
  return (
    <div>
      <PageHeader title="Lab Dashboard" subtitle="Operations overview" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard testid="stat-today" label="Orders Today" value={d.today} icon={Inbox} />
        <StatCard testid="stat-pending-acceptance" label="Pending Acceptance" value={d.pending_acceptance} icon={Clock} accent="red" />
        <StatCard testid="stat-impressions" label="Impressions Awaited" value={d.impressions_awaited} icon={ClipboardList} accent="gold" />
        <StatCard label="Pickup Requests" value={d.pickup_requests} icon={Boxes} accent="gold" />
        <StatCard label="File Issues" value={d.file_issues} icon={AlertTriangle} accent="red" />
        <StatCard label="Ready / Dispatch" value={d.ready_dispatch} icon={Package} accent="charcoal" />
        <StatCard label="Dispatched" value={d.dispatched} icon={Truck} accent="charcoal" />
        <StatCard label="Delivered" value={d.delivered} icon={CheckCircle2} accent="green" />
        <StatCard label="Remakes" value={d.remakes} icon={RotateCcw} accent="red" />
        <StatCard label="Overdue" value={d.overdue} icon={Clock} accent="red" />
        <StatCard label="WhatsApp Failed" value={d.whatsapp_failed} icon={MessageSquare} accent="red" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-heading text-lg font-bold">Orders by Stage</h3>
          <div className="space-y-2">
            {Object.entries(d.stages).map(([s, n]) => (
              <div key={s} className="flex items-center justify-between text-sm">
                <span className="text-brand-graphite">{s}</span>
                <span className="rounded-full bg-brand-ivory px-3 py-0.5 font-bold tabular">{n}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 font-heading text-lg font-bold">Designer Workload</h3>
          {d.designer_pending.length === 0 ? <p className="text-sm text-brand-taupe">No designers yet.</p> : d.designer_pending.map((x) => (
            <div key={x.name} className="flex items-center justify-between border-b border-brand-taupe/10 py-2 text-sm">
              <span>{x.name}</span><span className="font-bold">{x.pending} pending</span>
            </div>
          ))}
          <Link to="/app/board" className="mt-4 inline-block text-sm font-semibold text-brand-red">Open Production Board →</Link>
        </Card>
      </div>
    </div>
  );
}
