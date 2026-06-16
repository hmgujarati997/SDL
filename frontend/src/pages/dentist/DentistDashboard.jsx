import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { inr, fmtDate } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, StatCard, Card, Btn } from "@/components/UI";
import { Spinner } from "@/components/Layout";
import { StatusBadge, PayBadge } from "@/components/StatusBadge";
import { Package, Clock, Factory, Truck, CheckCircle2, IndianRupee, PlusCircle, Wallet, Sparkles, AlertTriangle, ChevronRight } from "lucide-react";
import cerconImg from "@/assets/cercon-xt-multilayer.jpg";

export default function DentistDashboard() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const billingDone = user?.dentist?.billing_complete;

  useEffect(() => { api.get("/dentist/dashboard").then(({ data }) => setD(data)).catch(() => {}); }, []);
  if (!d) return <Spinner label="Loading dashboard..." />;

  return (
    <div>
      <PageHeader title={`Welcome, ${user?.name?.split(" ").slice(0, 2).join(" ")}`} subtitle="Here's an overview of your cases."
        action={<div className="flex flex-wrap gap-2">
          <Link to="/app/new-order"><Btn data-testid="place-order-button"><PlusCircle className="h-4 w-4" />Place New Order</Btn></Link>
          <Link to="/app/patients"><Btn variant="outline">Add Patient</Btn></Link>
        </div>} />

      {!billingDone && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-4">
          <AlertTriangle className="h-5 w-5 text-brand-gold" />
          <p className="text-sm text-brand-graphite">Complete your <Link to="/app/profile" className="font-semibold text-brand-red underline">billing profile</Link> to place paid orders.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard testid="stat-total" label="Total Orders" value={d.total} icon={Package} />
        <StatCard testid="stat-in-progress" label="Work in Progress" value={d.in_progress} icon={Factory} accent="charcoal" />
        <StatCard label="Dispatched" value={d.dispatched} icon={Truck} accent="gold" />
        <StatCard label="Delivered" value={d.delivered} icon={CheckCircle2} accent="green" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="order-2 lg:order-1 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-heading text-lg font-bold">Recent Orders</h3>
            <Link to="/app/orders" className="text-sm font-semibold text-brand-red">View all</Link>
          </div>
          {d.recent_orders.length === 0 && <p className="py-8 text-center text-sm text-brand-taupe">No orders yet. Place your first order!</p>}
          <div className="space-y-3">
            {d.recent_orders.map((o) => (
              <Link to={`/app/orders/${o.id}`} key={o.id} className="flex items-center justify-between rounded-xl border border-brand-taupe/15 p-3 hover:bg-brand-ivory">
                <div>
                  <p className="font-semibold text-brand-graphite">{o.batch_no}</p>
                  <p className="text-xs text-brand-taupe">{fmtDate(o.created_at)} · {inr(o.amounts.total)}</p>
                </div>
                <StatusBadge status={o.status} />
              </Link>
            ))}
          </div>
        </Card>

        <div className="order-1 space-y-5 lg:order-2">
          {/* Cercon premium material promo */}
          <Card data-testid="cercon-product-card" className="p-4">
            <div className="flex items-start gap-3">
              <img src={cerconImg} alt="Cercon xt Multilayer zirconia disc by Dentsply Sirona"
                className="h-16 w-16 shrink-0 rounded-lg border border-brand-taupe/15 bg-white object-contain" />
              <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-heading text-base font-bold leading-tight text-brand-graphite">Cercon</h3>
                  <p className="mt-0.5 text-xs text-brand-taupe">Dentsply Sirona · with box and card</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-heading text-xl font-bold leading-none text-brand-red">₹1,250</p>
                  <p className="text-xs text-brand-taupe">/ tooth</p>
                </div>
              </div>
            </div>

            {/* Certification badge */}
            <div className="mt-3 overflow-hidden rounded-lg border border-brand-taupe/20">
              <div className="bg-[#1f3a93] px-3 py-1.5 text-center">
                <p className="font-heading text-sm font-bold leading-none text-white">Cercon<sup className="text-[8px]">®</sup></p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-white/90">Premium Zirconium Oxide</p>
              </div>
              <div className="flex items-center justify-center gap-1.5 bg-white px-3 py-1.5 text-center">
                <span className="text-xs font-bold text-brand-graphite">Certified Quality ·</span>
                <span className="text-xs font-extrabold text-brand-red">Made in Germany</span>
              </div>
            </div>
          </Card>

          {/* Launch offer black box */}
          <Link to="/app/my-pricing" data-testid="launch-offer-card" className="group block">
            <Card className="relative overflow-hidden bg-gradient-to-br from-brand-charcoal to-[#1c1416] text-white transition-transform duration-200 group-hover:-translate-y-0.5">
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand-gold/20 blur-2xl" />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-gold px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-charcoal">
                <Sparkles className="h-3.5 w-3.5" /> Launch Offer
              </span>
              <p className="mt-4 font-heading text-2xl font-bold leading-tight">Special launch pricing<br />on every order</p>
              <p className="mt-2 text-sm text-white/70">Enjoy volume slab discounts and limited-time launch rates. Tap to see your personalised rate card.</p>
              <span className="mt-5 inline-flex items-center gap-2 text-2xl font-bold text-brand-gold">View My Pricing <ChevronRight className="h-6 w-6 transition-transform group-hover:translate-x-1" /></span>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
