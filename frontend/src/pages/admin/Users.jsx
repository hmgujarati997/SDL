import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Card, Btn, Field, inputCls } from "@/components/UI";
import { Spinner } from "@/components/Layout";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus, Pencil, Trash2, KeyRound, AlertTriangle, X } from "lucide-react";

const ROLE_BADGE = {
  admin: "bg-brand-red text-white",
  employee: "bg-brand-charcoal text-brand-gold",
  designer: "bg-brand-gold text-brand-charcoal",
};

const EMPTY = { name: "", email: "", mobile: "", role: "employee", password: "", permissions: [], active: true };

export default function Users() {
  const { user: me } = useAuth();
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = create mode
  const [f, setF] = useState(EMPTY);
  const [confirmDel, setConfirmDel] = useState(null);

  const load = () => api.get("/users").then(({ data }) => setList(data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setF(EMPTY); setOpen(true); };
  const openEdit = (u) => {
    setEditing(u);
    setF({ name: u.name || "", email: u.email || "", mobile: u.mobile || "", role: u.role, password: "", permissions: u.permissions || [], active: u.active });
    setOpen(true);
  };

  const canUpdateStatus = (f.permissions || []).includes("update_status");
  const setCanUpdateStatus = (on) => setF({ ...f, permissions: on ? ["update_status"] : [] });

  const save = async () => {
    try {
      if (editing) {
        const payload = { name: f.name, mobile: f.mobile, role: f.role, active: f.active,
          permissions: f.role === "employee" ? f.permissions : [] };
        if (f.password.trim()) payload.password = f.password.trim();
        await api.put(`/users/${editing.id}`, payload);
        toast.success("Team member updated");
      } else {
        await api.post("/users", { ...f, permissions: f.role === "employee" ? (f.permissions.length ? f.permissions : ["update_status"]) : [] });
        toast.success("Team member created");
      }
      setOpen(false); setF(EMPTY); setEditing(null); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const toggleActive = async (u) => {
    try { await api.put(`/users/${u.id}`, { active: !u.active }); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const doDelete = async () => {
    try { await api.delete(`/users/${confirmDel.id}`); toast.success(`${confirmDel.name} removed`); setConfirmDel(null); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  if (!list) return <Spinner />;

  return (
    <div>
      <PageHeader title="Team" subtitle="Manage admins, production staff & designers"
        action={<Btn data-testid="add-user-btn" onClick={openCreate}><UserPlus className="h-4 w-4" />Add Member</Btn>} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((u) => (
          <Card key={u.id} data-testid={`user-card-${u.id}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-heading text-lg font-bold text-brand-graphite">{u.name}{u.id === me?.id && <span className="ml-2 text-xs font-normal text-brand-taupe">(you)</span>}</p>
                <p className="text-sm text-brand-taupe">{u.email}</p>
                {u.mobile && <p className="text-xs text-brand-taupe">{u.mobile}</p>}
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${ROLE_BADGE[u.role] || "bg-brand-charcoal text-white"}`}>{u.role}</span>
            </div>
            {u.role === "employee" && (
              <p className="mt-2 text-xs text-brand-taupe">{(u.permissions || []).includes("update_status") ? "Can update order status" : "View only"}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button data-testid={`toggle-active-${u.id}`} onClick={() => toggleActive(u)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${u.active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
                {u.active ? "Active" : "Inactive"}
              </button>
              <Btn variant="outline" data-testid={`edit-user-${u.id}`} className="px-3 py-1.5 text-xs" onClick={() => openEdit(u)}><Pencil className="h-3.5 w-3.5" />Edit</Btn>
              {u.id !== me?.id && (
                <Btn variant="ghost" data-testid={`delete-user-${u.id}`} className="px-3 py-1.5 text-xs" onClick={() => setConfirmDel(u)}><Trash2 className="h-3.5 w-3.5" />Delete</Btn>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white">
          <DialogHeader><DialogTitle className="font-heading">{editing ? "Edit Team Member" : "Add Team Member"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Field label="Name" required><input data-testid="user-name" className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Email" required>
              <input data-testid="user-email" type="email" className={inputCls} value={f.email} disabled={!!editing}
                onChange={(e) => setF({ ...f, email: e.target.value })} />
              {editing && <p className="mt-1 text-xs text-brand-taupe">Email cannot be changed.</p>}
            </Field>
            <Field label="Mobile"><input className={inputCls} value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} /></Field>
            <Field label="Role">
              <select data-testid="user-role" className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
                <option value="employee">Employee / Production</option>
                <option value="designer">Designer</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            {f.role === "employee" && (
              <label className="flex items-center gap-2 text-sm text-brand-graphite">
                <input type="checkbox" data-testid="perm-update-status" checked={canUpdateStatus} onChange={(e) => setCanUpdateStatus(e.target.checked)} />
                Can update order status
              </label>
            )}
            <Field label={editing ? "Set new password (leave blank to keep current)" : "Password"} required={!editing}>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-taupe" />
                <input data-testid="user-password" type="text" className={inputCls + " pl-9"} placeholder={editing ? "••••••" : ""}
                  value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
              </div>
            </Field>
            {editing && (
              <label className="flex items-center gap-2 text-sm text-brand-graphite">
                <input type="checkbox" data-testid="user-active" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
                Account active
              </label>
            )}
          </div>
          <Btn data-testid="save-user-btn" onClick={save} disabled={!f.name || !f.email || (!editing && !f.password)}>
            {editing ? "Save changes" : "Create"}
          </Btn>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDel(null)} />
          <div data-testid="delete-user-dialog" className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <button onClick={() => setConfirmDel(null)} className="absolute right-4 top-4 text-brand-taupe hover:text-brand-graphite"><X className="h-5 w-5" /></button>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-red/10"><AlertTriangle className="h-5 w-5 text-brand-red" /></div>
            <h3 className="font-heading text-lg font-bold text-brand-graphite">Remove {confirmDel.name}?</h3>
            <p className="mt-1 text-sm text-brand-taupe">This deletes their login and access. This cannot be undone.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setConfirmDel(null)}>Cancel</Btn>
              <Btn data-testid="confirm-delete-user-btn" className="bg-brand-red text-white hover:bg-brand-ruby" onClick={doDelete}>Delete</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
