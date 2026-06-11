import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { PublicLayout } from "@/components/Layout";
import { RollButton } from "@/components/RollButton";
import { Link2, CheckCircle2, ArrowRight } from "lucide-react";

const IMG = {
  hero: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
  small: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
  large: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
  crown: "https://images.unsplash.com/photo-1677026010083-78ec7f1b84ed?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
  bridge: "https://images.unsplash.com/photo-1575278616937-d474f5fda9a6?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
};

const Starburst = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <path d="m19.6 66.5 19.7-11 .3-1-.3-.5h-1l-3.3-.2-11.2-.3L14 53l-9.5-.5-2.4-.5L0 49l.2-1.5 2-1.3 2.9.2 6.3.5 9.5.6 6.9.4L38 49.1h1.6l.2-.7-.5-.4-.4-.4L29 41l-10.6-7-5.6-4.1-3-2-1.5-2-.6-4.2 2.7-3 3.7.3.9.2 3.7 2.9 8 6.1L37 36l1.5 1.2.6-.4.1-.3-.7-1.1L33 25l-6-10.4-2.7-4.3-.7-2.6c-.3-1-.4-2-.4-3l3-4.2L28 0l4.2.6L33.8 2l2.6 6 4.1 9.3L47 29.9l2 3.8 1 3.4.3 1h.7v-.5l.5-7.2 1-8.7 1-11.2.3-3.2 1.6-3.8 3-2L61 2.6l2 2.9-.3 1.8-1.1 7.7L59 27.1l-1.5 8.2h.9l1-1.1 4.1-5.4 6.9-8.6 3-3.5L77 13l2.3-1.8h4.3l3.1 4.7-1.4 4.9-4.4 5.6-3.7 4.7-5.3 7.1-3.2 5.7.3.4h.7l12-2.6 6.4-1.1 7.6-1.3 3.5 1.6.4 1.6-1.4 3.4-8.2 2-9.6 2-14.3 3.3-.2.1.2.3 6.4.6 2.8.2h6.8l12.6 1 3.3 2 1.9 2.7-.3 2-5.1 2.6-6.8-1.6-16-3.8-5.4-1.3h-.8v.4l4.6 4.5 8.3 7.5L89 80.1l.5 2.4-1.3 2-1.4-.2-9.2-7-3.6-3-8-6.8h-.5v.7l1.8 2.7 9.8 14.7.5 4.5-.7 1.4-2.6 1-2.7-.6-5.8-8-6-9-4.7-8.2-.5.4-2.9 30.2-1.3 1.5-3 1.2-2.5-2-1.4-3 1.4-6.2 1.6-8 1.3-6.4 1.2-7.9.7-2.6v-.2H49L43 72l-9 12.3-7.2 7.6-1.7.7-3-1.5.3-2.8L24 86l10-12.8 6-7.9 4-4.6-.1-.5h-.3L17.2 77.4l-4.7.6-2-2 .2-3 1-1 8-5.5Z" />
  </svg>
);

const services = [
  { title: "Zirconia Crown", img: IMG.crown, square: false, desc: "Monolithic & layered zirconia crowns — exceptional strength with lifelike translucency for any tooth." },
  { title: "Zirconia Bridge", img: IMG.bridge, square: true, desc: "Connected multi-unit bridges with precise margins, pontic & abutment marking, single-shade aesthetics." },
];

