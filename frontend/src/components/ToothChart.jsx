import { cn } from "@/lib/utils";

const Q = {
  upper_right: [18, 17, 16, 15, 14, 13, 12, 11],
  upper_left: [21, 22, 23, 24, 25, 26, 27, 28],
  lower_right: [48, 47, 46, 45, 44, 43, 42, 41],
  lower_left: [31, 32, 33, 34, 35, 36, 37, 38],
};

function Tooth({ n, active, onClick }) {
  return (
    <button
      type="button"
      data-testid={`fdi-tooth-${n}`}
      onClick={() => onClick(n)}
      className={cn(
        "relative flex h-11 w-9 sm:h-12 sm:w-10 items-center justify-center rounded-md border text-xs font-bold transition-all duration-200",
        active
          ? "bg-brand-red text-white border-brand-ruby shadow-md scale-105"
          : "bg-white text-brand-graphite border-brand-taupe/30 hover:border-brand-red hover:text-brand-red"
      )}
    >
      {n}
    </button>
  );
}

export default function ToothChart({ selected = [], onToggle }) {
  const isSel = (n) => selected.includes(n);
  const row = (arr) => (
    <div className="flex gap-1">
      {arr.map((n) => (
        <Tooth key={n} n={n} active={isSel(n)} onClick={onToggle} />
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
