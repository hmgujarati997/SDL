import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Premium text-roll button with rotating arrow circle.
 * variant: red | dark | white | gold
 */
export function RollButton({ to, href, onClick, label, variant = "red", size = "md", className, dataTestid }) {
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

  const sz = {
    md: { wrap: "gap-3 py-2 pl-5 pr-2 text-sm", track: "h-5", circle: "h-8 w-8", arrow: "h-4 w-4" },
    lg: { wrap: "gap-4 py-3 pl-8 pr-3 text-lg sm:text-xl", track: "h-7 sm:h-8", circle: "h-12 w-12 sm:h-14 sm:w-14", arrow: "h-5 w-5 sm:h-6 sm:w-6" },
  }[size];

  const inner = (
    <>
      <span className={cn("relative block overflow-hidden", sz.track)}>
        <span className="roll-track flex flex-col">
          <span className={cn("flex items-center whitespace-nowrap", sz.track)}>{label}</span>
          <span className={cn("flex items-center whitespace-nowrap", sz.track)}>{label}</span>
        </span>
      </span>
      <span className={cn("flex shrink-0 items-center justify-center rounded-full transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45", sz.circle, circle)}>
        <ArrowRight className={sz.arrow} />
      </span>
    </>
  );
  const cls = cn("group inline-flex items-center rounded-full font-semibold transition-colors duration-300", sz.wrap, base, className);

  if (to) return <Link to={to} data-testid={dataTestid} className={cls}>{inner}</Link>;
  if (href) return <a href={href} data-testid={dataTestid} className={cls}>{inner}</a>;
  return <button onClick={onClick} data-testid={dataTestid} className={cls}>{inner}</button>;
}
