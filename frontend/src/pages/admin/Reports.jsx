import { useCallback, useEffect, useState } from "react";
import api, { inr } from "@/lib/api";
import { PageHeader, StatCard, Card, Btn } from "@/components/UI";
import { Spinner } from "@/components/Layout";
import { Tag, FileText, IndianRupee, Package, Download, Wallet } from "lucide-react";
import { toast } from "sonner";

const todayStr = () => new Date().toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); };

const PRESETS = [
  { key: "today", label: "Today", range: () => ({ from: todayStr(), to: todayStr() }) },
  { key: "7d", label: "Last 7 days", range: () => ({ from: addDays(todayStr(), -6), to: todayStr() }) },
  { key: "30d", label: "Last 30 days", range: () => ({ from: addDays(todayStr(), -29), to: todayStr() }) },
  { key: "month", label: "This month", range: () => ({ from: monthStart(), to: todayStr() }) },
  { key: "all", label: "All time", range: () => ({ from: "", to: "" }) },
];

export default function Reports() {
  const [r, setR] = useState(null);
  const [wa, setWa] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [active, setActive] = useState("all");
  const [downloading, setDownloading] = useState(false);

  const load = useCallback((f, t) => {
    const params = {};
    if (f) params.from_date = f;
    if (t) params.to_date = t;
    api.get("/reports/summary", { params }).then(({ data }) => setR(data)).catch(() => {});
  }, []);

  useEffect(() => { load("", ""); api.get("/whatsapp/report").then(({ data }) => setWa(data)).catch(() => {}); }, [load]);

  const applyPreset = (p) => {
    const { from: f, to: t } = p.range();
    setFrom(f); setTo(t); setActive(p.key); load(f, t);
  };
  const applyCustom = () => { setActive("custom"); load(from, to); };

  const downloadCsv = async () => {
    setDownloading(true);
    try {
      const params = {};
      if (from) params.from_date = from;
      if (to) params.to_date = to;
      const res = await api.get("/reports/export", { params, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `report_${from || "all"}_to_${to || "all"}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    } catch { toast.error("Could not download CSV"); }
    setDownloading(false);
  };

  if (!r) return <Spinner />;

  const rangeLabel = from || to ? `${from || "start"} → ${to || "today"}` : "All time";

  return (
    <div>
      <PageHeader title="Reports" subtitle={`Business insights · ${rangeLabel}`}
        action={<Btn data-testid="download-csv-btn" onClick={downloadCsv} disabled={downloading}><Download className="h-4 w-4" />{downloading ? "Preparing…" : "Download CSV"}</Btn>} />

      {/* Filter bar */}
      <Card className="mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p.key} data-testid={`preset-${p.key}`} onClick={() => applyPreset(p)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${active === p.key ? "bg-brand-red text-white" : "border border-brand-taupe/30 text-brand-graphite hover:bg-brand-ivory"}`}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-xs text-brand-taupe">From</label>
              <input data-testid="from-date" type="date" value={from} max={to || todayStr()} onChange={(e) => setFrom(e.target.value)}
                className="rounded-lg border border-brand-taupe/30 px-3 py-1.5 text-sm focus:border-brand-red focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-brand-taupe">To</label>
              <input data-testid="to-date" type="date" value={to} min={from} max={todayStr()} onChange={(e) => setTo(e.target.value)}
                className="rounded-lg border border-brand-taupe/30 px-3 py-1.5 text-sm focus:border-brand-red focus:outline-none" />
            </div>
            <Btn data-testid="apply-range-btn" variant="outline" onClick={applyCustom} disabled={!from && !to}>Apply</Btn>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total Orders" value={r.total_orders} icon={Package} />
        <StatCard label="Revenue (orders)" value={inr(r.total_revenue)} icon={Wallet} accent="charcoal" />
        <StatCard label="Offer Discounts" value={inr(r.total_offer_discount)} icon={Tag} accent="gold" />
        <StatCard label="Invoice Paid" value={inr(r.invoice_paid)} icon={IndianRupee} accent="green" />
        <StatCard label="Invoice Pending" value={inr(r.invoice_pending)} icon={FileText} accent="red" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card><h3 className="mb-3 font-heading text-lg font-bold">Orders by Status</h3>{Object.keys(r.by_status).length === 0 ? <Empty /> : Object.entries(r.by_status).map(([k, v]) => <Bar key={k} l={k} v={v} max={r.total_orders} />)}</Card>
        <Card><h3 className="mb-3 font-heading text-lg font-bold">Orders by Dentist</h3>{Object.keys(r.by_dentist).length === 0 ? <Empty /> : Object.entries(r.by_dentist).map(([k, v]) => <Bar key={k} l={k} v={v} max={r.total_orders} />)}</Card>
        <Card><h3 className="mb-3 font-heading text-lg font-bold">WhatsApp Delivery</h3>{wa && Object.entries(wa.by_status).map(([k, v]) => <Bar key={k} l={k} v={v} max={wa.total} />)}</Card>
      </div>
    </div>
  );
}

function Empty() {
  return <p className="py-6 text-center text-sm text-brand-taupe">No data in this range.</p>;
}

function Bar({ l, v, max }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-sm"><span className="text-brand-graphite">{l}</span><span className="font-bold">{v}</span></div>
      <div className="mt-1 h-2 rounded-full bg-brand-ivory"><div className="h-2 rounded-full bg-brand-red" style={{ width: `${max ? (v / max) * 100 : 0}%` }} /></div>
    </div>
  );
}
