import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { PortalShell, Spinner } from "@/components/Layout";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";

import Home from "@/pages/public/Home";
import About from "@/pages/public/About";
import Contact from "@/pages/public/Contact";
import Login from "@/pages/public/Login";
import Register from "@/pages/public/Register";

import DentistDashboard from "@/pages/dentist/DentistDashboard";
import Profile from "@/pages/dentist/Profile";
import Patients from "@/pages/dentist/Patients";
import NewOrder from "@/pages/dentist/NewOrder";
import Orders from "@/pages/dentist/Orders";
import OrderDetail from "@/pages/dentist/OrderDetail";
import MyPricing from "@/pages/dentist/MyPricing";
import Invoices from "@/pages/dentist/Invoices";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import ProductionBoard from "@/pages/admin/ProductionBoard";
import Dentists from "@/pages/admin/Dentists";
import Catalog from "@/pages/admin/Catalog";
import Offers from "@/pages/admin/Offers";
import Users from "@/pages/admin/Users";
import Settings from "@/pages/admin/Settings";
import WhatsAppLogs from "@/pages/admin/WhatsAppLogs";
import Reports from "@/pages/admin/Reports";

function ChangePassword() {
  const { refresh } = useAuth();
  const [pw, setPw] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    try { await api.post("/auth/change-password", { new_password: pw }); toast.success("Password updated"); await refresh(); }
    catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-ivory p-6">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-8 brand-shadow">
        <h2 className="font-heading text-2xl font-bold">Set a new password</h2>
        <p className="mt-1 text-sm text-brand-taupe">For your security, please change the default password.</p>
        <input type="password" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password"
          className="mt-5 w-full rounded-lg border border-brand-taupe/30 px-3 py-2.5 outline-none focus:border-brand-red" data-testid="new-password-input" />
        <button className="mt-5 w-full rounded-full bg-brand-red py-3 font-semibold text-white hover:bg-brand-ruby" data-testid="set-password-btn">Update Password</button>
      </form>
    </div>
  );
}

function Protected({ children }) {
  const { user, booting } = useAuth();
  if (booting || user === null) return <div className="min-h-screen bg-brand-ivory"><Spinner label="Loading..." /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <ChangePassword />;
  return <PortalShell>{children}</PortalShell>;
}

function DashboardSwitch() {
  const { user } = useAuth();
  return user?.role === "dentist" ? <DentistDashboard /> : <AdminDashboard />;
}

function AdminOnly({ children }) {
  const { user } = useAuth();
  return user?.role === "admin" ? children : <Navigate to="/app" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/app" element={<Protected><DashboardSwitch /></Protected>} />
          <Route path="/app/profile" element={<Protected><Profile /></Protected>} />
          <Route path="/app/patients" element={<Protected><Patients /></Protected>} />
          <Route path="/app/new-order" element={<Protected><NewOrder /></Protected>} />
          <Route path="/app/orders" element={<Protected><Orders /></Protected>} />
          <Route path="/app/orders/:id" element={<Protected><OrderDetail /></Protected>} />
          <Route path="/app/my-pricing" element={<Protected><MyPricing /></Protected>} />
          <Route path="/app/invoices" element={<Protected><Invoices /></Protected>} />

          <Route path="/app/board" element={<Protected><ProductionBoard /></Protected>} />
          <Route path="/app/dentists" element={<Protected><AdminOnly><Dentists /></AdminOnly></Protected>} />
          <Route path="/app/catalog" element={<Protected><AdminOnly><Catalog /></AdminOnly></Protected>} />
          <Route path="/app/offers" element={<Protected><AdminOnly><Offers /></AdminOnly></Protected>} />
          <Route path="/app/users" element={<Protected><AdminOnly><Users /></AdminOnly></Protected>} />
          <Route path="/app/settings" element={<Protected><AdminOnly><Settings /></AdminOnly></Protected>} />
          <Route path="/app/whatsapp" element={<Protected><AdminOnly><WhatsAppLogs /></AdminOnly></Protected>} />
          <Route path="/app/reports" element={<Protected><AdminOnly><Reports /></AdminOnly></Protected>} />

          <Route path="/orders/:id" element={<Protected><OrderDetail /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
