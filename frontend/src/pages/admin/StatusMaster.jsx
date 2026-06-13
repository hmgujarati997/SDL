import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Card, Btn, inputCls } from "@/components/UI";
import { toast } from "sonner";
import { PALETTE, colorClasses, invalidateStatuses } from "@/lib/statusColors";
import { Plus, Trash2, ChevronUp, ChevronDown, Lock } from "lucide-react";

const COLORS = Object.keys(PALETTE);

export default function StatusMaster() {
  const [list, setList] = useState(null);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("blue");

  const load = () => api.get("/statuses").then(({ data }) => { setList(data); invalidateStatuses(); }).catch(() => {});
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newLabel.trim()) return;
    try { await api.post("/statuses", { label: newLabel.trim(), color: newColor, show_on_board: true }); toast.success("Status added"); setNewLabel(""); setNewColor("blue"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const patch = async (s, body) => {
    try { await api.put(`/statuses/${s.id}`, body); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); load(); }
  };
  const del = async (s) => {
    if (!window.confirm(`Delete status "${s.label}"? Orders using it must be moved first.`)) return;
    try { await api.delete(`/statuses/${s.id}`); toast.success("Status deleted"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const move = async (i, dir) => {
    const j = i + dir; if (j < 0 || j >= list.length) return;
    const arr = [...list];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setList(arr);
    try { await api.put("/statuses/order/reorder", { ids: arr.map((x) => x.id) }); invalidateStatuses(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); load(); }
  };

  if (!list) return <Card><p className="text-sm text-brand-taupe">Loading…</p></Card>;

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-heading text-lg font-bold">Add a production stage</h3>
        <p className="mt-1 text-sm text-brand-taupe">Create custom stages (e.g. Polishing, Coloring). Core stages cannot be renamed or deleted but you can recolour, hide and reorder them.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input data-testid="new-status-label" className={inputCls + " max-w-xs flex-1"} placeholder="Status name" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <Swatches value={newColor} onChange={setNewColor} />
          <Btn data-testid="add-status-btn" onClick={add} disabled={!newLabel.trim()}><Plus className="h-4 w-4" />Add Status</Btn>
        </div>
      </Card>

      <Card className="p-0">
        <div className="divide-y divide-brand-taupe/10">
          {list.map((s, i) => (
            <StatusRow key={s.id} s={s} i={i} total={list.length} onPatch={patch} onDelete={del} onMove={move} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function StatusRow({ s, i, total, onPatch, onDelete, onMove }) {
  const [label, setLabel] = useState(s.label);
  useEffect(() => { setLabel(s.label); }, [s.label]);
  const commitLabel = () => { if (label.trim() && label.trim() !== s.label) onPatch(s, { label: label.trim() }); };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4" data-testid={`status-row-${s.id}`}>
      <div className="flex flex-col">
        <button onClick={() => onMove(i, -1)} disabled={i === 0} className="text-brand-taupe hover:text-brand-red disabled:opacity-20"><ChevronUp className="h-4 w-4" /></button>
        <button onClick={() => onMove(i, 1)} disabled={i === total - 1} className="text-brand-taupe hover:text-brand-red disabled:opacity-20"><ChevronDown className="h-4 w-4" /></button>
      </div>

      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${colorClasses(s.color).badge}`}>{s.label}</span>

      <div className="min-w-[180px] flex-1">
        {s.core ? (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-graphite"><Lock className="h-3.5 w-3.5 text-brand-taupe" />{s.label} <span className="ml-1 rounded bg-brand-ivory px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand-taupe">core</span></span>
        ) : (
          <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} onBlur={commitLabel} onKeyDown={(e) => e.key === "Enter" && e.target.blur()} data-testid={`status-label-${s.id}`} />
        )}
      </div>

      <Swatches value={s.color} onChange={(c) => onPatch(s, { color: c })} />

      <label className="flex items-center gap-1.5 text-xs font-medium text-brand-graphite" title="Show as a column on the Production Board">
        <input type="checkbox" data-testid={`status-board-${s.id}`} checked={s.show_on_board} onChange={(e) => onPatch(s, { show_on_board: e.target.checked })} /> Board
      </label>

      <label className={`flex items-center gap-1.5 text-xs font-medium ${s.core ? "text-brand-taupe/50" : "text-brand-graphite"}`} title="Available as a selectable status">
        <input type="checkbox" checked={s.active} disabled={s.core} onChange={(e) => onPatch(s, { active: e.target.checked })} /> Active
      </label>

      {!s.core && (
        <button data-testid={`status-delete-${s.id}`} onClick={() => onDelete(s)} className="text-brand-red hover:opacity-70"><Trash2 className="h-4 w-4" /></button>
      )}
    </div>
  );
}

function Swatches({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {COLORS.map((c) => (
        <button key={c} type="button" onClick={() => onChange(c)} title={c}
          className={`h-6 w-6 rounded-full ${colorClasses(c).swatch} ${value === c ? "ring-2 ring-offset-1 ring-brand-charcoal" : "opacity-60 hover:opacity-100"}`} />
      ))}
    </div>
  );
}
