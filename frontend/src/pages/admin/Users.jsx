import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { PageHeader, Card, Btn, Field, inputCls } from "@/components/UI";
import { Spinner } from "@/components/Layout";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";

export default function Users() {
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", email: "", mobile: "", role: "employee", password: "", permissions: [] });

  const load = () => api.get("/users").then(({ data }) => setList(data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const create = async () => {
    try { await api.post("/users", { ...f, permissions: f.role === "employee" ? ["update_status"] : [] }); toast.success("Team member created"); setOpen(false); setF({ name: "", email: "", mobile: "", role: "employee", password: "", permissions: [] }); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const toggleActive = async (u) => { await api.put(`/users/${u.id}`, { active: !u.active }); load(); };

  if (!list) return <Spinner />;
  return (
    <div>
      <PageHeader title="Team" subtitle="Admins, employees & designers"
        action={<Btn data-testid="add-user-btn" onClick={() => setOpen(true)}><UserPlus className="h-4 w-4" />Add Member</Btn>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((u) => (
          <Card key={u.id}>
            <div className="flex items-center justify-between">
              <div><p className="font-heading text-lg font-bold">{u.name}</p><p className="text-sm text-brand-taupe">{u.email}</p></div>
              <span className="rounded-full bg-brand-charcoal px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-brand-gold">{u.role}</span>
            </div>
            <button onClick={() => toggleActive(u)} className={`mt-3 rounded-full px-3 py-1 text-xs font-semibold ${u.active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>{u.active ? "Active" : "Inactive"}</button>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white">
          <DialogHeader><DialogTitle className="font-heading">Add Team Member</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Field label="Name" required><input data-testid="user-name" className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Email" required><input data-testid="user-email" type="email" className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            <Field label="Mobile"><input className={inputCls} value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} /></Field>
            <Field label="Role"><select data-testid="user-role" className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="employee">Employee / Production</option><option value="designer">Designer</option><option value="admin">Admin</option></select></Field>
            <Field label="Password" required><input data-testid="user-password" type="text" className={inputCls} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
          </div>
          <Btn data-testid="save-user-btn" onClick={create} disabled={!f.name || !f.email || !f.password}>Create</Btn>
        </DialogContent>
      </Dialog>
    </div>
  );
}
