"""Pricing resolution and offers engine (pure functions)."""


def resolve_unit_rate(tier, dentist_rate_override):
    """Dentist-specific rate if present else tier default."""
    if dentist_rate_override is not None:
        return float(dentist_rate_override)
    return float(tier.get("rate_per_unit", 0))


def apply_surcharge(rate, tier, urgency):
    """Urgent surcharge added BEFORE offer discount. Returns (effective_rate, surcharge_per_unit)."""
    if urgency in ("Urgent", "Same-day"):
        s_type = tier.get("urgent_surcharge_type", "flat")
        s_val = float(tier.get("urgent_surcharge", 0) or 0)
        if s_type == "percent":
            surcharge = rate * s_val / 100.0
        else:
            surcharge = s_val
        return rate + surcharge, surcharge
    return rate, 0.0


def best_slab_discount(slabs, units):
    """Highest qualifying slab applies to ALL units. Returns (min_units, discount)."""
    best = None
    for s in sorted(slabs, key=lambda x: x.get("min_units", 0)):
        if units >= s.get("min_units", 0):
            best = s
    return best


def next_slab(slabs, units):
    for s in sorted(slabs, key=lambda x: x.get("min_units", 0)):
        if s.get("min_units", 0) > units:
            return s
    return None


def pick_offer_for_tier(offers, tier_id):
    """Return list of active offers applicable to a tier."""
    applicable = []
    for o in offers:
        if not o.get("active", True):
            continue
        tiers = o.get("tier_ids") or []
        if tiers and tier_id not in tiers:
            continue
        applicable.append(o)
    return applicable


def compute_quote(items, tiers_by_id, dentist_rates, offers, urgency,
                  gst_enabled=True, intra_state=True, offers_enabled=True):
    """
    items: [{tier_id, product_id, product_name, tier_name, units, teeth:[{tooth,shade}], case_label}]
    dentist_rates: {tier_id: rate}
    offers: list of offer docs (each with slabs, tier_ids, discount_type)
    Returns full breakup dict.
    """
    # group units per tier across batch (default scope)
    tier_units = {}
    for it in items:
        tid = it["tier_id"]
        tier_units[tid] = tier_units.get(tid, 0) + int(it.get("units", 0))

    # determine best offer + discount per tier
    tier_offer = {}
    for tid, units in tier_units.items():
        candidates = pick_offer_for_tier(offers, tid) if offers_enabled else []
        chosen = None
        chosen_disc = 0.0
        chosen_slab = None
        for off in candidates:
            slab = best_slab_discount(off.get("slabs", []), units)
            disc = float(slab.get("discount", 0)) if slab else 0.0
            if disc > chosen_disc:
                chosen_disc = disc
                chosen = off
                chosen_slab = slab
        tier_offer[tid] = {
            "offer_id": chosen.get("id") if chosen else None,
            "offer_name": chosen.get("name") if chosen else None,
            "discount_type": chosen.get("discount_type", "percentage") if chosen else "percentage",
            "discount": chosen_disc,
            "slab_min": chosen_slab.get("min_units") if chosen_slab else None,
            "slabs": chosen.get("slabs", []) if chosen else [],
        }

    line_items = []
    tier_groups = {}
    for it in items:
        tid = it["tier_id"]
        tier = tiers_by_id.get(tid, {})
        base = resolve_unit_rate(tier, dentist_rates.get(tid))
        eff, surcharge = apply_surcharge(base, tier, urgency)
        units = int(it.get("units", 0))
        line_subtotal = eff * units
        line_items.append({
            "case_label": it.get("case_label"),
            "patient_name": it.get("patient_name"),
            "product_id": it.get("product_id"),
            "product_name": it.get("product_name"),
            "tier_id": tid,
            "tier_name": it.get("tier_name"),
            "hsn": tier.get("hsn", ""),
            "units": units,
            "base_rate": round(base, 2),
            "surcharge_per_unit": round(surcharge, 2),
            "effective_rate": round(eff, 2),
            "line_subtotal": round(line_subtotal, 2),
            "teeth": it.get("teeth", []),
        })
        g = tier_groups.setdefault(tid, {
            "tier_id": tid, "tier_name": it.get("tier_name"),
            "units": 0, "subtotal": 0.0, "gst_rate": float(tier.get("gst_rate", 0)),
            "effective_rate": round(eff, 2),
        })
        g["units"] += units
        g["subtotal"] += line_subtotal

    subtotal = 0.0
    total_discount = 0.0
    total_surcharge = sum(li["surcharge_per_unit"] * li["units"] for li in line_items)
    taxable = 0.0
    total_gst = 0.0
    groups_out = []
    for tid, g in tier_groups.items():
        off = tier_offer.get(tid, {})
        disc_type = off.get("discount_type", "percentage")
        disc_val = off.get("discount", 0.0)
        if disc_type == "flat":
            discount_amount = disc_val * g["units"]
        else:
            discount_amount = g["subtotal"] * disc_val / 100.0
        after = g["subtotal"] - discount_amount
        gst_amount = (after * g["gst_rate"] / 100.0) if gst_enabled else 0.0
        subtotal += g["subtotal"]
        total_discount += discount_amount
        taxable += after
        total_gst += gst_amount
        ns = next_slab(off.get("slabs", []), g["units"])
        nudge = None
        if ns and off.get("offer_name"):
            need = ns["min_units"] - g["units"]
            nudge = {
                "tier_name": g["tier_name"],
                "units_needed": need,
                "next_discount": ns.get("discount"),
                "message": f"Add {need} more {g['tier_name']} unit(s) to unlock {ns.get('discount')}% off",
            }
        groups_out.append({
            "tier_id": tid,
            "tier_name": g["tier_name"],
            "units": g["units"],
            "per_unit": g["effective_rate"],
            "subtotal": round(g["subtotal"], 2),
            "offer_id": off.get("offer_id"),
            "offer_name": off.get("offer_name"),
            "offer_discount_pct": disc_val if disc_type == "percentage" else None,
            "offer_discount_amount": round(discount_amount, 2),
            "slab_min": off.get("slab_min"),
            "after_discount": round(after, 2),
            "gst_rate": g["gst_rate"],
            "gst_amount": round(gst_amount, 2),
            "nudge": nudge,
        })

    cgst = sgst = igst = 0.0
    if gst_enabled:
        if intra_state:
            cgst = sgst = total_gst / 2.0
        else:
            igst = total_gst
    total = taxable + total_gst
    return {
        "line_items": line_items,
        "tier_groups": groups_out,
        "subtotal": round(subtotal, 2),
        "total_surcharge": round(total_surcharge, 2),
        "total_discount": round(total_discount, 2),
        "taxable": round(taxable, 2),
        "gst_enabled": gst_enabled,
        "intra_state": intra_state,
        "cgst": round(cgst, 2),
        "sgst": round(sgst, 2),
        "igst": round(igst, 2),
        "gst_total": round(total_gst, 2),
        "total": round(total, 2),
        "nudges": [g["nudge"] for g in groups_out if g.get("nudge")],
    }


def build_rate_card(tier, dentist_rate_override):
    """Build quantity-slab rate card for My Pricing page using dentist's resolved rate + tier offer slabs."""
    base = resolve_unit_rate(tier, dentist_rate_override)
    return base
