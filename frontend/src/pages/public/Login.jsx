import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiError, LOGO_MARK as LOGO } from "@/lib/api";
import Seo from "@/components/Seo";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      nav("/app");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-brand-charcoal lg:flex-row">
      <Seo
        path="/login"
        title="Dentist Login | Shree Dental Lab — Dental Lab Portal India"
        description="Login to your Shree Dental Lab dentist portal to track cases, view pricing, download GST invoices and place new zirconia crown & bridge orders from anywhere in India."
        keywords="dentist login, dental lab portal India, Shree Dental Lab login"
      />
      <div className="hidden flex-1 flex-col justify-center bg-gradient-to-br from-brand-charcoal to-[#1c1416] p-12 text-white lg:flex">
        <img src={LOGO} alt="logo" className="h-16 w-16 rounded-lg object-cover" />
        <h1 className="mt-8 font-heading text-4xl font-bold">Welcome back, Doctor.</h1>
        <p className="mt-4 max-w-md text-white/70">Track your cases, view pricing, download invoices and place new orders — all in one place.</p>
        <p className="mt-10 text-xs uppercase tracking-widest text-brand-gold">Precision · Quality · Trust</p>
      </div>
      <div className="flex flex-1 items-center justify-center bg-brand-ivory p-6">
        <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-8 brand-shadow">
          <Link to="/" className="mb-6 flex items-center gap-3 lg:hidden">
            <img src={LOGO} className="h-10 w-10 rounded-md object-cover" alt="logo" />
            <span className="font-heading font-bold">Shree Dental Lab</span>
          </Link>
          <h2 className="font-heading text-2xl font-bold">Login to your portal</h2>
          <label className="mb-1 mt-6 block text-sm text-brand-taupe">Email</label>
          <input data-testid="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-brand-taupe/30 px-3 py-2.5 outline-none focus:border-brand-red" />
          <label className="mb-1 mt-4 block text-sm text-brand-taupe">Password</label>
          <input data-testid="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-brand-taupe/30 px-3 py-2.5 outline-none focus:border-brand-red" />
          <button data-testid="login-submit" disabled={loading}
            className="mt-6 w-full rounded-full bg-brand-red py-3 font-semibold text-white transition hover:bg-brand-ruby disabled:opacity-60">
            {loading ? "Signing in..." : "Login"}
          </button>
          <p className="mt-5 text-center text-sm text-brand-taupe">
            New clinic? <Link to="/register" className="font-semibold text-brand-red">Register here</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
