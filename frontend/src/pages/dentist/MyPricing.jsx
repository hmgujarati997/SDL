import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { inr } from "@/lib/api";
import { PageHeader, Card, Btn } from "@/components/UI";
import { Spinner } from "@/components/Layout";
import { Star, PlusCircle } from "lucide-react";

export default function MyPricing() {
  const [cards, setCards] = useState(null);
  useEffect(() => { api.get("/my-pricing").then(({ data }) => setCards(data.cards)).catch(() => {}); }, []);
  if (!cards) return <Spinner />;
  return (
    <div>
      <PageHeader title="My Pricing" subtitle="Your personalised rate card with volume slab discounts." />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.tier_id} data-testid={`pricing-card-${c.tier_id}`} className="card-hover relative">
            {c.most_popular && (
              <span className="absolute -top-3 right-4 inline-flex items-center gap-1 rounded-full bg-brand-gold px-3 py-1 text-xs font-bold text-brand-charcoal">
                <Star className="h-3 w-3" /> Most Popular
              </span>
            )}
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-taupe">{c.product_name}</p>
            <h3 className="font-heading text-xl font-bold text-brand-graphite">{c.tier_name}</h3>
            <p className="mt-1 text-sm text-brand-taupe">{c.description}</p>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-brand-taupe">
                  <th className="pb-2">Units</th><th className="pb-2">Per Unit</th><th className="pb-2 text-right">You Save</th>
                </tr>
              </thead>
              <tbody>
                {c.rows.map((r) => (
                  <tr key={r.min_units} className="border-t border-brand-taupe/15">
                    <td className="py-2 font-semibold">{r.min_units === c.rows[c.rows.length - 1].min_units ? `${r.min_units}+` : r.min_units}</td>
                    <td className="py-2 tabular">
                      {r.discount > 0 && <span className="mr-1 text-xs text-brand-taupe line-through">{inr(c.base_rate)}</span>}
                      <span className="font-bold text-brand-red">{inr(r.per_unit)}</span>
                    </td>
                    <td className="py-2 text-right">{r.discount > 0 ? <span className="rounded-full bg-brand-gold/15 px-2 py-0.5 text-xs font-bold text-[#8a6d2f]">{r.discount}%</span> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-brand-taupe">GST {c.gst_rate}% extra</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Link to="/app/new-order">
          <Btn data-testid="pricing-place-order-btn" className="text-base"><PlusCircle className="h-5 w-5" />Place Order</Btn>
        </Link>
      </div>
    </div>
  );
}
