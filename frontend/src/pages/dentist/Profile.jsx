import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Card, Btn, Field, inputCls } from "@/components/UI";
import { toast } from "sonner";

const FIELDS = [
  ["name", "Dentist Name", true], ["clinic_name", "Clinic Name", true],
  ["mobile", "Login Mobile", true], ["whatsapp", "WhatsApp Number", true],
  ["email", "Email", true], ["billing_address", "Billing Address", true],
  ["city", "City", true], ["state", "State", true], ["pincode", "Pincode", true],
  ["gst_number", "GST Number", false], ["pan_number", "PAN Number", false],
  ["alt_contact_name", "Alt. Contact Person", false], ["alt_contact_number", "Alt. Contact Number", false],
];

export default function Profile() {
  const { refresh } = useAuth();
  const [f, setF] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sameAsBilling, setSameAsBilling] = useState(false);

  useEffect(() => {
    api.get("/profile").then(({ data }) => {
      const d = data || {};
      setF(d);
      setSameAsBilling(!!d.delivery_address && d.delivery_address === d.billing_address);
    }).catch(() => {});
  }, []);

  // Keep delivery address mirrored to billing while the checkbox is on.
  useEffect(() => {
    if (sameAsBilling && f) setF((p) => ({ ...p, delivery_address: p.billing_address || "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sameAsBilling, f?.billing_address]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = sameAsBilling ? { ...f, delivery_address: f.billing_address || "" } : f;
      const { data } = await api.put("/profile", payload);
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

        <div className="mt-6 border-t border-brand-taupe/15 pt-5">
          <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm font-medium text-brand-graphite">
            <input type="checkbox" data-testid="delivery-same-as-billing" className="h-4 w-4 accent-brand-red"
              checked={sameAsBilling} onChange={(e) => setSameAsBilling(e.target.checked)} />
            Delivery address same as billing address
          </label>
          <div className="max-w-xl">
            <Field label="Delivery Address">
              <input data-testid="profile-delivery_address" className={inputCls}
                value={sameAsBilling ? (f.billing_address || "") : (f.delivery_address || "")}
                disabled={sameAsBilling}
                placeholder="Where finished cases should be delivered"
                onChange={(e) => setF({ ...f, delivery_address: e.target.value })} />
            </Field>
            <p className="mt-1 text-xs text-brand-taupe">Finished cases are always shipped to this address.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
