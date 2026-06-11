import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-heading text-2xl font-bold text-brand-graphite sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-brand-taupe">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, accent = "red", icon: Icon, testid }) {
  const colors = {
    red: "bg-brand-red/10 text-brand-red",
    gold: "bg-brand-gold/15 text-[#8a6d2f]",
    charcoal: "bg-brand-charcoal/5 text-brand-charcoal",
    green: "bg-green-100 text-green-700",
  };
  return (
    <div data-testid={testid} className="card-hover rounded-2xl border border-brand-taupe/15 bg-white p-5 brand-shadow">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-taupe">{label}</p>
        {Icon && <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", colors[accent])}><Icon className="h-4 w-4" /></span>}
      </div>
      <p className="mt-3 font-heading text-3xl font-bold tabular text-brand-graphite">{value}</p>
    </div>
  );
}

export function Card({ children, className }) {
  return <div className={cn("rounded-2xl border border-brand-taupe/15 bg-white p-5 sm:p-6 brand-shadow", className)}>{children}</div>;
}

export function Btn({ children, variant = "primary", className, ...props }) {
  const v = {
    primary: "bg-brand-red text-white hover:bg-brand-ruby",
    outline: "border border-brand-taupe/40 text-brand-graphite hover:bg-brand-ivory",
    gold: "bg-brand-gold text-brand-charcoal hover:brightness-105",
    ghost: "text-brand-red hover:bg-brand-red/10",
    dark: "bg-brand-charcoal text-white hover:bg-black",
  }[variant];
  return (
    <button className={cn("inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60", v, className)} {...props}>
      {children}
    </button>
  );
}

export function Field({ label, children, required }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-brand-taupe">{label}{required && " *"}</label>
      {children}
    </div>
  );
}

export const inputCls = "w-full rounded-lg border border-brand-taupe/30 bg-white px-3 py-2.5 outline-none focus:border-brand-red";
