import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api, { LOGO_MARK as LOGO } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, PlusCircle, Package, Users, Tag, FileText, User, Boxes,
  KanbanSquare, Stethoscope, MessageSquare, BarChart3, Settings, LogOut, Menu, X, Bell, Palette,
} from "lucide-react";

const NAV = {
  dentist: [
    { to: "/app", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/app/new-order", icon: PlusCircle, label: "New Order" },
    { to: "/app/orders", icon: Package, label: "My Orders" },
    { to: "/app/patients", icon: Users, label: "Patients" },
    { to: "/app/my-pricing", icon: Tag, label: "My Pricing" },
    { to: "/app/invoices", icon: FileText, label: "Invoices" },
    { to: "/app/profile", icon: User, label: "Billing Profile" },
  ],
  admin: [
    { to: "/app", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/app/orders", icon: Package, label: "Orders" },
    { to: "/app/board", icon: KanbanSquare, label: "Production Board" },
    { to: "/app/dentists", icon: Stethoscope, label: "Dentists" },
    { to: "/app/catalog", icon: Boxes, label: "Pricing Master" },
    { to: "/app/offers", icon: Tag, label: "Offers" },
    { to: "/app/users", icon: Users, label: "Team" },
    { to: "/app/whatsapp", icon: MessageSquare, label: "WhatsApp Logs" },
    { to: "/app/reports", icon: BarChart3, label: "Reports" },
    { to: "/app/settings", icon: Settings, label: "Settings" },
  ],
  employee: [
    { to: "/app", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/app/orders", icon: Package, label: "Orders" },
    { to: "/app/board", icon: KanbanSquare, label: "Production Board" },
  ],
  designer: [
    { to: "/app", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/app/orders", icon: Palette, label: "My Assignments" },
  ],
};

function NotifBell() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const load = async () => {
    try { const { data } = await api.get("/notifications"); setItems(data); } catch {}
  };
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);
  const unread = items.filter((i) => !i.read).length;
  return (
    <div className="relative">
      <button data-testid="notif-bell" onClick={() => { setOpen(!open); if (!open) api.post("/notifications/read-all").then(load); }}
        className="relative rounded-full p-2 hover:bg-brand-ivory">
        <Bell className="h-5 w-5 text-brand-graphite" />
        {unread > 0 && <span className="absolute -right-0 -top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-h-96 overflow-auto rounded-xl border bg-white p-2 brand-shadow">
          {items.length === 0 && <p className="p-4 text-sm text-brand-taupe">No notifications yet.</p>}
          {items.map((n) => (
            <div key={n.id} className="rounded-lg p-3 hover:bg-brand-ivory">
              <p className="text-sm font-semibold text-brand-graphite">{n.title}</p>
              <p className="text-xs text-brand-taupe">{n.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PortalShell({ children }) {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = NAV[user?.role] || [];

  const isActive = (it) => (it.end ? loc.pathname === it.to : loc.pathname.startsWith(it.to));

  const SideContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 bg-brand-charcoal px-5 py-4">
        <img src={LOGO} alt="Shree Dental Lab" className="h-10 w-10 rounded-md object-cover" />
        <div>
          <p className="font-heading text-sm font-bold text-white leading-tight">Shree Dental Lab</p>
          <p className="text-[10px] uppercase tracking-widest text-brand-gold">Precision · Quality · Trust</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((it) => (
          <Link key={it.to} to={it.to} data-testid={`nav-${it.label.toLowerCase().replace(/\s+/g, "-")}`}
            onClick={() => setMobileOpen(false)}
            className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              isActive(it) ? "bg-brand-red text-white" : "text-brand-graphite hover:bg-brand-ivory")}>
            <it.icon className="h-4 w-4" /> {it.label}
          </Link>
        ))}
      </nav>
      <div className="border-t p-3">
        <p className="px-3 text-xs text-brand-taupe">{user?.name}</p>
        <p className="px-3 text-[11px] uppercase tracking-wider text-brand-gold">{user?.role}</p>
        <button data-testid="logout-btn" onClick={() => { logout(); nav("/"); }}
          className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-brand-red hover:bg-brand-red/10">
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-brand-ivory">
      <aside className="hidden w-64 shrink-0 border-r bg-white lg:block">
        <div className="sticky top-0 h-screen"><SideContent /></div>
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-white"><SideContent /></div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-white/90 px-4 py-3 backdrop-blur">
          <button className="lg:hidden" onClick={() => setMobileOpen(true)} data-testid="mobile-menu-btn">
            <Menu className="h-6 w-6 text-brand-graphite" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <NotifBell />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PublicNav() {
  const [open, setOpen] = useState(false);
  const links = [
    { to: "/", label: "Home" },
    { to: "/about", label: "About" },
    { to: "/products", label: "Products" },
    { to: "/zirconia", label: "Zirconia C&B" },
    { to: "/contact", label: "Contact" },
  ];
  return (
    <header className="sticky top-0 z-40 bg-brand-charcoal text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-3" data-testid="logo-link">
          <img src={LOGO} alt="Shree Dental Lab" className="h-11 w-11 rounded-md object-cover" />
          <div className="leading-tight">
            <p className="font-heading text-base font-bold">Shree Dental Lab</p>
            <p className="text-[10px] uppercase tracking-widest text-brand-gold">Precision · Quality · Trust</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="text-sm font-medium text-white/80 transition hover:text-brand-gold">{l.label}</Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link to="/login" data-testid="nav-login-btn" className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold hover:border-brand-gold hover:text-brand-gold">Dentist Login</Link>
          <Link to="/register" data-testid="nav-register-btn" className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold transition hover:bg-brand-ruby">Register</Link>
        </div>
        <button className="md:hidden" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      </div>
      {open && (
        <div className="space-y-1 border-t border-white/10 px-4 pb-4 md:hidden">
          {links.map((l) => <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="block py-2 text-sm">{l.label}</Link>)}
          <div className="flex gap-2 pt-2">
            <Link to="/login" className="flex-1 rounded-full border border-white/30 py-2 text-center text-sm">Login</Link>
            <Link to="/register" className="flex-1 rounded-full bg-brand-red py-2 text-center text-sm">Register</Link>
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-brand-charcoal text-white/70">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <img src={LOGO} alt="logo" className="h-12 w-12 rounded-md object-cover" />
            <p className="font-heading text-lg font-bold text-white">Shree Dental Lab</p>
          </div>
          <p className="mt-3 text-sm">Premium zirconia crowns & bridges for dental professionals across India.</p>
        </div>
        <div>
          <p className="font-heading font-semibold text-white">Company</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/about" className="hover:text-brand-gold">About Us</Link></li>
            <li><Link to="/products" className="hover:text-brand-gold">Products</Link></li>
            <li><Link to="/zirconia" className="hover:text-brand-gold">Zirconia Crown & Bridge</Link></li>
            <li><Link to="/contact" className="hover:text-brand-gold">Contact</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-heading font-semibold text-white">For Dentists</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/register" className="hover:text-brand-gold">Register Clinic</Link></li>
            <li><Link to="/login" className="hover:text-brand-gold">Dentist Login</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs">© {new Date().getFullYear()} Shree Dental Lab. Precision · Quality · Trust.</div>
    </footer>
  );
}

export function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-brand-ivory">
      <PublicNav />
      {children}
      <Footer />
    </div>
  );
}

export function Spinner({ label }) {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-brand-taupe">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-red border-t-transparent" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
