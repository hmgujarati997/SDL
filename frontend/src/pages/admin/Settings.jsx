import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { PageHeader, Card, Btn, Field, inputCls } from "@/components/UI";
import { Spinner } from "@/components/Layout";
import { toast } from "sonner";

const TABS = ["Lab", "GST", "Razorpay", "WhatsApp"];

export default function Settings() {
  const [s, setS] = useState(null);
  const [tab, setTab] = useState("Lab");
  useEffect(() => { api.get("/settings").then(({ data }) => setS(data)).catch(() => {}); }, []);
  const save = async (key, value) => { try { await api.put(`/settings/${key}`, { value }); toast.success("Saved"); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } };
  if (!s) return <Spinner />;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Configure lab, payments & messaging" />
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === t ? "bg-brand-red text-white" : "bg-white text-brand-graphite border border-brand-taupe/20"}`}>{t}</button>)}
      </div>

      {tab === "Lab" && <Section obj={s.lab || {}} fields={[["name", "Lab Name"], ["gstin", "GSTIN"], ["address", "Address"], ["state", "State"], ["phone", "Phone"], ["email", "Email"], ["logo_url", "Logo URL"]]} onSave={(v) => save("lab", v)} />}

      {tab === "GST" && (
        <Card className="max-w-lg space-y-3">
          <label className="flex items-center gap-2"><input type="checkbox" defaultChecked={s.gst?.enabled} onChange={(e) => save("gst", { ...s.gst, enabled: e.target.checked })} /> GST enabled globally</label>
          <Field label="Default GST rate %"><input type="number" className={inputCls} defaultValue={s.gst?.rate} onBlur={(e) => save("gst", { ...s.gst, rate: Number(e.target.value) })} /></Field>
          <p className="text-xs text-brand-taupe">CGST+SGST applied for Gujarat (intra-state), IGST for inter-state.</p>
        </Card>
      )}

      {tab === "Razorpay" && (
        <Card className="max-w-lg space-y-3">
          <label className="flex items-center gap-2"><input data-testid="razorpay-enabled" type="checkbox" defaultChecked={s.razorpay?.enabled} onChange={(e) => setS({ ...s, razorpay: { ...s.razorpay, enabled: e.target.checked } })} /> Enable online payments</label>
          <Field label="Key ID"><input data-testid="razorpay-key" className={inputCls} defaultValue={s.razorpay?.key_id} onChange={(e) => setS({ ...s, razorpay: { ...s.razorpay, key_id: e.target.value } })} /></Field>
          <Field label="Key Secret"><input className={inputCls} type="password" defaultValue={s.razorpay?.key_secret} onChange={(e) => setS({ ...s, razorpay: { ...s.razorpay, key_secret: e.target.value } })} /></Field>
          <p className="rounded-lg bg-brand-gold/10 p-2 text-xs text-brand-graphite">When disabled or unconfigured, payments run in mock mode for testing.</p>
          <Btn onClick={() => save("razorpay", s.razorpay)}>Save Razorpay</Btn>
        </Card>
      )}

      {tab === "WhatsApp" && (
        <Card className="max-w-2xl space-y-3">
          <label className="flex items-center gap-2"><input data-testid="whatsapp-enabled" type="checkbox" defaultChecked={s.whatsapp?.enabled} onChange={(e) => setS({ ...s, whatsapp: { ...s.whatsapp, enabled: e.target.checked } })} /> Enable WhatsApp notifications</label>
          <div className="grid gap-3 sm:grid-cols-2">
            {[["api_base_url", "API Base URL"], ["vendor_uid", "Vendor UID"], ["api_token", "API Token"], ["from_phone_number_id", "From Phone Number ID"], ["template_name", "Template Name"], ["language_code", "Language Code"], ["image_header_url", "Image Header URL"], ["learn_more_base_url", "Learn More Base URL"]].map(([k, label]) => (
              <Field key={k} label={label}><input className={inputCls} defaultValue={s.whatsapp?.[k]} onChange={(e) => setS({ ...s, whatsapp: { ...s.whatsapp, [k]: e.target.value } })} /></Field>
            ))}
          </div>
          <p className="text-xs text-brand-taupe">Webhook endpoint: <code>/api/whatsapp/webhook</code> · Mock mode active when disabled or missing credentials.</p>
          <Btn data-testid="save-whatsapp-btn" onClick={() => save("whatsapp", s.whatsapp)}>Save WhatsApp</Btn>
        </Card>
      )}
    </div>
  );
}

function Section({ obj, fields, onSave }) {
  const [v, setV] = useState(obj);
  return (
    <Card className="max-w-2xl">
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map(([k, label]) => <Field key={k} label={label}><input className={inputCls} value={v[k] || ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></Field>)}
      </div>
      <Btn className="mt-3" onClick={() => onSave(v)}>Save</Btn>
    </Card>
  );
}
