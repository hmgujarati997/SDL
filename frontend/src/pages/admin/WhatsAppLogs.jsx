import { useEffect, useState, useCallback } from "react";
import api, { fmtDate } from "@/lib/api";
import { PageHeader, Card, Btn, inputCls } from "@/components/UI";
import { Spinner } from "@/components/Layout";
import { toast } from "sonner";

export default function WhatsAppLogs() {
  const [logs, setLogs] = useState(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const load = useCallback(() => {
    const params = {}; if (q) params.q = q; if (status) params.status = status;
    api.get("/whatsapp/logs", { params }).then(({ data }) => setLogs(data)).catch(() => {});
  }, [q, status]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const retry = async (id) => { try { await api.post(`/whatsapp/logs/${id}/retry`); toast.success("Retried"); load(); } catch { toast.error("Retry failed"); } };
  const color = (s) => ({ Read: "bg-green-100 text-green-700", Delivered: "bg-teal-100 text-teal-700", Sent: "bg-blue-50 text-blue-700", Failed: "bg-brand-red/10 text-brand-red", Pending: "bg-gray-100 text-gray-600" }[s] || "bg-gray-100");

  return (
    <div>
      <PageHeader title="WhatsApp Logs" subtitle="Delivery & read tracking" />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input className={inputCls + " flex-1"} placeholder="Search order/dentist/phone" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputCls + " sm:w-48"} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>{["Pending", "Sent", "Delivered", "Read", "Failed"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      {!logs ? <Spinner /> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-brand-ivory text-left text-xs uppercase tracking-wider text-brand-taupe">
              <tr><th className="p-3">Event</th><th className="p-3">Order</th><th className="p-3">Dentist</th><th className="p-3">Phone</th><th className="p-3">Status</th><th className="p-3">Sent</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-brand-taupe/15">
                  <td className="p-3">{l.event}</td><td className="p-3 font-semibold">{l.order_no}</td>
                  <td className="p-3">{l.dentist_name}</td><td className="p-3">{l.phone}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color(l.status)}`}>{l.status}</span>{l.failure_reason && <p className="text-xs text-brand-red">{l.failure_reason}</p>}</td>
                  <td className="p-3 text-xs text-brand-taupe">{fmtDate(l.sent_at)}</td>
                  <td className="p-3">{l.status === "Failed" && <button onClick={() => retry(l.id)} className="font-semibold text-brand-red">Retry</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
