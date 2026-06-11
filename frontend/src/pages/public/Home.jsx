import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { PublicLayout } from "@/components/Layout";
import {
  ShieldCheck, Gem, Clock, Upload, Layers, Truck, MessageSquare, ArrowRight, CheckCircle2,
} from "lucide-react";

const HERO = "https://images.unsplash.com/photo-1579165466991-467135ad3110?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600";

const fade = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };

export default function Home() {
  const features = [
    { icon: Gem, title: "Premium Zirconia", desc: "Monolithic & layered zirconia engineered for strength and lifelike aesthetics." },
    { icon: ShieldCheck, title: "Strict QC", desc: "Every restoration passes multi-stage quality checks before dispatch." },
    { icon: Clock, title: "Fast Turnaround", desc: "Reliable 4-day TAT with urgent and same-day options where possible." },
  ];
  const steps = [
    { icon: Upload, title: "Place & Upload", desc: "Create patients, pick teeth on the FDI chart, upload scans or ship impressions." },
    { icon: Layers, title: "We Manufacture", desc: "Design, cutting, sintering and glazing with live status tracking." },
    { icon: Truck, title: "Dispatch & Deliver", desc: "Track courier, download invoices and get WhatsApp updates at every step." },
  ];
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-charcoal text-white">
        <img src={HERO} alt="dental lab" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-charcoal via-brand-charcoal/90 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <motion.div variants={fade} initial="hidden" animate="show" transition={{ duration: 0.6 }} className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-gold/40 bg-brand-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-gold">
              For Dental Professionals
            </span>
            <h1 className="mt-6 font-heading text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Premium Zirconia Crowns & Bridges for Dental Professionals
            </h1>
            <p className="mt-6 text-base leading-relaxed text-white/80 sm:text-lg">
              Place lab orders, upload scan files, track case progress, and manage restorations with Shree Dental Lab — built on Precision, Quality and Trust.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to="/register" data-testid="hero-place-order-btn"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-brand-red px-7 py-3.5 font-semibold shadow-lg transition hover:bg-brand-ruby">
                Place New Order <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
              <Link to="/login" data-testid="hero-login-btn"
                className="inline-flex items-center justify-center rounded-full border border-white/30 px-7 py-3.5 font-semibold transition hover:border-brand-gold hover:text-brand-gold">
                Dentist Login
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f, i) => (
            <motion.div key={f.title} variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="card-hover rounded-2xl border border-brand-taupe/15 bg-white p-7 brand-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-heading text-xl font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-taupe">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Process */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-gold">How it works</p>
            <h2 className="mt-3 font-heading text-3xl font-bold sm:text-4xl">From scan to seat in three simple steps</h2>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="relative text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-charcoal text-brand-gold">
                  <s.icon className="h-7 w-7" />
                </div>
                <span className="mx-auto mt-4 flex h-11 w-11 items-center justify-center rounded-full bg-brand-red font-heading text-xl font-bold text-white shadow-md ring-4 ring-brand-red/15">{i + 1}</span>
                <h3 className="font-heading text-xl font-bold">{s.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm text-brand-taupe">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="font-heading text-3xl font-bold sm:text-4xl">A digital lab built around your workflow</h2>
            <ul className="mt-7 space-y-4">
              {["Tappable FDI tooth chart with per-tooth shade selection",
                "Transparent volume pricing — see your savings before you submit",
                "Physical impression support with pickup & courier slips",
                "WhatsApp updates at every production stage",
                "GST invoices & 4×6 dispatch labels on demand"].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-red" />
                  <span className="text-brand-graphite">{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-brand-gold/30 bg-gradient-to-br from-white to-brand-ivory p-8 brand-shadow">
            <MessageSquare className="h-8 w-8 text-brand-gold" />
            <p className="mt-4 font-heading text-2xl font-bold">"Add 1 more unit and unlock 25% off."</p>
            <p className="mt-3 text-sm text-brand-taupe">Live slab pricing nudges help you order smarter while we handle the precision.</p>
            <Link to="/register" className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-red px-6 py-3 font-semibold text-white transition hover:bg-brand-ruby">
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-brand-charcoal py-16 text-center text-white">
        <h2 className="font-heading text-3xl font-bold">Ready to place your first case?</h2>
        <p className="mt-3 text-white/70">Join dentists who trust Shree Dental Lab for their zirconia restorations.</p>
        <Link to="/register" className="mt-7 inline-flex rounded-full bg-brand-red px-8 py-3.5 font-semibold transition hover:bg-brand-ruby">Register Your Clinic</Link>
      </section>
    </PublicLayout>
  );
}
