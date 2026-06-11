import { useEffect, useState } from "react";
import { PublicLayout } from "@/components/Layout";
import api from "@/lib/api";
import { toast } from "sonner";
import { MapPin, Phone, Mail } from "lucide-react";

export default function Contact() {
  const [lab, setLab] = useState({});
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  useEffect(() => { api.get("/settings/public").then(({ data }) => setLab(data.lab || {})).catch(() => {}); }, []);
  return (
    <PublicLayout>
      <section className="bg-brand-charcoal pt-28 pb-16 text-white sm:pt-32">
        <div className="mx-auto max-w-7xl px-6">
          <h1 className="font-heading text-4xl font-bold sm:text-5xl">Contact Us</h1>
          <p className="mt-4 text-white/75">We'd love to hear from you.</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-5">
            <div className="flex items-start gap-4"><MapPin className="h-6 w-6 text-brand-red" /><div><p className="font-semibold">Address</p><p className="text-sm text-brand-taupe">{lab.address || "Ahmedabad, Gujarat, India"}</p></div></div>
            <div className="flex items-start gap-4"><Phone className="h-6 w-6 text-brand-red" /><div><p className="font-semibold">Phone</p><p className="text-sm text-brand-taupe">{lab.phone || "+91 90000 00000"}</p></div></div>
            <div className="flex items-start gap-4"><Mail className="h-6 w-6 text-brand-red" /><div><p className="font-semibold">Email</p><p className="text-sm text-brand-taupe">{lab.email || "info@shreedentallab.com"}</p></div></div>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); toast.success("Thanks! We'll get back to you soon."); setForm({ name: "", email: "", message: "" }); }}
            className="rounded-2xl border border-brand-taupe/15 bg-white p-7 brand-shadow">
            <label className="mb-1 block text-sm text-brand-taupe">Name</label>
            <input data-testid="contact-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mb-4 w-full rounded-lg border border-brand-taupe/30 px-3 py-2.5 outline-none focus:border-brand-red" />
            <label className="mb-1 block text-sm text-brand-taupe">Email</label>
            <input data-testid="contact-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mb-4 w-full rounded-lg border border-brand-taupe/30 px-3 py-2.5 outline-none focus:border-brand-red" />
            <label className="mb-1 block text-sm text-brand-taupe">Message</label>
            <textarea data-testid="contact-message" required rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="mb-4 w-full rounded-lg border border-brand-taupe/30 px-3 py-2.5 outline-none focus:border-brand-red" />
            <button data-testid="contact-submit" className="rounded-full bg-brand-red px-6 py-3 font-semibold text-white hover:bg-brand-ruby">Send Message</button>
          </form>
        </div>
      </section>
    </PublicLayout>
  );
}
