import { useEffect, useState } from "react";
import api, { API, inr, fmtDate } from "@/lib/api";
import { PageHeader, Card } from "@/components/UI";
import { Spinner } from "@/components/Layout";
import { PayBadge } from "@/components/StatusBadge";
import { Download } from "lucide-react";

export default function Invoices() {
  const [list, setList] = useState(null);
  useEffect(() => { api.get("/invoices").then(({ data }) => setList(data)).catch(() => {}); }, []);
  const open = (id) => {
    const token = localStorage.getItem("sdl_token");
    window.open(`${API}/invoices/${id}/pdf?t=${token}`, "_blank");
  };
  if (!list) return <Spinner />;
  return (
    <div>
      <PageHeader title="Invoices" subtitle="View and download your GST invoices." />
      {list.length === 0 ? <Card><p className="py-10 text-center text-brand-taupe">No invoices generated yet.</p></Card> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-brand-ivory text-left text-xs uppercase tracking-wider text-brand-taupe">
              <tr><th className="p-4">Invoice No</th><th className="p-4">Order</th><th className="p-4">Date</th><th className="p-4">Total</th><th className="p-4">Pending</th><th className="p-4">Action</th></tr>
            </thead>
            <tbody>
              {list.map((i) => (
                <tr key={i.id} className="border-t border-brand-taupe/15" data-testid={`invoice-row-${i.id}`}>
                  <td className="p-4 font-semibold">{i.invoice_no}</td>
                  <td className="p-4">{i.order_no}</td>
                  <td className="p-4">{fmtDate(i.created_at)}</td>
                  <td className="p-4 tabular font-semibold">{inr(i.total)}</td>
                  <td className="p-4"><PayBadge status={i.pending > 0 ? "Partially Paid" : "Paid"} /></td>
                  <td className="p-4"><button onClick={() => open(i.id)} className="inline-flex items-center gap-1 font-semibold text-brand-red"><Download className="h-4 w-4" />PDF</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
