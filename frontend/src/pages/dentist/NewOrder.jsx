import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import api, { inr, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, Btn, Field, inputCls } from "@/components/UI";
import { Spinner } from "@/components/Layout";
import ToothChart from "@/components/ToothChart";
import { toast } from "sonner";
import { Plus, Trash2, Sparkles, Check, ChevronRight, Upload, X, Image as ImageIcon, Package } from "lucide-react";

const uid = () => Math.random().toString(36).slice(2);

export default function NewOrder() {
  const { user } = useAuth();
  const nav = useNavigate();
  const dProfile = user?.dentist || {};
  const profileAddress = [
    dProfile.delivery_address || dProfile.billing_address,
    [dProfile.city, dProfile.state, dProfile.pincode].filter(Boolean).join(", "),
  ].filter(Boolean).join(", ");
  const [products, setProducts] = useState([]);
  const [patients, setPatients] = useState([]);
  const [shades, setShades] = useState([]);
  const [lab, setLab] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const tokenRef = useRef(uid());

  const [settings, setSettings] = useState({
    case_input_type: "Digital Scan Upload", urgency: "Normal",
    pickup_required: false, delivery_required: true,
    notes: "", impression_method: "courier",
  });
  const [cases, setCases] = useState([newCase()]);
  const [files, setFiles] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [quote, setQuote] = useState(null);

  function newCase() {
    return { uid: uid(), mode: "existing", patient_id: "", new_patient: { name: "", age: "", gender: "" }, notes: "", items: [newItem()] };
  }
  function newItem() {
    return { uid: uid(), product_id: "", tier_id: "", teeth: [], trial_required: false, special_instructions: "", stump_shade: "", defaultShade: "A2" };
  }

  useEffect(() => {
    Promise.all([
      api.get("/products?active_only=true"),
      api.get("/patients"),
      api.get("/meta"),
      api.get("/settings/public"),
    ]).then(([p, pa, m, s]) => {
      setProducts(p.data); setPatients(pa.data); setShades(m.data.shades); setLab(s.data.lab || {});
    }).finally(() => setLoading(false));
  }, []);

  const tierById = useMemo(() => {
    const map = {};
    products.forEach((p) => (p.tiers || []).forEach((t) => (map[t.id] = { ...t, product_name: p.name })));
    return map;
  }, [products]);

  const flatItems = useMemo(() => {
    const out = [];
    cases.forEach((c) => {
      const pname = c.mode === "existing" ? (patients.find((p) => p.id === c.patient_id)?.name || "") : c.new_patient.name;
      c.items.forEach((it) => {
        if (it.tier_id && it.teeth.length) {
          const t = tierById[it.tier_id];
          out.push({ tier_id: it.tier_id, product_id: it.product_id, product_name: t?.product_name, tier_name: t?.name, units: it.teeth.length, teeth: it.teeth, patient_name: pname });
        }
      });
    });
    return out;
  }, [cases, patients, tierById]);

  const fetchQuote = useCallback(async () => {
    if (!flatItems.length) { setQuote(null); return; }
    try {
      const { data } = await api.post("/quote", { items: flatItems, urgency: settings.urgency });
      setQuote(data);
    } catch {}
  }, [flatItems, settings.urgency]);
  useEffect(() => { const t = setTimeout(fetchQuote, 350); return () => clearTimeout(t); }, [fetchQuote]);

  // mutators
  const setCase = (ci, patch) => setCases((cs) => cs.map((c, i) => (i === ci ? { ...c, ...patch } : c)));
  const setItem = (ci, ii, patch) => setCases((cs) => cs.map((c, i) => i !== ci ? c : { ...c, items: c.items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) }));
  const addItem = (ci) => setCases((cs) => cs.map((c, i) => (i === ci ? { ...c, items: [...c.items, newItem()] } : c)));
  const delItem = (ci, ii) => setCases((cs) => cs.map((c, i) => (i === ci ? { ...c, items: c.items.filter((_, j) => j !== ii) } : c)));

  const toggleTooth = (ci, ii, tooth) => setCases((cs) => cs.map((c, i) => i !== ci ? c : {
    ...c, items: c.items.map((it, j) => {
      if (j !== ii) return it;
      const exists = it.teeth.find((t) => t.tooth === tooth);
      const teeth = exists ? it.teeth.filter((t) => t.tooth !== tooth) : [...it.teeth, { tooth, shade: it.defaultShade }];
      return { ...it, teeth: teeth.sort((a, b) => a.tooth - b.tooth) };
    }),
  }));
  const setToothShade = (ci, ii, tooth, shade) => setItem(ci, ii, { teeth: cases[ci].items[ii].teeth.map((t) => (t.tooth === tooth ? { ...t, shade } : t)) });
  const applyAllShade = (ci, ii, shade) => setItem(ci, ii, { defaultShade: shade, teeth: cases[ci].items[ii].teeth.map((t) => ({ ...t, shade })) });

  const valid = flatItems.length > 0 && cases.every((c) => (c.mode === "existing" ? c.patient_id : c.new_patient.name));

  const buildPayload = (payment = {}) => ({
    ...settings,
    client_token: tokenRef.current,
    cases: cases.map((c) => ({
      patient_id: c.mode === "existing" ? c.patient_id : null,
      new_patient: c.mode === "new" ? { ...c.new_patient, age: c.new_patient.age ? Number(c.new_patient.age) : null } : null,
      case_input_type: settings.case_input_type, notes: c.notes,
      items: c.items.filter((it) => it.tier_id && it.teeth.length).map((it) => ({
        product_id: it.product_id, product_name: tierById[it.tier_id]?.product_name,
        tier_id: it.tier_id, tier_name: tierById[it.tier_id]?.name, teeth: it.teeth,
        trial_required: it.trial_required, special_instructions: it.special_instructions, stump_shade: it.stump_shade,
      })),
    })),
    ...payment,
  });

  const loadRazorpay = () => new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  const finalizeOrder = async (payment) => {
    const { data } = await api.post("/orders", buildPayload(payment));
    for (const f of files) {
      const fd = new FormData();
      fd.append("file", f); fd.append("level", "batch"); fd.append("category", "dentist");
      try { await api.post(`/orders/${data.id}/files`, fd); } catch {}
    }
    for (const p of photos) {
      const fd = new FormData();
      fd.append("file", p); fd.append("level", "batch"); fd.append("category", "photo");
      try { await api.post(`/orders/${data.id}/files`, fd); } catch {}
    }
    toast.success(`Payment successful · Order ${data.batch_no} placed!`);
    nav(`/app/orders/${data.id}`);
  };

  const submit = async () => {
    if (!valid) { toast.error("Add at least one patient with teeth selected."); return; }
    setSubmitting(true);
    try {
      const { data: chk } = await api.post("/orders/checkout", buildPayload());
      // Mock mode (Razorpay not configured) — simulate a successful payment
      if (chk.mock) {
        await finalizeOrder({ razorpay_order_id: chk.razorpay_order_id, razorpay_payment_id: "pay_mock_" + Date.now(), razorpay_signature: "mock" });
        return;
      }
      const ok = await loadRazorpay();
      if (!ok) { toast.error("Could not load the payment gateway. Please retry."); setSubmitting(false); return; }
      const rzp = new window.Razorpay({
        key: chk.key_id,
        amount: Math.round(chk.amount * 100),
        currency: chk.currency || "INR",
        name: "Shree Dental Lab",
        description: `Order payment · ${inr(chk.amount)}`,
        order_id: chk.razorpay_order_id,
        prefill: chk.prefill,
        theme: { color: "#C1272D" },
        handler: async (resp) => {
          try {
            await finalizeOrder({
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
          } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); setSubmitting(false); }
        },
        modal: { ondismiss: () => { setSubmitting(false); toast("Payment cancelled — your order was not placed."); } },
      });
      rzp.on("payment.failed", () => { setSubmitting(false); toast.error("Payment failed — your order was not placed."); });
      rzp.open();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); setSubmitting(false); }
  };

  if (loading) return <Spinner />;
  if (!user?.dentist?.billing_complete)
    return <Card><p className="py-8 text-center text-brand-graphite">Please complete your <a href="/app/profile" className="font-semibold text-brand-red underline">billing profile</a> before placing an order.</p></Card>;

  const impression = settings.case_input_type === "Physical Impression";

  return (
    <div className="lg:flex lg:gap-6">
      <div className="min-w-0 flex-1 space-y-5 lg:pb-10">
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">Place New Order</h1>

        {/* Step 1 */}
        <Card>
          <h3 className="font-heading text-lg font-bold">1 · Order Settings</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="How are you sending the case?">
              <select data-testid="case-input-type" className={inputCls} value={settings.case_input_type} onChange={(e) => setSettings({ ...settings, case_input_type: e.target.value })}>
                <option>Digital Scan Upload</option><option>Physical Impression</option>
              </select>
            </Field>
            <Field label="Where we'll ship your finished work back">
              <div data-testid="profile-delivery-address" className="rounded-lg border border-brand-taupe/20 bg-brand-ivory px-3 py-2 text-sm text-brand-graphite">
                {profileAddress || <span className="text-brand-taupe">No address set — add it in your <Link to="/app/profile" className="font-semibold text-brand-red underline">profile</Link>.</span>}
              </div>
              <p className="mt-1 text-xs text-brand-taupe">This is your clinic address from your profile. Completed cases are couriered here.</p>
            </Field>
          </div>

          {impression && (
            <div data-testid="impression-shipto-box" className="mt-4 rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-4">
              <p className="flex items-center gap-2 font-heading text-base font-bold text-brand-graphite"><Package className="h-4 w-4 text-brand-red" />Post your physical impression to the lab</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-brand-taupe">Lab shipping address</p>
              <p className="mt-0.5 whitespace-pre-line text-sm font-medium text-brand-graphite" data-testid="lab-shipto-address">
                {lab.receiving_address || lab.address || "Address not set yet — please contact the lab."}
              </p>
              {(lab.receiving_phone || lab.phone) && (
                <p className="mt-1 text-sm text-brand-graphite" data-testid="lab-shipto-phone">Phone: <b>{lab.receiving_phone || lab.phone}</b></p>
              )}
              <p className="mt-3 text-xs text-brand-graphite">After you place the order, add your courier tracking ID on the order page so we can track your parcel. Uploading scan files is optional for impressions.</p>
            </div>
          )}
          <p data-testid="order-accept-note" className="mt-4 text-sm font-medium text-brand-graphite">Note: No need to call — you'll receive a message once your order is accepted. 😊</p>
        </Card>

        {/* Step 2-3: cases */}
        {cases.map((c, ci) => (
          <Card key={c.uid} data-testid={`case-card-${ci}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold">Patient Case {ci + 1}</h3>
              {cases.length > 1 && <button onClick={() => setCases((cs) => cs.filter((_, i) => i !== ci))} className="text-brand-red"><Trash2 className="h-4 w-4" /></button>}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setCase(ci, { mode: "existing" })} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${c.mode === "existing" ? "bg-brand-red text-white" : "bg-brand-ivory text-brand-graphite"}`}>Existing Patient</button>
              <button onClick={() => setCase(ci, { mode: "new" })} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${c.mode === "new" ? "bg-brand-red text-white" : "bg-brand-ivory text-brand-graphite"}`}>New Patient</button>
            </div>
            {c.mode === "existing" ? (
              <Field label="Select Patient"><select data-testid={`case-patient-${ci}`} className={inputCls + " mt-2"} value={c.patient_id} onChange={(e) => setCase(ci, { patient_id: e.target.value })}>
                <option value="">Choose...</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.name} {p.age ? `(${p.age})` : ""}</option>)}
              </select></Field>
            ) : (
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                <input className={inputCls} placeholder="Name" value={c.new_patient.name} onChange={(e) => setCase(ci, { new_patient: { ...c.new_patient, name: e.target.value } })} data-testid={`case-newpatient-name-${ci}`} />
                <input className={inputCls} placeholder="Age" type="number" value={c.new_patient.age} onChange={(e) => setCase(ci, { new_patient: { ...c.new_patient, age: e.target.value } })} />
                <select className={inputCls} value={c.new_patient.gender} onChange={(e) => setCase(ci, { new_patient: { ...c.new_patient, gender: e.target.value } })}><option value="">Gender</option><option>Male</option><option>Female</option><option>Other</option></select>
              </div>
            )}

            {/* Items */}
            <div className="mt-5 space-y-5">
              {c.items.map((it, ii) => {
                const product = products.find((p) => p.id === it.product_id);
                return (
                  <div key={it.uid} className="rounded-xl border border-brand-taupe/20 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-brand-graphite">Item {ii + 1}</p>
                      {c.items.length > 1 && <button onClick={() => delItem(ci, ii)} className="text-brand-red"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                    <Field label="Product"><select data-testid={`item-product-${ci}-${ii}`} className={inputCls + " mt-1"} value={it.product_id}
                      onChange={(e) => setItem(ci, ii, { product_id: e.target.value, tier_id: "" })}>
                      <option value="">Select product...</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select></Field>

                    {product && product.tiers.length > 0 && (
                      <div className="mt-3">
                        <p className="mb-2 text-sm text-brand-taupe">Choose quality tier</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {product.tiers.map((t) => {
                            const sel = it.tier_id === t.id;
                            return (
                              <button key={t.id} data-testid={`tier-${t.id}`} onClick={() => setItem(ci, ii, { tier_id: t.id })}
                                className={`rounded-xl border-2 p-3 text-left transition ${sel ? "border-brand-red bg-brand-red/5" : "border-brand-taupe/20 hover:border-brand-red/40"}`}>
                                <div className="flex items-center justify-between">
                                  <span className="font-heading font-bold">{t.name}</span>
                                  {sel && <Check className="h-4 w-4 text-brand-red" />}
                                </div>
                                <p className="mt-1 text-xs text-brand-taupe">{t.description}</p>
                                <p className="mt-2 font-bold text-brand-red">{inr(t.rate_per_unit)}<span className="text-xs font-normal text-brand-taupe">/unit</span></p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {it.tier_id && (
                      <>
                        <p className="mb-2 mt-4 text-sm text-brand-taupe">Select teeth (tap to toggle)</p>
                        <ToothChart selected={it.teeth.map((t) => t.tooth)} onToggle={(tn) => toggleTooth(ci, ii, tn)} />
                        {it.teeth.length > 0 && (
                          <div className="mt-3">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="text-sm text-brand-taupe">Apply shade to all:</span>
                              <select className="rounded-lg border border-brand-taupe/30 px-2 py-1 text-sm" value={it.defaultShade} onChange={(e) => applyAllShade(ci, ii, e.target.value)}>
                                {shades.map((s) => <option key={s}>{s}</option>)}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              {it.teeth.map((t) => (
                                <div key={t.tooth} className="flex items-center gap-2 rounded-lg border border-brand-taupe/20 px-2 py-1.5">
                                  <span className="text-sm font-bold text-brand-red">{t.tooth}</span>
                                  <select data-testid={`tooth-shade-${t.tooth}`} className="flex-1 rounded border-brand-taupe/30 bg-transparent text-sm outline-none" value={t.shade} onChange={(e) => setToothShade(ci, ii, t.tooth, e.target.value)}>
                                    {shades.map((s) => <option key={s}>{s}</option>)}
                                  </select>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={it.trial_required} onChange={(e) => setItem(ci, ii, { trial_required: e.target.checked })} /> Trial required</label>
                          <input className={inputCls} placeholder="Stump shade (optional)" value={it.stump_shade} onChange={(e) => setItem(ci, ii, { stump_shade: e.target.value })} />
                          <div className="sm:col-span-2"><textarea className={inputCls} rows={1} placeholder="Special instructions" value={it.special_instructions} onChange={(e) => setItem(ci, ii, { special_instructions: e.target.value })} /></div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              <Btn variant="outline" onClick={() => addItem(ci)}><Plus className="h-4 w-4" />Add Tooth/Product Item</Btn>
            </div>
          </Card>
        ))}
        <Btn variant="outline" data-testid="add-case-btn" onClick={() => setCases([...cases, newCase()])}><Plus className="h-4 w-4" />Add Another Patient</Btn>

        {/* Step 4: files */}
        <Card>
          <h3 className="font-heading text-lg font-bold">4 · Upload Files {impression && <span className="text-sm font-normal text-brand-taupe">(optional for impressions)</span>}</h3>
          <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-taupe/30 p-6 text-brand-taupe hover:border-brand-red">
            <Upload className="h-5 w-5" /> Choose scan files (STL, OBJ, PLY, ZIP, PDF)
            <input type="file" multiple className="hidden" data-testid="order-file-input" onChange={(e) => setFiles([...files, ...Array.from(e.target.files)])} />
          </label>
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-brand-ivory px-3 py-2 text-sm">
                  <span className="truncate">{f.name} ({(f.size / 1048576).toFixed(1)} MB)</span>
                  <button onClick={() => setFiles(files.filter((_, j) => j !== i))}><X className="h-4 w-4 text-brand-red" /></button>
                </div>
              ))}
            </div>
          )}

          {/* Case photos */}
          <div className="mt-5 border-t border-brand-taupe/15 pt-4">
            <h4 className="flex items-center gap-2 font-heading text-base font-bold text-brand-graphite"><ImageIcon className="h-4 w-4 text-brand-red" /> Case Photos <span className="text-sm font-normal text-brand-taupe">(optional)</span></h4>
            <p className="mt-1 text-xs text-brand-taupe">Add intra-oral / shade / patient photos along with your scan. JPG, PNG or WEBP.</p>
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-taupe/30 p-5 text-brand-taupe hover:border-brand-red">
              <ImageIcon className="h-5 w-5" /> Add photos
              <input type="file" accept="image/*" multiple className="hidden" data-testid="order-photo-input"
                onChange={(e) => setPhotos([...photos, ...Array.from(e.target.files)])} />
            </label>
            {photos.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {photos.map((p, i) => (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-brand-taupe/20">
                    <img src={URL.createObjectURL(p)} alt={p.name} className="h-full w-full object-cover" />
                    <button onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100" data-testid={`remove-photo-${i}`}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Step 5: order notes (after file upload) */}
        <Card>
          <h3 className="font-heading text-lg font-bold">5 · Order Notes <span className="text-sm font-normal text-brand-taupe">(optional)</span></h3>
          <textarea data-testid="order-notes" className={inputCls + " mt-3"} rows={3} placeholder="Any overall instructions for this order…" value={settings.notes} onChange={(e) => setSettings({ ...settings, notes: e.target.value })} />
        </Card>
      </div>

      {/* Live price panel */}
      <div className="lg:w-80 lg:shrink-0">
        <div className="sticky bottom-0 z-20 lg:top-6">
          <Card className="border-brand-gold/30">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold">Live Price</h3>
              <Sparkles className="h-5 w-5 text-brand-gold" />
            </div>
            {!quote ? <p className="py-6 text-center text-sm text-brand-taupe">Add teeth to see pricing.</p> : (
              <div className="mt-3 space-y-3 text-sm">
                {quote.tier_groups.map((g) => (
                  <div key={g.tier_id} className="rounded-lg bg-brand-ivory p-3">
                    <div className="flex justify-between font-semibold"><span>{g.tier_name}</span><span>{g.units} units</span></div>
                    <div className="flex justify-between text-brand-taupe"><span>{inr(g.per_unit)} × {g.units}</span><span>{inr(g.subtotal)}</span></div>
                    {g.offer_discount_amount > 0 && <div className="flex justify-between text-[#8a6d2f]"><span>{g.offer_name} ({g.offer_discount_pct}%)</span><span>−{inr(g.offer_discount_amount)}</span></div>}
                  </div>
                ))}
                {(quote.nudges || []).map((n, i) => (
                  <div key={i} data-testid="offer-nudge" className="rounded-lg border border-brand-gold/40 bg-brand-gold/10 p-2.5 text-xs font-medium text-[#8a6d2f]">🎯 {n.message}</div>
                ))}
                <div className="space-y-1 border-t pt-3">
                  <Row l="Subtotal" v={inr(quote.subtotal)} />
                  {quote.total_discount > 0 && <Row l="Offer savings" v={"−" + inr(quote.total_discount)} gold />}
                  {quote.gst_enabled && <Row l="GST" v={inr(quote.gst_total)} />}
                  <div className="flex justify-between pt-1 font-heading text-lg font-bold"><span>Total</span><span className="text-brand-red" data-testid="quote-total">{inr(quote.total)}</span></div>
                </div>
                {quote.total_discount > 0 && <p className="rounded bg-brand-gold/10 p-2 text-center text-xs font-semibold text-[#8a6d2f]">You saved {inr(quote.total_discount)} on this order!</p>}
              </div>
            )}
            <Btn data-testid="submit-order-btn" className="mt-4 w-full" onClick={submit} disabled={submitting || !valid}>
              {submitting ? "Processing payment..." : <>Pay &amp; Place Order{quote ? ` · ${inr(quote.total)}` : ""} <ChevronRight className="h-4 w-4" /></>}
            </Btn>
            {quote && <p className="mt-2 text-center text-xs text-brand-taupe">Secure payment via Razorpay. Your order is placed only after payment.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ l, v, gold }) {
  return <div className={`flex justify-between ${gold ? "text-[#8a6d2f]" : "text-brand-graphite"}`}><span>{l}</span><span className="tabular">{v}</span></div>;
}
