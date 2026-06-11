import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { PageHeader, Card, Btn, Field, inputCls } from "@/components/UI";
import { Spinner } from "@/components/Layout";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";

export default function Patients() {
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", age: "", gender: "", phone: "", patient_code: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const load = () => api.get("/patients").then(({ data }) => setList(data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const create = async (force = false) => {
    setSaving(true);
    try {
      const { data } = await api.post("/patients", { ...f, age: f.age ? Number(f.age) : null, force });
      if (data.duplicate) {
        if (window.confirm(data.message + " Create anyway?")) return create(true);
        return;
      }
      toast.success("Patient added");
      setOpen(false); setF({ name: "", age: "", gender: "", phone: "", patient_code: "", notes: "" });
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  if (!list) return <Spinner />;
  return (
    <div>
      <PageHeader title="Patients" subtitle="Manage your patient records."
        action={<Btn data-testid="add-patient-btn" onClick={() => setOpen(true)}><UserPlus className="h-4 w-4" />Add Patient</Btn>} />
      {list.length === 0 ? (
        <Card><p className="py-10 text-center text-brand-taupe">No patients yet. Add your first patient.</p></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <Card key={p.id} data-testid={`patient-card-${p.id}`} className="card-hover">
              <p className="font-heading text-lg font-bold">{p.name}</p>
              <p className="text-sm text-brand-taupe">{p.gender || "—"} · {p.age ? `${p.age} yrs` : "Age N/A"}</p>
              {p.patient_code && <p className="mt-1 text-xs text-brand-taupe">Code: {p.patient_code}</p>}
              {p.notes && <p className="mt-2 text-sm text-brand-graphite">{p.notes}</p>}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white">
          <DialogHeader><DialogTitle className="font-heading">Add Patient</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" required><input data-testid="patient-name" className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Age"><input data-testid="patient-age" type="number" className={inputCls} value={f.age} onChange={(e) => setF({ ...f, age: e.target.value })} /></Field>
            <Field label="Gender">
              <select className={inputCls} value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}>
                <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
              </select>
            </Field>
            <Field label="Phone"><input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
            <Field label="Patient Code"><input className={inputCls} value={f.patient_code} onChange={(e) => setF({ ...f, patient_code: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Case Notes"><textarea className={inputCls} rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field></div>
          </div>
          <Btn data-testid="save-patient-btn" onClick={() => create(false)} disabled={saving || !f.name}>{saving ? "Saving..." : "Save Patient"}</Btn>
        </DialogContent>
      </Dialog>
    </div>
  );
}
