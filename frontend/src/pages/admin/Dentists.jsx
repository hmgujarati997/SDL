import { useEffect, useState } from "react";
import api, { fmtDate, formatApiError } from "@/lib/api";
import { PageHeader, Card, Btn, inputCls } from "@/components/UI";
import { Spinner } from "@/components/Layout";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function Dentists() {
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState("");
  const [tiers, setTiers] = useState([]);
  const [openId, setOpenId] = useState(null);

  const load = () => api.get("/dentists", { params: filter ? { status: filter } : {} }).then(({ data }) => setList(data)).catch(() => {});
  useEffect(() => { load(); }, [filter]);
  useEffect(() => { api.get("/products").then(({ data }) => { const t = []; data.forEach((p) => p.tiers.forEach((x) => t.push({ ...x, product_name: p.name }))); setTiers(t); }); }, []);

  const setStatus = async (id, status) => { try { await api.post(`/dentists/${id}/status`, { status }); toast.success(`Marked ${status}`); load(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } };

  if (!list) return <Spinner />;
  const sc = { approved: "bg-green-100 text-green-700", pending: "bg-amber-100 text-amber-800", rejected: "bg-brand-red/10 text-brand-red", deactivated: "bg-gray-200 text-gray-600" };
  return (
    <div>
      <PageHeader title="Dentists" subtitle="Approve, manage and price your clinics"
        action={<select className={inputCls + " w-44"} value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">All</option><option>pending</option><option>approved</option><option>rejected</option><option>deactivated</option></select>} />
      <div className="space-y-3">
        {list.map((d) => (
          <Card key={d.id} data-testid={`dentist-card-${d.id}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-heading text-lg font-bold">{d.name} <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${sc[d.status]}`}>{d.status}</span></p>
                <p className="text-sm text-brand-taupe">{d.clinic_name} · {d.city || "—"}, {d.state || ""} · {d.mobile}</p>
                <p className="text-xs text-brand-taupe">{d.billing_complete ? "Billing complete" : "Billing incomplete"} · Joined {fmtDate(d.created_at)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {d.status !== "approved" && <Btn data-testid={`approve-${d.id}`} onClick={() => setStatus(d.id, "approved")}>Approve</Btn>}
                {d.status === "pending" && <Btn variant="outline" onClick={() => setStatus(d.id, "rejected")}>Reject</Btn>}
                {d.status === "approved" && <Btn variant="outline" onClick={() => setStatus(d.id, "deactivated")}>Deactivate</Btn>}
                <Btn variant="ghost" onClick={() => setOpenId(openId === d.id ? null : d.id)}>Pricing {openId === d.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Btn>
              </div>
            </div>
            {openId === d.id && <PricingEditor dentistId={d.id} tiers={tiers} />}
          </Card>
        ))}
      </div>
    </div>
  );
}

function PricingEditor({ dentistId, tiers }) {
  const [rates, setRates] = useState({});
  useEffect(() => { api.get(`/dentist-pricing/${dentistId}`).then(({ data }) => setRates(data)).catch(() => {}); }, [dentistId]);
  const save = async () => { try { await api.put(`/dentist-pricing/${dentistId}`, rates); toast.success("Pricing saved"); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } };
  return (
    <div className="mt-4 rounded-xl border border-brand-taupe/20 p-4">
      <p className="mb-2 text-sm font-semibold">Dentist-specific rates (blank = default)</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {tiers.filter((t) => t.rate_per_unit > 0).map((t) => (
          <div key={t.id} className="flex items-center gap-2">
            <span className="flex-1 text-sm">{t.product_name} · {t.name} <span className="text-brand-taupe">(₹{t.rate_per_unit})</span></span>
            <input type="number" className="w-28 rounded-lg border border-brand-taupe/30 px-2 py-1.5 text-sm" placeholder={t.rate_per_unit} value={rates[t.id] || ""} onChange={(e) => setRates({ ...rates, [t.id]: e.target.value })} />
          </div>
        ))}
      </div>
      <Btn className="mt-3" onClick={save}>Save Pricing</Btn>
    </div>
  );
}
