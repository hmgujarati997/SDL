import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { API, fmtDate, formatApiError } from "@/lib/api";
import { Card, Btn } from "@/components/UI";
import { Spinner } from "@/components/Layout";
import { toast } from "sonner";
import { ChevronLeft, Download, Upload, FileText, CheckCircle2, Image as ImageIcon } from "lucide-react";

const isImg = (f) => f.category === "photo" || /\.(jpe?g|png|webp)$/i.test(f.filename || "");

export default function DesignerOrderDetail() {
  const { id } = useParams();
  const [o, setO] = useState(null);
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = () => api.get(`/designer/orders/${id}`).then(({ data }) => setO(data)).catch((e) => setErr(formatApiError(e.response?.data?.detail) || "You don't have access to this case."));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);
  if (err) return (
    <div className="mx-auto max-w-3xl">
      <Link to="/app" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-taupe hover:text-brand-red"><ChevronLeft className="h-4 w-4" />Back to assignments</Link>
      <Card><p className="py-10 text-center text-sm text-brand-graphite" data-testid="designer-error">{err}</p></Card>
    </div>
  );
  if (!o) return <Spinner />;

  const inputFiles = o.files.filter((f) => f.category !== "design" && !isImg(f));
  const photos = o.files.filter((f) => isImg(f));
  const designFiles = o.files.filter((f) => f.category === "design");

  const upload = async (e) => {
    const list = Array.from(e.target.files || []);
    if (!list.length) return;
    setUploading(true);
    let ok = 0; const failed = [];
    for (const f of list) {
      const fd = new FormData();
      fd.append("file", f); fd.append("level", "batch"); fd.append("category", "design");
      try { await api.post(`/orders/${o.id}/files`, fd); ok += 1; }
      catch (err) { failed.push(f.name); }
    }
    if (ok) toast.success(`${ok} design file${ok > 1 ? "s" : ""} uploaded — admin will review`);
    if (failed.length) toast.error(`Could not upload: ${failed.join(", ")}`);
    load();
    setUploading(false);
    e.target.value = "";
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/app" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-taupe hover:text-brand-red"><ChevronLeft className="h-4 w-4" />Back to assignments</Link>

      <Card className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-taupe">Order Number</p>
        <h1 className="font-heading text-3xl font-bold text-brand-graphite" data-testid="designer-order-no">{o.batch_no}</h1>
        {o.design_submitted && <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"><CheckCircle2 className="h-4 w-4" />Design submitted — awaiting admin review</span>}
      </Card>

      {/* Files from clinic */}
      <Card className="mb-5">
        <h2 className="mb-3 font-heading text-lg font-bold">Files to work on</h2>
        {inputFiles.length === 0 && photos.length === 0 && <p className="py-4 text-center text-sm text-brand-taupe">No files attached to this case.</p>}
        {inputFiles.length > 0 && (
          <div className="space-y-2">
            {inputFiles.map((f) => (
              <a key={f.id} href={`${API}/files/${f.id}/download`} target="_blank" rel="noreferrer"
                data-testid={`designer-file-${f.id}`}
                className="flex items-center justify-between rounded-lg border border-brand-taupe/15 p-3 text-sm hover:border-brand-red">
                <span className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-brand-red" /><span className="truncate font-medium">{f.filename}</span></span>
                <Download className="h-4 w-4 shrink-0 text-brand-red" />
              </a>
            ))}
          </div>
        )}
        {photos.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-brand-taupe"><ImageIcon className="h-3.5 w-3.5" />Photos</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((f) => (
                <a key={f.id} href={`${API}/files/${f.id}/download`} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-lg border border-brand-taupe/20">
                  <img src={`${API}/files/${f.id}/download`} alt={f.filename} className="h-full w-full object-cover" loading="lazy" />
                </a>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Upload your design */}
      <Card>
        <h2 className="mb-1 font-heading text-lg font-bold">Upload your design</h2>
        <p className="mb-3 text-sm text-brand-taupe">Finished the design? Upload the file here. The admin will review it.</p>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-taupe/30 p-6 text-brand-taupe hover:border-brand-red">
          <Upload className="h-5 w-5" /> {uploading ? "Uploading…" : "Choose design file(s)"}
          <input type="file" multiple className="hidden" data-testid="designer-upload-input" disabled={uploading} onChange={upload} />
        </label>
        {designFiles.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-taupe">Your uploads</p>
            {designFiles.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-lg bg-brand-ivory p-2.5 text-sm">
                <span className="truncate font-medium">{f.filename}</span>
                <span className="text-xs text-brand-taupe">{fmtDate(f.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
