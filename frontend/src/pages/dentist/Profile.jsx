import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Card, Btn, Field, inputCls } from "@/components/UI";
import { toast } from "sonner";

const FIELDS = [
  ["name", "Dentist Name", true], ["clinic_name", "Clinic Name", true],
  ["mobile", "Login Mobile", true], ["whatsapp", "WhatsApp Number", true],
  ["email", "Email", true], ["billing_address", "Billing Address", true],
  ["clinic_address", "Clinic Address", false], ["city", "City", true],
  ["state", "State", true], ["pincode", "Pincode", true],
  ["gst_number", "GST Number", false], ["pan_number", "PAN Number", false],
  ["delivery_address", "Delivery Address", false],
  ["alt_contact_name", "Alt. Contact Person", false], ["alt_contact_number", "Alt. Contact Number", false],
];

export default function Profile() {
  const { refresh } = useAuth();
  const [f, setF] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get("/profile").then(({ data }) => setF(data || {})).catch(() => {}); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/profile", f);
      setF(data);
      await refresh();
      toast.success(data.billing_complete ? "Profile saved — you're ready to order!" : "Saved. Some required fields are still missing.");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  if (!f) return null;
  return (
    <div>
      <PageHeader title="Billing Profile" subtitle="Required for GST invoices and paid orders."
        action={<Btn data-testid="save-profile-btn" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Profile"}</Btn>} />
      <Card>
        {f.billing_complete ? (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">Billing profile complete ✓</div>
        ) : (
          <div className="mb-5 rounded-lg border border-brand-gold/40 bg-brand-gold/10 px-4 py-2 text-sm text-brand-graphite">Complete all required (*) fields to enable paid orders.</div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FIELDS.map(([k, label, req]) => (
            <Field key={k} label={label} required={req}>
              <input data-testid={`profile-${k}`} className={inputCls} value={f[k] || ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
            </Field>
          ))}
        </div>
      </Card>
    </div>
  );
}
