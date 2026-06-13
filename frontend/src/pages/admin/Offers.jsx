import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { PageHeader, Card, Btn, inputCls } from "@/components/UI";
import { Spinner } from "@/components/Layout";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";

export default function Offers() {
  const [offers, setOffers] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [enabled, setEnabled] = useState(true);

  const load = () => api.get("/offers").then(({ data }) => setOffers(data)).catch(() => {});
  useEffect(() => {
    load();
    api.get("/products").then(({ data }) => { const t = []; data.forEach((p) => p.tiers.forEach((x) => t.push({ ...x, product_name: p.name }))); setTiers(t); });
    api.get("/settings").then(({ data }) => setEnabled(data.offers_enabled !== false));
  }, []);

  const toggleGlobal = async (v) => { setEnabled(v); await api.put("/settings/offers_enabled", { value: v }); toast.success(`Offers ${v ? "enabled" : "disabled"} globally`); };
  const save = async (o) => { try { await api.put(`/offers/${o.id}`, o); toast.success("Offer saved"); load(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } };

  if (!offers) return <Spinner />;
  return (
    <div>
      <PageHeader title="Offers Engine" subtitle="Tier-wise quantity slab discounts"
        action={<label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={enabled} onChange={(e) => toggleGlobal(e.target.checked)} /> Offers Enabled</label>} />
      <div className="space-y-4">
        {offers.map((o) => <OfferCard key={o.id} offer={o} tiers={tiers} onSave={save} />)}
      </div>
    </div>
  );
}

function OfferCard({ offer, tiers, onSave }) {
  const [o, setO] = useState(offer);
  const [editName, setEditName] = useState(false);
  const [nameDraft, setNameDraft] = useState(offer.name);
  const setSlab = (i, k, v) => setO({ ...o, slabs: o.slabs.map((s, j) => (j === i ? { ...s, [k]: Number(v) } : s)) });
  const addSlab = () => setO({ ...o, slabs: [...o.slabs, { min_units: 0, discount: 0 }] });
  const delSlab = (i) => setO({ ...o, slabs: o.slabs.filter((_, j) => j !== i) });
  const toggleTier = (id) => setO({ ...o, tier_ids: (o.tier_ids || []).includes(id) ? o.tier_ids.filter((x) => x !== id) : [...(o.tier_ids || []), id] });
  const commitName = () => {
    const v = nameDraft.trim();
    if (!v) { setNameDraft(o.name); setEditName(false); return; }
    setO({ ...o, name: v });
    setEditName(false);
  };

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        {editName ? (
          <div className="flex flex-1 items-center gap-2">
            <input data-testid={`offer-name-input-${o.id}`} autoFocus className={inputCls + " font-heading text-lg font-bold"}
              value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setNameDraft(o.name); setEditName(false); } }} />
            <Btn data-testid={`offer-name-confirm-${o.id}`} className="px-3" onClick={commitName}><Check className="h-4 w-4" /></Btn>
            <Btn variant="ghost" className="px-2" onClick={() => { setNameDraft(o.name); setEditName(false); }}><X className="h-4 w-4" /></Btn>
          </div>
        ) : (
          <button data-testid={`offer-name-edit-${o.id}`} onClick={() => { setNameDraft(o.name); setEditName(true); }} className="group flex items-center gap-2 text-left">
            <h3 className="font-heading text-lg font-bold text-brand-graphite">{o.name}</h3>
            <Pencil className="h-3.5 w-3.5 text-brand-taupe opacity-60 transition group-hover:text-brand-red group-hover:opacity-100" />
          </button>
        )}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={o.active} onChange={(e) => setO({ ...o, active: e.target.checked })} /> Active</label>
      </div>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-brand-taupe">Applicable Tiers</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {tiers.filter((t) => t.rate_per_unit > 0).map((t) => (
          <button key={t.id} onClick={() => toggleTier(t.id)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${(o.tier_ids || []).includes(t.id) ? "border-brand-red bg-brand-red text-white" : "border-brand-taupe/30 text-brand-graphite"}`}>
            {t.product_name}·{t.name}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-brand-taupe">Slabs (highest qualifying applies to all units)</p>
      <div className="mt-1 space-y-2">
        {o.slabs.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-sm text-brand-taupe">Min units</span>
            <input type="number" className="w-20 rounded-lg border border-brand-taupe/30 px-2 py-1.5 text-sm" value={s.min_units} onChange={(e) => setSlab(i, "min_units", e.target.value)} />
            <span className="text-sm text-brand-taupe">Discount %</span>
            <input type="number" className="w-20 rounded-lg border border-brand-taupe/30 px-2 py-1.5 text-sm" value={s.discount} onChange={(e) => setSlab(i, "discount", e.target.value)} />
            <button onClick={() => delSlab(i)} className="text-brand-red"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Btn variant="outline" onClick={addSlab}><Plus className="h-4 w-4" />Slab</Btn>
        <Btn onClick={() => onSave(o)}>Save Offer</Btn>
      </div>
    </Card>
  );
}
