import { useEffect, useState } from "react";
import api from "@/lib/api";

// Fixed palette — literal class strings so Tailwind JIT includes them.
export const PALETTE = {
  red: { badge: "bg-brand-red/10 text-brand-red border-brand-red/20", dot: "bg-brand-red", swatch: "bg-brand-red" },
  amber: { badge: "bg-amber-100 text-amber-800 border-amber-200", dot: "bg-amber-500", swatch: "bg-amber-500" },
  blue: { badge: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500", swatch: "bg-blue-500" },
  indigo: { badge: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500", swatch: "bg-indigo-500" },
  purple: { badge: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500", swatch: "bg-purple-500" },
  gold: { badge: "bg-brand-gold/15 text-[#8a6d2f] border-brand-gold/30", dot: "bg-brand-gold", swatch: "bg-brand-gold" },
  teal: { badge: "bg-teal-50 text-teal-700 border-teal-200", dot: "bg-teal-500", swatch: "bg-teal-500" },
  green: { badge: "bg-green-100 text-green-800 border-green-200", dot: "bg-green-500", swatch: "bg-green-500" },
  orange: { badge: "bg-orange-100 text-orange-800 border-orange-200", dot: "bg-orange-500", swatch: "bg-orange-500" },
  gray: { badge: "bg-gray-200 text-gray-600 border-gray-300", dot: "bg-gray-400", swatch: "bg-gray-400" },
};

export function colorClasses(color) {
  return PALETTE[color] || PALETTE.gray;
}

let _cache = null;
let _promise = null;

export function invalidateStatuses() {
  _cache = null;
  _promise = null;
}

export function useStatuses() {
  const [list, setList] = useState(_cache);
  useEffect(() => {
    if (_cache) { setList(_cache); return; }
    if (!_promise) _promise = api.get("/statuses").then(({ data }) => { _cache = data; return data; }).catch(() => []);
    let mounted = true;
    _promise.then((d) => { if (mounted) setList(d); });
    return () => { mounted = false; };
  }, []);
  return list;
}
