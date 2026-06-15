import { useEffect, useState, useRef } from "react";
import api, { formatApiError } from "@/lib/api";
import { PageHeader, Card, Btn, Field, inputCls } from "@/components/UI";
import { Spinner } from "@/components/Layout";
import { toast } from "sonner";
import StatusMaster from "@/pages/admin/StatusMaster";
import { Upload } from "lucide-react";

const TABS = ["Lab", "GST", "Statuses", "Razorpay", "WhatsApp"];

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

      {tab === "Lab" && <LabSection lab={s.lab || {}} onSave={(v) => save("lab", v)} />}

      {tab === "GST" && (
        <Card className="max-w-lg space-y-3">
          <label className="flex items-center gap-2"><input type="checkbox" defaultChecked={s.gst?.enabled} onChange={(e) => save("gst", { ...s.gst, enabled: e.target.checked })} /> GST enabled globally</label>
          <Field label="Default GST rate %"><input type="number" className={inputCls} defaultValue={s.gst?.rate} onBlur={(e) => save("gst", { ...s.gst, rate: Number(e.target.value) })} /></Field>
          <p className="text-xs text-brand-taupe">CGST+SGST applied for Gujarat (intra-state), IGST for inter-state.</p>
        </Card>
      )}

      {tab === "Statuses" && <StatusMaster />}

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
            {[["api_base_url", "API Base URL"], ["vendor_uid", "Vendor UID"], ["api_token", "API Token"], ["from_phone_number_id", "From Phone Number ID"], ["template_name", "Template Name"], ["language_code", "Language Code"], ["image_header_url", "Image Header URL"]].map(([k, label]) => (
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

function LabSection({ lab, onSave }) {
  const [v, setV] = useState(lab);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const fields = [["name", "Lab Name"], ["gstin", "GSTIN"], ["address", "Address"], ["state", "State"], ["phone", "Phone"], ["email", "Email"]];

  const uploadLogo = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const { data } = await api.post("/settings/logo", fd);
      setV((prev) => ({ ...prev, logo_url: data.logo_url }));
      toast.success("Logo uploaded & saved");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Card className="max-w-2xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-brand-taupe/20 bg-brand-ivory">
          {v.logo_url
            ? <img src={v.logo_url} alt="Lab logo" className="h-full w-full object-contain" data-testid="logo-preview" />
            : <span className="text-xs text-brand-taupe">No logo</span>}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-brand-graphite">Lab Logo</p>
          <p className="mb-2 text-xs text-brand-taupe">Upload a PNG/JPG/WEBP/SVG (max 5 MB) or paste an image URL below.</p>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-brand-ruby">
            <Upload className="h-4 w-4" />{uploading ? "Uploading…" : "Upload logo"}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" data-testid="logo-upload-input" disabled={uploading} onChange={uploadLogo} />
          </label>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map(([k, label]) => <Field key={k} label={label}><input className={inputCls} value={v[k] || ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></Field>)}
        <Field label="Logo URL"><input data-testid="logo-url-input" className={inputCls} value={v.logo_url || ""} onChange={(e) => setV({ ...v, logo_url: e.target.value })} /></Field>
      </div>
      <Btn className="mt-3" data-testid="save-lab-btn" onClick={() => onSave(v)}>Save</Btn>
    </Card>
  );
}
