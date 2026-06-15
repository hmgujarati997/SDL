import { cn } from "@/lib/utils";

const Q = {
  upper_right: [18, 17, 16, 15, 14, 13, 12, 11],
  upper_left: [21, 22, 23, 24, 25, 26, 27, 28],
  lower_right: [48, 47, 46, 45, 44, 43, 42, 41],
  lower_left: [31, 32, 33, 34, 35, 36, 37, 38],
};

const ACTIVE = {
  red: "bg-brand-red text-white border-brand-ruby shadow-md scale-105",
  gold: "bg-brand-gold text-brand-charcoal border-brand-gold shadow-md scale-105",
};
const HOVER = {
  red: "hover:border-brand-red hover:text-brand-red",
  gold: "hover:border-brand-gold hover:text-brand-gold",
};

function Tooth({ n, color, brushColor, onClick }) {
  const active = !!color;
  return (
    <button
      type="button"
      data-testid={`fdi-tooth-${n}`}
      onClick={() => onClick(n)}
      className={cn(
        "relative flex h-11 w-9 sm:h-12 sm:w-10 items-center justify-center rounded-md border text-xs font-bold transition-all duration-200",
        active
          ? ACTIVE[color] || ACTIVE.red
          : `bg-white text-brand-graphite border-brand-taupe/30 ${HOVER[brushColor] || HOVER.red}`
      )}
    >
      {n}
    </button>
  );
}

/**
 * Shared mouth chart. `toothColors` maps a tooth number to its colour
 * ("red" | "gold"), so multiple products can be marked on the same mouth.
 * `brushColor` is the currently selected tier's colour (used for hover hints).
 */
export default function ToothChart({ toothColors = {}, brushColor = "red", onToggle }) {
  const row = (arr) => (
    <div className="flex gap-1">
      {arr.map((n) => (
        <Tooth key={n} n={n} color={toothColors[n]} brushColor={brushColor} onClick={onToggle} />
      ))}
    </div>
  );
  return (
    <div className="rounded-xl border border-brand-taupe/20 bg-brand-ivory p-3 sm:p-5">
      <div className="overflow-x-auto">
        <div className="min-w-[640px] space-y-2">
          <div className="flex items-center justify-center gap-3">
            {row(Q.upper_right)}
            <div className="h-12 w-px bg-brand-taupe/30" />
            {row(Q.upper_left)}
          </div>
          <div className="flex items-center justify-center">
            <span className="text-[10px] uppercase tracking-widest text-brand-taupe">Upper · Lower (FDI)</span>
          </div>
          <div className="flex items-center justify-center gap-3">
            {row(Q.lower_right)}
            <div className="h-12 w-px bg-brand-taupe/30" />
            {row(Q.lower_left)}
          </div>
        </div>
      </div>
    </div>
  );
}
