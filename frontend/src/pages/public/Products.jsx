import { PublicLayout } from "@/components/Layout";
import { Link } from "react-router-dom";
import { Crown, Layers, Wrench, Boxes, ArrowRight } from "lucide-react";

const items = [
  { icon: Crown, title: "Zirconia Crown", desc: "Single-unit monolithic or layered zirconia crowns for anterior and posterior teeth." },
  { icon: Layers, title: "Zirconia Bridge", desc: "Multi-unit connected bridges with abutments and pontics, monolithic or layered." },
  { icon: Wrench, title: "Implant Crown", desc: "Screw or cement-retained implant restorations with precise fit." },
  { icon: Boxes, title: "More Coming Soon", desc: "E-max, PMMA, metal ceramic, night guards, surgical guides and aligners." },
];

export default function Products() {
  return (
    <PublicLayout>
      <section className="bg-brand-charcoal py-16 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <h1 className="font-heading text-4xl font-bold sm:text-5xl">Products & Services</h1>
          <p className="mt-4 max-w-2xl text-white/75">A growing catalogue of premium dental lab restorations. Login to see your personalised pricing.</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((p) => (
            <div key={p.title} className="card-hover rounded-2xl border border-brand-taupe/15 bg-white p-7 brand-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red"><p.icon className="h-6 w-6" /></div>
              <h3 className="mt-5 font-heading text-lg font-bold">{p.title}</h3>
              <p className="mt-2 text-sm text-brand-taupe">{p.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 rounded-2xl bg-brand-gold/10 border border-brand-gold/30 p-6 text-center">
          <p className="text-brand-graphite">Pricing is personalised per clinic and visible only inside your portal.</p>
          <Link to="/login" className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-red px-6 py-3 font-semibold text-white hover:bg-brand-ruby">
            Login to view pricing <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
