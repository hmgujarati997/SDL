import { useEffect, useState } from "react";
import api, { LOGO_MARK } from "@/lib/api";

// Module-level cache so the public settings (logo / favicon / name) are fetched once
// and shared across the header, footer, sidebar and favicon manager.
let cache = null;
const subs = new Set();

export function refreshBranding() {
  return api
    .get("/settings/public")
    .then(({ data }) => {
      cache = data.lab || {};
      subs.forEach((fn) => fn(cache));
      return cache;
    })
    .catch(() => {});
}

export function useBranding() {
  const [lab, setLab] = useState(cache);
  useEffect(() => {
    const fn = (l) => setLab({ ...l });
    subs.add(fn);
    if (cache) setLab(cache);
    else refreshBranding();
    return () => subs.delete(fn);
  }, []);
  return {
    logo: (lab && lab.logo_url) || LOGO_MARK,
    favicon: (lab && lab.favicon_url) || "",
    name: (lab && lab.name) || "Shree Dental Lab",
  };
}

// Applies the uploaded favicon to the document head site-wide.
export function FaviconManager() {
  const { favicon } = useBranding();
  useEffect(() => {
    if (!favicon) return;
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = favicon;
    const apple = document.querySelector("link[rel='apple-touch-icon']");
    if (apple) apple.href = favicon;
  }, [favicon]);
  return null;
}
