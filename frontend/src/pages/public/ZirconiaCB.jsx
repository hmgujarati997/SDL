import { PublicLayout } from "@/components/Layout";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

const IMG = "https://images.unsplash.com/photo-1677026010083-78ec7f1b84ed?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

export default function ZirconiaCB() {
  return (
    <PublicLayout>
      <section className="bg-brand-charcoal pt-28 pb-16 text-white sm:pt-32">
        <div className="mx-auto max-w-7xl px-6">
          <h1 className="font-heading text-4xl font-bold sm:text-5xl">Zirconia Crown & Bridge</h1>
          <p className="mt-4 max-w-2xl text-white/75">Strength meets aesthetics. Choose the right tier for every case.</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <img src={IMG} alt="zirconia crown" className="rounded-3xl object-cover brand-shadow" />
          <div className="space-y-6">
            <div className="rounded-2xl border border-brand-taupe/15 bg-white p-6 brand-shadow">
              <h3 className="font-heading text-xl font-bold text-brand-red">Zirconia Monolithic</h3>
              <p className="mt-2 text-sm text-brand-taupe">Full-contour zirconia milled from a single block. Maximum strength for posterior teeth and bruxers.</p>
            </div>
            <div className="rounded-2xl border border-brand-taupe/15 bg-white p-6 brand-shadow">
              <h3 className="font-heading text-xl font-bold text-brand-gold">Layered Zirconia</h3>
              <p className="mt-2 text-sm text-brand-taupe">Hand-layered porcelain over a zirconia core for superior anterior aesthetics and natural translucency.</p>
            </div>
            <ul className="space-y-3">
              {["Per-tooth shade entry (VITA Classical + bleach shades)", "Connected bridge ranges with pontic/abutment marking", "Trial workflow available on request", "Volume slab discounts applied automatically"].map((t) => (
                <li key={t} className="flex items-start gap-3 text-brand-graphite"><CheckCircle2 className="mt-0.5 h-5 w-5 text-brand-red" />{t}</li>
              ))}
            </ul>
            <Link to="/register" className="inline-flex rounded-full bg-brand-red px-7 py-3 font-semibold text-white hover:bg-brand-ruby">Place an Order</Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
