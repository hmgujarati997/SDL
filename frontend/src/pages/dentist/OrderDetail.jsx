import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api, { API, inr, fmtDate, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, Btn, Field, inputCls } from "@/components/UI";
import { Spinner } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import {
  Upload, Download, FileText, Truck, MessageSquare, History, CheckCircle2,
  AlertTriangle, UserCog, Printer, RotateCcw, Package, ChevronLeft, Trash2,
} from "lucide-react";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [o, setO] = useState(null);
  const [meta, setMeta] = useState({ statuses: [], file_issue_reasons: [], remake_reasons: [] });
  const [designers, setDesigners] = useState([]);
  const isStaff = ["admin", "employee", "designer"].includes(user?.role);
  const isAdmin = user?.role === "admin";

  const load = useCallback(() => api.get(`/orders/${id}`).then(({ data }) => setO(data)).catch(() => {}), [id]);
  useEffect(() => {
    load();
    api.get("/meta").then(({ data }) => setMeta(data)).catch(() => {});
    if (user?.role === "admin") api.get("/users?role=designer").then(({ data }) => setDesigners(data)).catch(() => {});
  }, [load]);

  const dl = (url) => window.open(`${API}${url}`, "_blank");

  const uploadFile = async (e, category) => {
    const f = e.target.files[0]; if (!f) return;
    const fd = new FormData(); fd.append("file", f); fd.append("level", "batch"); fd.append("category", category);
    try { await api.post(`/orders/${o.id}/files`, fd); toast.success("File uploaded"); load(); }
    catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
  };

  const act = async (fn, ok = "Done") => { try { await fn(); toast.success(ok); load(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } };

  if (!o) return <Spinner />;
  const p = o.pricing || {};

  return (
    <div>
      <Link to="/app/orders" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-taupe hover:text-brand-red"><ChevronLeft className="h-4 w-4" />Back to orders</Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold sm:text-3xl">{o.batch_no}</h1>
            {o.is_remake && <span className="rounded-full bg-brand-gold/15 px-2 py-0.5 text-xs font-bold text-[#8a6d2f]">REMAKE</span>}
          </div>
          <p className="mt-1 text-sm text-brand-taupe">{o.dentist_name} · {o.clinic_name} · {fmtDate(o.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={o.status} />
          {(o.amounts.status === "Paid" || o.amounts.paid >= o.amounts.total) && o.amounts.total > 0 && (
            <span className="inline-flex items-center rounded-full border border-green-200 bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">Paid</span>
          )}
          {o.amounts.status === "Free Remake" && (
            <span className="inline-flex items-center rounded-full border border-brand-gold/30 bg-brand-gold/15 px-2.5 py-0.5 text-xs font-semibold text-[#8a6d2f]">Free Remake</span>
          )}
        </div>
      </div>

      {o.file_issue && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-brand-red/30 bg-brand-red/5 p-4">
          <AlertTriangle className="h-5 w-5 text-brand-red" />
          <p className="text-sm text-brand-graphite">File issue: <b>{o.file_issue.reason}</b>. {o.file_issue.note} {user?.role === "dentist" && "Please upload corrected files below."}</p>
        </div>
      )}

      {isAdmin && o.design_submitted && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-green-300 bg-green-50 p-4" data-testid="design-submitted-banner">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <p className="text-sm text-brand-graphite">The designer has uploaded a design. Review the <b>design file</b> below — mark status <b>"Design Received"</b> if it's correct, or contact the designer to re-upload.</p>
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Timeline */}
          <Card>
            <h3 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold"><History className="h-5 w-5 text-brand-red" />Status Timeline</h3>
            <div className="space-y-3">
              {o.history.map((h, i) => (
                <div key={h.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`h-3 w-3 rounded-full ${i === o.history.length - 1 ? "bg-brand-red" : "bg-brand-gold"}`} />
                    {i < o.history.length - 1 && <span className="h-full w-px bg-brand-taupe/30" />}
                  </div>
                  <div className="pb-2">
                    <p className="text-sm font-semibold">{h.new}</p>
                    <p className="text-xs text-brand-taupe">{fmtDate(h.created_at)} · {h.user_name}{h.note ? ` · ${h.note}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
            {o.expected_delivery && <p className="mt-3 text-sm text-brand-graphite">Expected delivery: <b>{fmtDate(o.expected_delivery)}</b></p>}
          </Card>

          {/* Cases & items */}
          <Card>
            <h3 className="mb-3 font-heading text-lg font-bold">Patient Cases</h3>
            {o.cases.map((c) => (
              <div key={c.id} className="mb-3 rounded-xl border border-brand-taupe/20 p-4">
                <p className="font-heading font-bold">{c.patient_name} <span className="text-xs font-normal text-brand-taupe">· {c.case_input_type}</span></p>
                {o.items.filter((it) => it.case_id === c.id).map((it) => (
                  <div key={it.id} className="mt-2 rounded-lg bg-brand-ivory p-3 text-sm">
                    <p className="font-semibold">{it.product_name} — {it.tier_name} · {it.units} units{it.trial_required && " · Trial"}</p>
                    <p className="mt-1 text-brand-taupe">{it.teeth.map((t) => `${t.tooth}:${t.shade}`).join("  |  ")}</p>
                    {it.special_instructions && <p className="mt-1 text-xs text-brand-taupe">Note: {it.special_instructions}</p>}
                  </div>
                ))}
              </div>
            ))}
          </Card>

          {/* Price breakup */}
          <Card>
            <h3 className="mb-3 font-heading text-lg font-bold">Price Breakup</h3>
            {(p.tier_groups || []).map((g) => (
              <div key={g.tier_id} className="flex justify-between border-b border-brand-taupe/10 py-1.5 text-sm">
                <span>{g.tier_name} · {inr(g.per_unit)} × {g.units}</span>
                <span className="tabular">{inr(g.subtotal)}{g.offer_discount_amount > 0 && <span className="ml-2 text-[#8a6d2f]">−{inr(g.offer_discount_amount)}</span>}</span>
              </div>
            ))}
            <div className="mt-2 space-y-1 text-sm">
              <Row l="Subtotal" v={inr(p.subtotal)} />
              {p.total_discount > 0 && <Row l="Offer Discount" v={"−" + inr(p.total_discount)} gold />}
              {p.gst_enabled && <Row l="GST" v={inr(p.gst_total)} />}
              <div className="flex justify-between pt-1 font-bold"><span>Total</span><span className="text-brand-red">{inr(o.amounts.total)}</span></div>
              {o.amounts.total > 0 && o.amounts.status !== "Free Remake" && <Row l="Paid" v={inr(o.amounts.paid)} />}
            </div>
          </Card>

          {/* Files */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold">Files</h3>
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-brand-ruby">
                <Upload className="h-4 w-4" />Upload
                <input type="file" className="hidden" data-testid="detail-file-upload" onChange={(e) => uploadFile(e, user.role === "designer" ? "designer" : user.role === "dentist" ? "dentist" : "internal")} />
              </label>
            </div>
            {(() => {
              const isImg = (f) => f.category === "photo" || /\.(jpe?g|png|webp)$/i.test(f.filename || "");
              const imgs = o.files.filter(isImg);
              const docs = o.files.filter((f) => !isImg(f));
              if (o.files.length === 0) return <p className="py-4 text-center text-sm text-brand-taupe">No files uploaded.</p>;
              return (
                <>
                  {imgs.length > 0 && (
                    <div className="mb-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-taupe">Photos</p>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {imgs.map((f) => (
                          <a key={f.id} href={`${API}/files/${f.id}/download`} target="_blank" rel="noreferrer"
                            className="group relative aspect-square overflow-hidden rounded-lg border border-brand-taupe/20" data-testid={`photo-thumb-${f.id}`} title={f.filename}>
                            <img src={`${API}/files/${f.id}/download`} alt={f.filename} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {docs.length > 0 && (
                    <div className="space-y-2">
                      {docs.map((f) => (
                        <div key={f.id} className="flex items-center justify-between rounded-lg border border-brand-taupe/15 p-2.5 text-sm">
                          <div className="min-w-0"><p className="truncate font-medium">{f.filename}</p><p className="text-xs text-brand-taupe">{f.uploaded_by_role} · {(f.size / 1048576).toFixed(1)}MB · {f.category}</p></div>
                          <button onClick={() => dl(`/files/${f.id}/download`)} className="text-brand-red"><Download className="h-4 w-4" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </Card>

          {/* Activity log */}
          <Card>
            <h3 className="mb-3 font-heading text-lg font-bold">Activity Log</h3>
            <div className="space-y-2">
              {o.activity.length === 0 && <p className="text-sm text-brand-taupe">No activity yet.</p>}
              {o.activity.map((a) => (
                <div key={a.id} className="text-sm"><span className="text-brand-graphite">{a.action}</span> <span className="text-xs text-brand-taupe">— {a.actor_name} · {fmtDate(a.created_at)}</span></div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right action column */}
        <div className="space-y-5">
          {/* Dentist actions */}
          {user?.role === "dentist" && (
            <Card>
              <h3 className="mb-3 font-heading text-lg font-bold">Actions</h3>
              <div className="space-y-2">
                {o.invoices?.[0] && <Btn variant="outline" className="w-full" onClick={() => dl(`/invoices/${o.invoices[0].id}/pdf`)}><FileText className="h-4 w-4" />Download Invoice</Btn>}
                {o.status === "Order Received" && <Btn variant="outline" className="w-full" onClick={() => act(() => api.post(`/orders/${o.id}/cancel`, { reason: "Dentist cancelled" }), "Cancelled")}>Cancel Order</Btn>}
                {o.status === "Delivered" && <RemakeButton order={o} reasons={meta.remake_reasons} onDone={load} />}
              </div>
            </Card>
          )}

          {/* Staff actions */}
          {isStaff && (
            <Card>
              <h3 className="mb-3 flex items-center gap-2 font-heading text-lg font-bold"><UserCog className="h-5 w-5 text-brand-red" />Manage</h3>
              <StatusUpdater order={o} statuses={meta.statuses} onDone={load} />
              {isAdmin && o.status === "Order Received" && <AcceptBlock order={o} onDone={load} />}
              {isAdmin && (
                <div className="mt-3 space-y-2">
                  <FileIssueBlock order={o} reasons={meta.file_issue_reasons} onDone={load} />
                  <AssignDesigner order={o} designers={designers} onDone={load} />
                </div>
              )}
              {o.is_impression && (o.status === "Impression Awaited") && (
                <Btn variant="gold" className="mt-3 w-full" onClick={() => act(() => api.post(`/orders/${o.id}/impression/receive`, { condition: "OK" }), "Marked received")}><Package className="h-4 w-4" />Mark Impression Received</Btn>
              )}
              {o.is_impression && o.status === "Impression Received" && (
                <Btn variant="gold" className="mt-3 w-full" onClick={() => act(() => api.post(`/orders/${o.id}/impression/scanned`), "Scanned")}>Mark In-House Scanning</Btn>
              )}
            </Card>
          )}

          {/* Admin: invoice + dispatch + payment */}
          {isAdmin && (
            <>
              <Card>
                <h3 className="mb-3 flex items-center gap-2 font-heading text-lg font-bold"><FileText className="h-5 w-5 text-brand-red" />Invoice</h3>
                <Btn variant="outline" className="w-full" onClick={() => act(() => api.post(`/orders/${o.id}/invoice`), "Invoice generated")}>Generate / Update Invoice</Btn>
                {o.invoices?.[0] && <Btn variant="ghost" className="mt-2 w-full" onClick={() => dl(`/invoices/${o.invoices[0].id}/pdf`)}>Download PDF ({o.invoices[0].invoice_no})</Btn>}
              </Card>
              <DispatchBlock order={o} onDone={load} dl={dl} act={act} />
              {o.remakes?.length > 0 && <Card><h3 className="mb-2 font-heading font-bold">Remake Orders</h3>{o.remakes.map((r) => <Link key={r.id} to={`/app/orders/${r.id}`} className="block text-sm font-semibold text-brand-red">{r.batch_no}</Link>)}</Card>}
              <DeleteOrderBlock order={o} onDeleted={() => navigate("/app/orders")} />
            </>
          )}

          {/* WhatsApp log */}
          {isStaff && (
            <Card>
              <h3 className="mb-3 flex items-center gap-2 font-heading text-lg font-bold"><MessageSquare className="h-5 w-5 text-brand-red" />WhatsApp</h3>
              {o.whatsapp_logs.length === 0 ? <p className="text-sm text-brand-taupe">No messages.</p> : o.whatsapp_logs.slice(0, 8).map((w) => (
                <div key={w.id} className="flex items-center justify-between border-b border-brand-taupe/10 py-1.5 text-sm">
                  <span className="text-brand-graphite">{w.event}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${w.status === "Failed" ? "bg-brand-red/10 text-brand-red" : "bg-green-100 text-green-700"}`}>{w.status}</span>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ l, v, gold }) { return <div className={`flex justify-between ${gold ? "text-[#8a6d2f]" : ""}`}><span className="text-brand-taupe">{l}</span><span className="tabular font-medium">{v}</span></div>; }

function StatusUpdater({ order, statuses, onDone }) {
  const [s, setS] = useState(order.status);
  const [note, setNote] = useState("");
  return (
    <div className="space-y-2">
      <Field label="Update Status">
        <select data-testid="status-select" className={inputCls} value={s} onChange={(e) => setS(e.target.value)}>{statuses.map((x) => <option key={x}>{x}</option>)}</select>
      </Field>
      <input className={inputCls} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <Btn data-testid="update-status-btn" className="w-full" onClick={async () => { try { await api.post(`/orders/${order.id}/status`, { status: s, note }); toast.success("Status updated"); onDone(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } }}>Update Status</Btn>
    </div>
  );
}

function AcceptBlock({ order, onDone }) {
  const accept = async () => { try { await api.post(`/orders/${order.id}/accept`, {}); toast.success("Order accepted"); onDone(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } };
  return (
    <div className="mt-3 rounded-lg border border-brand-gold/30 bg-brand-gold/5 p-3">
      <p className="mb-2 text-sm font-semibold">Per-tooth verification</p>
      {order.items.map((it) => (
        <p key={it.id} className="text-xs text-brand-taupe">{it.product_name}/{it.tier_name}: {it.teeth.map((t) => `${t.tooth}(${t.shade})`).join(", ")}</p>
      ))}
      <Btn data-testid="accept-order-btn" variant="gold" className="mt-2 w-full" onClick={accept}><CheckCircle2 className="h-4 w-4" />Accept Order</Btn>
    </div>
  );
}

function FileIssueBlock({ order, reasons, onDone }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(reasons[0] || "Other");
  const [note, setNote] = useState("");
  return (
    <div>
      <Btn variant="outline" className="w-full" onClick={() => setOpen(!open)}><AlertTriangle className="h-4 w-4" />Raise File Issue</Btn>
      {open && (
        <div className="mt-2 space-y-2 rounded-lg border border-brand-taupe/20 p-3">
          <select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>{reasons.map((r) => <option key={r}>{r}</option>)}</select>
          <input className={inputCls} placeholder="Details" value={note} onChange={(e) => setNote(e.target.value)} />
          <Btn className="w-full" onClick={async () => { try { await api.post(`/orders/${order.id}/file-issue`, { reason, note }); toast.success("File issue raised"); setOpen(false); onDone(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } }}>Notify Dentist</Btn>
        </div>
      )}
    </div>
  );
}

function AssignDesigner({ order, designers, onDone }) {
  const [d, setD] = useState(order.designer_id || "");
  const [busy, setBusy] = useState(false);
  const [load2, setLoad2] = useState({});

  useEffect(() => {
    api.get("/designer/orders").then(({ data }) => {
      const m = {};
      (data || []).forEach((o) => {
        if (o.designer_id && !["Delivered", "Cancelled"].includes(o.status)) m[o.designer_id] = (m[o.designer_id] || 0) + 1;
      });
      setLoad2(m);
    }).catch(() => {});
  }, []);

  const assign = async () => {
    if (!d) return;
    setBusy(true);
    try { await api.post(`/orders/${order.id}/assign-designer`, { designer_id: d }); toast.success("Designer assigned"); onDone(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    setBusy(false);
  };

  return (
    <div className="rounded-xl border border-brand-taupe/20 p-3">
      <p className="mb-1 text-sm font-semibold text-brand-graphite">Designer</p>
      {order.designer_name
        ? <p className="mb-2 text-sm text-brand-graphite">Currently assigned: <b>{order.designer_name}</b></p>
        : <p className="mb-2 text-sm text-brand-taupe">No designer assigned yet.</p>}
      {designers.length === 0 ? (
        <p className="rounded-lg bg-brand-ivory p-2 text-xs text-brand-taupe">No designers found. Add a designer in <Link to="/app/users" className="font-semibold text-brand-red underline">Team</Link>.</p>
      ) : (
        <div className="flex gap-2">
          <select data-testid="designer-select" className={inputCls} value={d} onChange={(e) => setD(e.target.value)}>
            <option value="">Choose designer…</option>
            {designers.map((x) => <option key={x.id} value={x.id}>{x.name}{load2[x.id] ? ` · ${load2[x.id]} active` : " · free"}</option>)}
          </select>
          <Btn variant="dark" data-testid="assign-designer-btn" onClick={assign} disabled={!d || busy}>{order.designer_id ? "Reassign" : "Assign"}</Btn>
        </div>
      )}
    </div>
  );
}

function DispatchBlock({ order, onDone, dl, act }) {
  const [f, setF] = useState({ courier_name: "", tracking_no: "", notes: "" });
  return (
    <Card>
      <h3 className="mb-3 flex items-center gap-2 font-heading text-lg font-bold"><Truck className="h-5 w-5 text-brand-red" />Dispatch</h3>
      <div className="space-y-2">
        <input className={inputCls} placeholder="Courier name" value={f.courier_name} onChange={(e) => setF({ ...f, courier_name: e.target.value })} data-testid="courier-name" />
        <input className={inputCls} placeholder="Tracking number" value={f.tracking_no} onChange={(e) => setF({ ...f, tracking_no: e.target.value })} data-testid="tracking-no" />
        <Btn data-testid="dispatch-btn" className="w-full" onClick={() => act(() => api.post(`/orders/${order.id}/dispatch`, f), "Dispatched")}>Mark Dispatched</Btn>
        <div className="flex gap-2">
          <Btn variant="outline" className="flex-1" onClick={() => dl(`/orders/${order.id}/dispatch-label?size=4x4`)}><Printer className="h-4 w-4" />4×4 Label</Btn>
          <Btn variant="outline" className="flex-1" onClick={() => dl(`/orders/${order.id}/dispatch-label?size=A4`)}>A4</Btn>
        </div>
      </div>
    </Card>
  );
}

function DeleteOrderBlock({ order, onDeleted }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const match = text.trim() === order.batch_no;
  const doDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/orders/${order.id}`);
      toast.success(`${order.batch_no} deleted`);
      onDeleted();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
      setBusy(false);
    }
  };
  return (
    <Card className="border-brand-red/30">
      <h3 className="mb-1 flex items-center gap-2 font-heading text-lg font-bold text-brand-red"><Trash2 className="h-5 w-5" />Delete Order</h3>
      <p className="mb-3 text-sm text-brand-taupe">Permanently removes this order and all its cases, files, invoices, payments and history. This cannot be undone.</p>
      <Btn variant="outline" data-testid="delete-order-btn" className="w-full border-brand-red text-brand-red hover:bg-brand-red hover:text-white" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" />Delete this order
      </Btn>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && setOpen(false)}>
          <div data-testid="delete-order-dialog" className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="flex items-center gap-2 font-heading text-lg font-bold text-brand-red"><AlertTriangle className="h-5 w-5" />Delete {order.batch_no}?</h3>
            <p className="mt-2 text-sm text-brand-graphite">This permanently deletes this order along with its cases, files, invoices, payments and any linked remakes. This cannot be undone.</p>
            <p className="mt-3 text-sm text-brand-taupe">Type <span className="rounded bg-brand-ivory px-1.5 py-0.5 font-mono font-semibold text-brand-red">{order.batch_no}</span> to confirm:</p>
            <input data-testid="delete-order-confirm-input" autoFocus value={text} onChange={(e) => setText(e.target.value)} className={inputCls + " mt-2"} placeholder={order.batch_no} />
            <div className="mt-4 flex gap-2">
              <Btn variant="ghost" className="flex-1" onClick={() => setOpen(false)} disabled={busy}>Cancel</Btn>
              <Btn data-testid="delete-order-confirm-btn" disabled={!match || busy} className="flex-1 bg-brand-red text-white hover:bg-brand-ruby disabled:opacity-50" onClick={doDelete}>
                {busy ? "Deleting…" : "Delete order"}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function RemakeButton({ order, reasons, onDone }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(reasons[0] || "Other");
  const [notes, setNotes] = useState("");
  return (
    <div>
      <Btn variant="outline" className="w-full" data-testid="raise-remake-btn" onClick={() => setOpen(!open)}><RotateCcw className="h-4 w-4" />Raise Remake</Btn>
      {open && (
        <div className="mt-2 space-y-2 rounded-lg border border-brand-taupe/20 p-3">
          <select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>{reasons.map((r) => <option key={r}>{r}</option>)}</select>
          <textarea className={inputCls} rows={2} placeholder="Describe the issue" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Btn className="w-full" onClick={async () => { try { await api.post(`/orders/${order.id}/remake`, { reason, notes, scope: "batch" }); toast.success("Remake request sent"); setOpen(false); onDone(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } }}>Submit Remake</Btn>
        </div>
      )}
    </div>
  );
}
