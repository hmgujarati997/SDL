import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiError, LOGO_MARK as LOGO } from "@/lib/api";
import Seo from "@/components/Seo";
import { toast } from "sonner";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", clinic_name: "", email: "", mobile: "", whatsapp: "", password: "" });
  const [loading, setLoading] = useState(false);
  const upd = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(f);
      toast.success("Account created! Complete your billing profile to start ordering.");
      nav("/app/profile");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-brand-charcoal lg:flex-row">
      <Seo
        path="/register"
        title="Register Your Clinic | Shree Dental Lab — Dental Lab in India"
        description="Register your dental clinic with Shree Dental Lab to get personalised volume pricing, fast turnaround and full case tracking. Serving dentists in Mumbai, Ahmedabad, Delhi, Jaipur, Udaipur, Bhopal, Indore, Pune & across India."
        keywords="register dental lab India, dental lab online ordering, zirconia crown lab signup, dental laboratory Mumbai Delhi Pune Ahmedabad"
      />
      <div className="hidden flex-1 flex-col justify-center bg-gradient-to-br from-brand-charcoal to-[#1c1416] p-12 text-white lg:flex">
        <img src={LOGO} alt="logo" className="h-16 w-16 rounded-lg object-cover" />
        <h1 className="mt-8 font-heading text-4xl font-bold">Register your clinic</h1>
        <p className="mt-4 max-w-md text-white/70">Get personalised pricing, volume discounts and full case tracking. Approval is quick.</p>
        <p className="mt-10 text-xs uppercase tracking-widest text-brand-gold">Precision · Quality · Trust</p>
      </div>
      <div className="flex flex-1 items-center justify-center bg-brand-ivory p-6">
        <form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white p-8 brand-shadow">
          <h2 className="font-heading text-2xl font-bold">Create your account</h2>
          <p className="mt-1 text-sm text-brand-taupe">You can complete full billing details next.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><label className="mb-1 block text-sm text-brand-taupe">Dentist Name *</label>
              <input data-testid="reg-name" required value={f.name} onChange={upd("name")} className="w-full rounded-lg border border-brand-taupe/30 px-3 py-2.5 outline-none focus:border-brand-red" /></div>
            <div><label className="mb-1 block text-sm text-brand-taupe">Clinic Name</label>
              <input data-testid="reg-clinic" value={f.clinic_name} onChange={upd("clinic_name")} className="w-full rounded-lg border border-brand-taupe/30 px-3 py-2.5 outline-none focus:border-brand-red" /></div>
            <div><label className="mb-1 block text-sm text-brand-taupe">Email *</label>
              <input data-testid="reg-email" type="email" required value={f.email} onChange={upd("email")} className="w-full rounded-lg border border-brand-taupe/30 px-3 py-2.5 outline-none focus:border-brand-red" /></div>
            <div><label className="mb-1 block text-sm text-brand-taupe">Mobile *</label>
              <input data-testid="reg-mobile" required value={f.mobile} onChange={upd("mobile")} className="w-full rounded-lg border border-brand-taupe/30 px-3 py-2.5 outline-none focus:border-brand-red" /></div>
            <div><label className="mb-1 block text-sm text-brand-taupe">WhatsApp Number</label>
              <input data-testid="reg-whatsapp" value={f.whatsapp} onChange={upd("whatsapp")} placeholder="Notifications go here" className="w-full rounded-lg border border-brand-taupe/30 px-3 py-2.5 outline-none focus:border-brand-red" /></div>
            <div><label className="mb-1 block text-sm text-brand-taupe">Password *</label>
              <input data-testid="reg-password" type="password" required value={f.password} onChange={upd("password")} className="w-full rounded-lg border border-brand-taupe/30 px-3 py-2.5 outline-none focus:border-brand-red" /></div>
          </div>
          <button data-testid="reg-submit" disabled={loading}
            className="mt-6 w-full rounded-full bg-brand-red py-3 font-semibold text-white transition hover:bg-brand-ruby disabled:opacity-60">
            {loading ? "Creating..." : "Create Account"}
          </button>
          <p className="mt-5 text-center text-sm text-brand-taupe">
            Already registered? <Link to="/login" className="font-semibold text-brand-red">Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
