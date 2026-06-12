import { useEffect, useState } from "react";
import api, { fmtDate, formatApiError } from "@/lib/api";
import { PageHeader, Card, Btn } from "@/components/UI";
import { Spinner } from "@/components/Layout";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

export default function Dentists() {
  const [list, setList] = useState(null);
  const [q, setQ] = useState("");
  const [tiers, setTiers] = useState([]);
  const [openId, setOpenId] = useState(null);

  useEffect(() => { api.get("/dentists").then(({ data }) => setList(data)).catch(() => {}); }, []);
  useEffect(() => { api.get("/products").then(({ data }) => { const t = []; data.forEach((p) => p.tiers.forEach((x) => t.push({ ...x, product_name: p.name }))); setTiers(t); }); }, []);

  if (!list) return <Spinner />;

  const term = q.trim().toLowerCase();
  const filtered = term
    ? list.filter((d) => [d.name, d.clinic_name, d.email, d.mobile, d.city].some((v) => (v || "").toLowerCase().includes(term)))
    : list;

  return (
    <div>
      <PageHeader title="Dentists" subtitle={`${list.length} registered ${list.length === 1 ? "clinic" : "clinics"}`}
        action={
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-taupe" />
            <input data-testid="dentist-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, clinic, city…"
              className="w-full rounded-lg border border-brand-taupe/30 py-2 pl-9 pr-3 text-sm focus:border-brand-red focus:outline-none" />
          </div>
        } />

      <div className="space-y-3">
        {filtered.length === 0 && <p className="py-12 text-center text-sm text-brand-taupe">No dentists found.</p>}
        {filtered.map((d) => (
          <Card key={d.id} data-testid={`dentist-card-${d.id}`}>
            <button onClick={() => setOpenId(openId === d.id ? null : d.id)}
              data-testid={`dentist-toggle-${d.id}`}
              className="flex w-full flex-col gap-2 text-left sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-heading text-lg font-bold text-brand-graphite">{d.name}</p>
                <p className="text-sm text-brand-taupe">{d.clinic_name || "—"} · {d.city || "—"}{d.state ? `, ${d.state}` : ""} · {d.mobile}</p>
                <p className="text-xs text-brand-taupe">{d.billing_complete ? "Billing complete" : "Billing incomplete"} · Joined {fmtDate(d.created_at)}</p>
              </div>
              <span className="flex items-center gap-1 self-start text-sm font-semibold text-brand-red sm:self-auto">
                {openId === d.id ? <>Hide details <ChevronUp className="h-4 w-4" /></> : <>View details <ChevronDown className="h-4 w-4" /></>}
              </span>
            </button>
            {openId === d.id && <DentistDetail dentist={d} tiers={tiers} />}
          </Card>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-taupe">{label}</p>
      <p className="text-sm text-brand-graphite">{value || "—"}</p>
    </div>
  );
}

function DentistDetail({ dentist, tiers }) {
  const d = dentist;
  return (
    <div className="mt-4 space-y-5 border-t border-brand-taupe/15 pt-4">
      <div>
        <p className="mb-2 text-sm font-semibold text-brand-graphite">Contact & Clinic</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Full Name" value={d.name} />
          <Field label="Clinic Name" value={d.clinic_name} />
          <Field label="Email" value={d.email} />
          <Field label="Mobile" value={d.mobile} />
          <Field label="WhatsApp" value={d.whatsapp} />
          <Field label="Alt Contact" value={d.alt_contact_name ? `${d.alt_contact_name} · ${d.alt_contact_number || ""}` : ""} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-brand-graphite">Billing & Address</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Billing Address" value={d.billing_address} />
          <Field label="Clinic Address" value={d.clinic_address} />
          <Field label="Delivery Address" value={d.delivery_address} />
          <Field label="City" value={d.city} />
          <Field label="State" value={d.state} />
          <Field label="Pincode" value={d.pincode} />
          <Field label="GST Number" value={d.gst_number} />
          <Field label="PAN Number" value={d.pan_number} />
          <Field label="Billing Status" value={d.billing_complete ? "Complete" : "Incomplete"} />
        </div>
      </div>

      <PricingEditor dentistId={d.id} tiers={tiers} />
    </div>
  );
}

function PricingEditor({ dentistId, tiers }) {
  const [rates, setRates] = useState({});
  useEffect(() => { api.get(`/dentist-pricing/${dentistId}`).then(({ data }) => setRates(data)).catch(() => {}); }, [dentistId]);
  const save = async () => { try { await api.put(`/dentist-pricing/${dentistId}`, rates); toast.success("Pricing saved"); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } };
  return (
    <div className="rounded-xl border border-brand-taupe/20 p-4">
      <p className="mb-2 text-sm font-semibold text-brand-graphite">Dentist-specific rates (blank = default)</p>
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
