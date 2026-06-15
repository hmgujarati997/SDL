import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { PublicLayout } from "@/components/Layout";
import { RollButton } from "@/components/RollButton";
import { Link2 } from "lucide-react";

const IMG = {
  hero: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
  small: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
  large: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
  crown: "https://images.unsplash.com/photo-1677026010083-78ec7f1b84ed?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
  bridge: "https://images.unsplash.com/photo-1575278616937-d474f5fda9a6?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
};

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
            className="mb-5 sm:mb-7">
            <span className="block font-heading text-2xl font-bold tracking-tight text-brand-red sm:text-3xl lg:text-4xl">Shree Dental Lab</span>
            <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.22em] text-brand-taupe sm:text-sm">Precision · Quality · Trust · Serving dentists across India</span>
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="font-clamp-hero font-heading font-medium leading-[1.06] tracking-[-0.03em] text-brand-graphite">
            Premium zirconia crowns &amp; bridges<br className="hidden sm:block" />
            <span className="sm:hidden"> </span>for dental professionals<br className="hidden sm:block" />
            <span className="sm:hidden"> </span>who demand a perfect fit.
          </motion.h1>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-8 sm:mt-12">
            <p className="mb-5 max-w-xl text-base font-medium leading-relaxed text-brand-graphite sm:text-lg">
              New here? Tap <span className="font-bold text-brand-red">Place New Order</span> to register your clinic and send your first case. Already with us? Use <span className="font-bold text-brand-graphite">Dentist Login</span>.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
              <RollButton to="/register" label="Place New Order" variant="red" size="lg" dataTestid="hero-place-order-btn" />
              <RollButton to="/login" label="Dentist Login" variant="white" size="lg" dataTestid="hero-login-btn" />
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

          {/* content */}
          <div className="grid gap-10 px-5 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-14 lg:px-12">
            <div className="order-2 lg:order-1">
              <p className="max-w-md text-base font-medium leading-[1.7] text-brand-graphite sm:text-lg">
                Through digital design, precision milling and meticulous finishing, we help dentists deliver beautiful, durable zirconia restorations — case after case, on reliable timelines.
              </p>
              <RollButton to="/about" label="About our studio" variant="red" className="mt-8" />
              <div className="mt-10 grid grid-cols-3 gap-4 border-t border-brand-taupe/15 pt-7">
                <Stat n="10k+" l="Units delivered" />
                <Stat n="4 days" l="Avg. turnaround" />
                <Stat n="99%" l="Fit accuracy" />
              </div>
            </div>
            <div className="order-1 grid grid-cols-2 gap-4 sm:gap-5 lg:order-2">
              <img src={IMG.small} alt="Zirconia restoration detail" className="aspect-[3/4] w-full rounded-2xl object-cover lg:mt-10" />
              <img src={IMG.large} alt="Shree Dental Lab" className="aspect-[3/4] w-full rounded-2xl object-cover" />
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
                <Link to="/register" className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-brand-charcoal">
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
        </div>
      </section>

      {/* SECTION 4 — HOW TO ORDER (white) */}
      <section className="bg-white py-16 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-6 flex items-center gap-3 px-5 sm:px-8 lg:px-12">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-charcoal text-[11px] font-semibold text-white sm:h-7 sm:w-7 sm:text-xs">3</span>
            <span className="rounded-full border border-brand-taupe/40 px-3 py-1 text-xs font-medium text-brand-graphite sm:px-4 sm:py-1.5 sm:text-[13px]">How to order</span>
          </div>
          <h2 className="font-clamp-h2 mb-12 px-5 font-heading font-medium leading-[1.12] tracking-[-0.02em] text-brand-graphite sm:mb-16 sm:px-8 lg:px-12">
            Ordering made effortless — in three simple steps
          </h2>
          <div className="grid gap-10 px-5 sm:gap-8 sm:px-8 md:grid-cols-3 lg:gap-12 lg:px-12">
            {[["Place & upload", "Create patients, tap teeth on the FDI chart, set shades, and upload scans or ship impressions."],
              ["We manufacture", "Design, milling, sintering and glazing — with live status and WhatsApp updates."],
              ["Dispatch & deliver", "Track courier, download GST invoices and receive your fitted restorations."]].map(([t, d], i) => (
              <div key={t}>
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-red font-heading text-2xl font-bold text-white shadow-md ring-4 ring-brand-red/15">{i + 1}</span>
                <h3 className="mt-5 font-heading text-2xl font-bold text-brand-graphite">{t}</h3>
                <p className="mt-3 text-base leading-relaxed text-brand-graphite/80">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-brand-charcoal py-16 text-center text-white sm:py-20">
        <h2 className="font-heading text-3xl font-bold sm:text-4xl lg:text-5xl">Ready to place your first case?</h2>
        <p className="mx-auto mt-4 max-w-xl px-5 text-base text-white/75 sm:text-lg">See live volume pricing, upload your scans and track every stage — start in under two minutes.</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 px-5 sm:flex-row sm:gap-5">
          <RollButton to="/register" label="Register your clinic" variant="red" size="lg" dataTestid="cta-register-btn" />
          <RollButton to="/login" label="Dentist Login" variant="white" size="lg" dataTestid="cta-login-btn" />
        </div>
      </section>
    </PublicLayout>
  );
}

function Stat({ n, l }) {
  return (
    <div>
      <p className="font-heading text-2xl font-bold tracking-tight text-brand-red sm:text-3xl">{n}</p>
      <p className="mt-1 text-xs leading-tight text-brand-taupe">{l}</p>
    </div>
  );
}