export default function Home() {
  return (
    <PublicLayout>
      {/* SECTION 1 — HERO */}
      <section className="relative flex min-h-screen flex-col bg-brand-ivory">
        <div className="hero-canvas">
          <span className="hero-blob blob-white" />
          <span className="hero-blob blob-gold" />
          <span className="hero-blob blob-red" />
          <span className="hero-blob blob-ruby" />
          <div className="fluted-overlay" />
          <div className="grain-overlay" />
        </div>

        <div className="flex-1" />
        <div className="relative z-20 mx-auto w-full max-w-[1440px] px-5 pb-14 sm:px-8 sm:pb-16 lg:px-12 lg:pb-20">
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="mb-5 text-[13px] font-medium tracking-wide text-brand-graphite sm:mb-8 sm:text-sm">
            Shree Dental Lab — Precision · Quality · Trust
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="font-clamp-hero font-heading font-medium leading-[1.06] tracking-[-0.03em] text-brand-graphite">
            Premium zirconia crowns &amp; bridges<br className="hidden sm:block" />
            <span className="sm:hidden"> </span>for dental professionals<br className="hidden sm:block" />
            <span className="sm:hidden"> </span>who demand a perfect fit.
          </motion.h1>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-8 flex flex-col gap-4 sm:mt-12 sm:flex-row sm:items-center sm:gap-5">
            <RollButton to="/register" label="Place New Order" variant="red" dataTestid="hero-place-order-btn" />
            <div className="inline-flex items-center gap-2.5 rounded-[8px] bg-white px-4 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
              <Starburst className="h-5 w-5 fill-current text-brand-red sm:h-6 sm:w-6" />
              <span className="text-[13px] font-medium text-brand-graphite sm:text-sm">ISO-grade Certified Lab</span>
              <span className="rounded bg-brand-charcoal px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white sm:px-2 sm:text-[11px]">Trusted</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTION 2 — INTRO */}
      <section className="overflow-hidden bg-white pb-12 pt-16 sm:pb-16 sm:pt-20 lg:pb-24 lg:pt-28">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-6 flex items-center gap-3 px-5 sm:mb-8 sm:px-8 lg:px-12">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-charcoal text-[11px] font-semibold text-white sm:h-7 sm:w-7 sm:text-xs">1</span>
            <span className="rounded-full border border-brand-taupe/30 px-3 py-1 text-xs font-medium text-brand-graphite sm:px-4 sm:py-1.5 sm:text-[13px]">Introducing Shree Dental Lab</span>
          </div>
          <h2 className="font-clamp-h2 mb-12 px-5 font-heading font-medium leading-[1.12] tracking-[-0.02em] text-brand-graphite sm:mb-16 sm:px-8 lg:mb-24 lg:px-12">
            Strategy-led craftsmanship, delivering<br className="hidden lg:block" /> restorations that fit, function and last.
          </h2>

          {/* desktop */}
          <div className="hidden grid-cols-[26%_1fr_48%] items-end gap-6 px-12 lg:grid xl:gap-8">
            <img src={IMG.small} alt="zirconia detail" className="aspect-[438/346] w-full self-end rounded-2xl object-cover" />
            <div className="flex flex-col items-start justify-end self-start">
              <p className="text-[16px] font-medium leading-[1.65] text-brand-graphite">
                Through digital design, precision milling and<br />meticulous finishing, we help dentists deliver<br />beautiful, durable zirconia restorations — case<br />after case, on reliable timelines.
              </p>
              <RollButton to="/about" label="About our studio" variant="red" className="mt-7" />
            </div>
            <img src={IMG.large} alt="dental lab" className="aspect-[3/2] w-full self-end rounded-2xl object-cover" />
          </div>

          {/* mobile/tablet */}
          <div className="px-5 sm:px-8 lg:hidden">
            <p className="text-[15px] font-medium leading-[1.6] text-brand-graphite sm:text-[17px]">
              Through digital design, precision milling and meticulous finishing, we help dentists deliver beautiful, durable zirconia restorations — case after case, on reliable timelines.
            </p>
            <RollButton to="/about" label="About our studio" variant="red" className="mt-6" />
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:gap-5">
              <img src={IMG.small} alt="" className="aspect-[438/346] rounded-xl object-cover sm:w-[45%] sm:rounded-2xl" />
              <img src={IMG.large} alt="" className="aspect-[900/600] rounded-xl object-cover sm:w-[55%] sm:rounded-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — SERVICES (case-study style) */}
      <section className="bg-[#F5F1EA] pb-16 pt-16 sm:pb-20 sm:pt-20 lg:pb-28 lg:pt-28">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-6 flex items-center gap-3 px-5 sm:px-8 lg:px-12">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-charcoal text-[11px] font-semibold text-white sm:h-7 sm:w-7 sm:text-xs">2</span>
            <span className="rounded-full border border-brand-taupe/40 px-3 py-1 text-xs font-medium text-brand-graphite sm:px-4 sm:py-1.5 sm:text-[13px]">Our restorations</span>
          </div>
          <h2 className="font-clamp-hero mb-10 px-5 font-heading font-medium leading-[1.08] tracking-[-0.03em] text-brand-graphite sm:mb-14 sm:px-8 lg:mb-16 lg:px-12">
            What we make
          </h2>
          <div className="grid grid-cols-1 gap-5 px-5 sm:gap-6 sm:px-8 md:grid-cols-2 lg:gap-7 lg:px-12">
            {services.map((s) => (
              <div key={s.title}>
                <Link to="/zirconia" className={`group relative block overflow-hidden rounded-2xl bg-brand-charcoal ${s.square ? "aspect-square" : "aspect-[329/246]"}`}>
                  <img src={s.img} alt={s.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute bottom-4 left-4 flex h-9 w-9 items-center overflow-hidden rounded-full bg-white transition-all duration-300 ease-in-out group-hover:w-[150px]">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center">
                      <Link2 className="h-3.5 w-3.5 -rotate-45 text-brand-graphite transition-transform duration-300 group-hover:rotate-0" />
                    </span>
                    <span className="whitespace-nowrap pr-4 text-[13px] font-medium text-brand-graphite opacity-0 transition-opacity delay-100 duration-300 group-hover:opacity-100">Learn more</span>
                  </div>
                </Link>
                <p className="mt-4 text-[13px] leading-relaxed text-brand-taupe sm:text-sm">{s.desc}</p>
                <p className="mt-1 font-heading text-[15px] font-semibold text-brand-graphite">{s.title}</p>
              </div>
            ))}
          </div>

          {/* process + CTA */}
          <div className="mt-16 grid gap-8 px-5 sm:px-8 md:grid-cols-3 lg:px-12">
            {[["Place & upload", "Create patients, tap teeth on the FDI chart, set shades, upload scans or ship impressions."],
              ["We manufacture", "Design, milling, sintering and glazing — with live status and WhatsApp updates."],
              ["Dispatch & deliver", "Track courier, download GST invoices and receive your fitted restorations."]].map(([t, d], i) => (
              <div key={t}>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-red font-heading text-xl font-bold text-white shadow-md ring-4 ring-brand-red/15">{i + 1}</span>
                <h3 className="mt-4 font-heading text-xl font-bold text-brand-graphite">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-taupe">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-brand-charcoal py-16 text-center text-white">
        <h2 className="font-heading text-3xl font-bold sm:text-4xl">Ready to place your first case?</h2>
        <p className="mt-3 text-white/70">See live volume pricing, upload scans and track every stage.</p>
        <div className="mt-7 flex justify-center gap-3">
          <RollButton to="/register" label="Register your clinic" variant="red" />
          <RollButton to="/login" label="Dentist Login" variant="white" />
        </div>
        <ul className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-x-8 gap-y-3 px-6 text-sm text-white/70">
          {["Per-tooth shade selection", "Volume slab pricing", "GST invoices & 4×6 labels", "WhatsApp case updates"].map((t) => (
            <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-brand-gold" />{t}</li>
          ))}
        </ul>
      </section>
    </PublicLayout>
  );
}
