import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Premium text-roll button with rotating arrow circle.
 * variant: red | dark | white | gold
 */
export function RollButton({ to, href, onClick, label, variant = "red", className, dataTestid }) {
  const base = {
    red: "bg-brand-red text-white hover:bg-brand-ruby",
    dark: "bg-brand-charcoal text-white hover:bg-black",
    white: "bg-white text-brand-graphite shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]",
    gold: "bg-brand-gold text-brand-charcoal hover:brightness-105",
  }[variant];
  const circle = {
    red: "bg-white text-brand-red",
    dark: "bg-white text-brand-charcoal",
    white: "bg-brand-charcoal text-white",
    gold: "bg-brand-charcoal text-white",
  }[variant];

  const inner = (
    <>
      <span className="relative block h-5 overflow-hidden">
        <span className="roll-track flex flex-col">
          <span className="flex h-5 items-center whitespace-nowrap">{label}</span>
          <span className="flex h-5 items-center whitespace-nowrap">{label}</span>
        </span>
      </span>
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45", circle)}>
        <ArrowRight className="h-4 w-4" />
      </span>
    </>
  );
  const cls = cn("group inline-flex items-center gap-3 rounded-full py-2 pl-5 pr-2 text-sm font-medium transition-colors duration-300", base, className);

  if (to) return <Link to={to} data-testid={dataTestid} className={cls}>{inner}</Link>;
  if (href) return <a href={href} data-testid={dataTestid} className={cls}>{inner}</a>;
  return <button onClick={onClick} data-testid={dataTestid} className={cls}>{inner}</button>;
}
