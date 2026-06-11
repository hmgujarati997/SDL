import { useEffect, useState } from "react";
import api, { inr } from "@/lib/api";
import { PageHeader, StatCard, Card } from "@/components/UI";
import { Spinner } from "@/components/Layout";
import { Tag, FileText, IndianRupee, Package } from "lucide-react";

export default function Reports() {
  const [r, setR] = useState(null);
  const [wa, setWa] = useState(null);
  useEffect(() => {
    api.get("/reports/summary").then(({ data }) => setR(data)).catch(() => {});
    api.get("/whatsapp/report").then(({ data }) => setWa(data)).catch(() => {});
  }, []);
  if (!r) return <Spinner />;
  return (
    <div>
      <PageHeader title="Reports" subtitle="Business insights" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Orders" value={r.total_orders} icon={Package} />
        <StatCard label="Offer Discounts Given" value={inr(r.total_offer_discount)} icon={Tag} accent="gold" />
        <StatCard label="Invoice Paid" value={inr(r.invoice_paid)} icon={IndianRupee} accent="green" />
        <StatCard label="Invoice Pending" value={inr(r.invoice_pending)} icon={FileText} accent="red" />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card><h3 className="mb-3 font-heading text-lg font-bold">Orders by Status</h3>{Object.entries(r.by_status).map(([k, v]) => <Bar key={k} l={k} v={v} max={r.total_orders} />)}</Card>
        <Card><h3 className="mb-3 font-heading text-lg font-bold">Orders by Dentist</h3>{Object.entries(r.by_dentist).map(([k, v]) => <Bar key={k} l={k} v={v} max={r.total_orders} />)}</Card>
        <Card><h3 className="mb-3 font-heading text-lg font-bold">WhatsApp Delivery</h3>{wa && Object.entries(wa.by_status).map(([k, v]) => <Bar key={k} l={k} v={v} max={wa.total} />)}</Card>
      </div>
    </div>
  );
}

function Bar({ l, v, max }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-sm"><span className="text-brand-graphite">{l}</span><span className="font-bold">{v}</span></div>
      <div className="mt-1 h-2 rounded-full bg-brand-ivory"><div className="h-2 rounded-full bg-brand-red" style={{ width: `${max ? (v / max) * 100 : 0}%` }} /></div>
    </div>
  );
}
