import { PublicLayout } from "@/components/Layout";
import { Link } from "react-router-dom";
import { Target, Gem, HeartHandshake } from "lucide-react";

const IMG = "https://images.unsplash.com/photo-1575278616937-d474f5fda9a6?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

export default function About() {
  return (
    <PublicLayout>
      <section className="bg-brand-charcoal py-16 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <h1 className="font-heading text-4xl font-bold sm:text-5xl">About Shree Dental Lab</h1>
          <p className="mt-4 max-w-2xl text-white/75">A precision-driven dental laboratory specialising in zirconia crowns, bridges and implant restorations for dental professionals.</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <img src={IMG} alt="lab" className="rounded-3xl object-cover brand-shadow" />
          <div>
            <h2 className="font-heading text-3xl font-bold">Crafted with precision, delivered with trust</h2>
            <p className="mt-4 leading-relaxed text-brand-taupe">
              We combine state-of-the-art CAD/CAM milling, experienced ceramists and rigorous quality control to deliver restorations that fit beautifully and last. From single monolithic crowns to multi-unit layered bridges, every case is handled with care.
            </p>
            <p className="mt-4 leading-relaxed text-brand-taupe">
              Whether you scan digitally or ship physical impressions, our streamlined workflow keeps you informed at every stage.
            </p>
          </div>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            { icon: Target, title: "Precision", desc: "Marginal accuracy and consistent results, case after case." },
            { icon: Gem, title: "Quality", desc: "Premium zirconia materials and meticulous craftsmanship." },
            { icon: HeartHandshake, title: "Trust", desc: "Transparent pricing, clear communication, dependable timelines." },
          ].map((v) => (
            <div key={v.title} className="rounded-2xl border border-brand-taupe/15 bg-white p-7 brand-shadow">
              <v.icon className="h-8 w-8 text-brand-gold" />
              <h3 className="mt-4 font-heading text-xl font-bold">{v.title}</h3>
              <p className="mt-2 text-sm text-brand-taupe">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
