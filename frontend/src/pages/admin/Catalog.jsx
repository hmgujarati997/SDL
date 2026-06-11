import { useEffect, useState } from "react";
import api, { inr, formatApiError } from "@/lib/api";
import { PageHeader, Card, Btn, inputCls } from "@/components/UI";
import { Spinner } from "@/components/Layout";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export default function Catalog() {
  const [products, setProducts] = useState(null);
  const load = () => api.get("/products").then(({ data }) => setProducts(data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const saveTier = async (t) => { try { await api.put(`/tiers/${t.id}`, t); toast.success("Tier updated"); load(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } };
  const addTier = async (pid) => {
    const name = prompt("Tier name?"); if (!name) return;
    const rate = Number(prompt("Rate per unit (₹)?") || 0);
    try { await api.post("/tiers", { product_id: pid, name, rate_per_unit: rate }); toast.success("Tier added"); load(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const addProduct = async () => {
    const name = prompt("Product name?"); if (!name) return;
    try { await api.post("/products", { name, category: "Misc", unit_type: "per tooth", default_tat: 4 }); toast.success("Product added"); load(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const removeProduct = async (p) => {
    if (!window.confirm(`Remove "${p.name}" and all its tiers? This cannot be undone.`)) return;
    try { await api.delete(`/products/${p.id}`); toast.success("Product removed"); load(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const removeTier = async (t) => {
    if (!window.confirm(`Remove tier "${t.name}"?`)) return;
    try { await api.delete(`/tiers/${t.id}`); toast.success("Tier removed"); load(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  if (!products) return <Spinner />;
  return (
    <div>
      <PageHeader title="Pricing Master" subtitle="Products, quality tiers & rates"
        action={<Btn data-testid="add-product-btn" onClick={addProduct}><Plus className="h-4 w-4" />Add Product</Btn>} />
      <div className="space-y-4">
        {products.map((p) => (
          <Card key={p.id}>
            <div className="flex items-center justify-between">
              <div><h3 className="font-heading text-lg font-bold">{p.name}</h3><p className="text-xs text-brand-taupe">{p.category} · {p.unit_type} · TAT {p.default_tat}d</p></div>
              <div className="flex items-center gap-2">
                <Btn variant="outline" onClick={() => addTier(p.id)}><Plus className="h-4 w-4" />Tier</Btn>
                <Btn variant="ghost" data-testid={`remove-product-${p.id}`} onClick={() => removeProduct(p)}><Trash2 className="h-4 w-4" />Remove</Btn>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {p.tiers.map((t) => <TierRow key={t.id} tier={t} onSave={saveTier} onRemove={removeTier} />)}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TierRow({ tier, onSave, onRemove }) {
  const [t, setT] = useState(tier);
  return (
    <div className="grid grid-cols-2 items-end gap-2 rounded-xl border border-brand-taupe/15 p-3 sm:grid-cols-6">
      <div><label className="text-xs text-brand-taupe">Tier</label><input className={inputCls} value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} /></div>
      <div><label className="text-xs text-brand-taupe">Rate ₹</label><input type="number" className={inputCls} value={t.rate_per_unit} onChange={(e) => setT({ ...t, rate_per_unit: Number(e.target.value) })} /></div>
      <div><label className="text-xs text-brand-taupe">GST %</label><input type="number" className={inputCls} value={t.gst_rate} onChange={(e) => setT({ ...t, gst_rate: Number(e.target.value) })} /></div>
      <div><label className="text-xs text-brand-taupe">HSN</label><input className={inputCls} value={t.hsn || ""} onChange={(e) => setT({ ...t, hsn: e.target.value })} /></div>
      <div><label className="text-xs text-brand-taupe">TAT</label><input type="number" className={inputCls} value={t.tat_days} onChange={(e) => setT({ ...t, tat_days: Number(e.target.value) })} /></div>
      <div className="flex gap-2">
        <Btn className="flex-1" onClick={() => onSave(t)}>Save</Btn>
        <Btn variant="ghost" onClick={() => onRemove(t)}><Trash2 className="h-4 w-4" /></Btn>
      </div>
      <div className="col-span-2 sm:col-span-6 flex items-center gap-4">
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={t.most_popular} onChange={(e) => setT({ ...t, most_popular: e.target.checked })} /> Most popular</label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={t.active} onChange={(e) => setT({ ...t, active: e.target.checked })} /> Active</label>
        <input className={inputCls + " flex-1"} placeholder="Description shown to dentist" value={t.description || ""} onChange={(e) => setT({ ...t, description: e.target.value })} />
      </div>
    </div>
  );
}
