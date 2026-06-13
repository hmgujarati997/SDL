"""WhatsApp sending + PDF generation services."""
import io
import os
import requests
import qrcode
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

from deps import db, gen_id, now_iso, get_setting, fmt_ist

RED = colors.HexColor("#B82024")
GOLD = colors.HexColor("#C9A45C")
CHARCOAL = colors.HexColor("#111111")
GRAPHITE = colors.HexColor("#2B2B2B")


def num_to_words_inr(amount):
    units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
             "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
             "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def two(n):
        if n < 20:
            return units[n]
        return tens[n // 10] + ((" " + units[n % 10]) if n % 10 else "")

    def three(n):
        if n >= 100:
            return units[n // 100] + " Hundred" + ((" " + two(n % 100)) if n % 100 else "")
        return two(n)

    rupees = int(amount)
    paise = int(round((amount - rupees) * 100))
    if rupees == 0:
        words = "Zero"
    else:
        crore = rupees // 10000000
        lakh = (rupees // 100000) % 100
        thousand = (rupees // 1000) % 100
        hundred = rupees % 1000
        parts = []
        if crore:
            parts.append(two(crore) + " Crore")
        if lakh:
            parts.append(two(lakh) + " Lakh")
        if thousand:
            parts.append(two(thousand) + " Thousand")
        if hundred:
            parts.append(three(hundred))
        words = " ".join(parts)
    res = f"Rupees {words}"
    if paise:
        res += f" and {two(paise)} Paise"
    return res + " Only"


async def send_whatsapp(*, event, to_phone, dentist_name, order_no,
                        patient_name="", fields=None, deep_link_suffix=""):
    """Send a WhatsApp template message via configurable provider; logs everything."""
    settings = await get_setting("whatsapp", {}) or {}
    events_cfg = settings.get("events", {})
    fields = fields or {}
    image_header = settings.get("image_header_url", "")
    learn_more = (settings.get("learn_more_base_url", "") + deep_link_suffix) if deep_link_suffix else settings.get("learn_more_base_url", "")

    log = {
        "id": gen_id(),
        "event": event,
        "dentist_name": dentist_name,
        "phone": to_phone,
        "order_no": order_no,
        "patient_name": patient_name,
        "message_type": event,
        "template_name": settings.get("template_name", ""),
        "wamid": None,
        "status": "Pending",
        "fields": fields,
        "sent_at": None,
        "delivered_at": None,
        "read_at": None,
        "failed_at": None,
        "failure_reason": None,
        "api_response": None,
        "webhook_data": [],
        "created_at": now_iso(),
    }

    enabled = settings.get("enabled", False) and events_cfg.get(event, True)
    base_url = settings.get("api_base_url", "")
    vendor_uid = settings.get("vendor_uid", "")
    token = settings.get("api_token", "")

    if not enabled or not (base_url and vendor_uid and token and to_phone):
        # Mock send (no credentials / disabled)
        log["status"] = "Sent" if to_phone else "Failed"
        log["wamid"] = "mock-" + gen_id()
        log["sent_at"] = now_iso()
        log["api_response"] = {"mock": True, "reason": "whatsapp disabled or missing credentials"}
        if not to_phone:
            log["status"] = "Failed"
            log["failure_reason"] = "No phone number"
            log["failed_at"] = now_iso()
        await db.whatsapp_logs.insert_one(log)
        return log

    payload = {
        "from_phone_number_id": settings.get("from_phone_number_id", ""),
        "phone_number": to_phone,
        "template_name": settings.get("template_name", ""),
        "template_language": settings.get("language_code", "en"),
        "header_image": image_header,
        "field_1": fields.get("1", ""),
        "field_2": fields.get("2", ""),
        "field_3": fields.get("3", ""),
        "field_4": fields.get("4", ""),
        "field_5": fields.get("5", ""),
        "button_1": learn_more,
        "contact": {"first_name": dentist_name or "Doctor"},
    }
    url = f"{base_url.rstrip('/')}/{vendor_uid}/contact/send-template-message"
    try:
        resp = requests.post(url, json=payload, headers={"Authorization": f"Bearer {token}"}, timeout=20)
        data = resp.json() if resp.content else {}
        log["api_response"] = data
        wamid = (data.get("data", {}) or {}).get("wamid") or data.get("wamid")
        if resp.status_code in (200, 201):
            log["status"] = "Sent"
            log["wamid"] = wamid
            log["sent_at"] = now_iso()
        else:
            log["status"] = "Failed"
            log["failure_reason"] = data.get("message", f"HTTP {resp.status_code}")
            log["failed_at"] = now_iso()
    except Exception as e:
        log["status"] = "Failed"
        log["failure_reason"] = str(e)
        log["failed_at"] = now_iso()
    await db.whatsapp_logs.insert_one(log)
    return log


def _inr(v):
    return f"Rs. {v:,.2f}"


def invoice_pdf(inv, lab, dentist):
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4
    y = h - 20 * mm
    # Header
    c.setFillColor(CHARCOAL)
    c.rect(0, h - 30 * mm, w, 30 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(15 * mm, h - 18 * mm, lab.get("name", "Shree Dental Lab"))
    c.setFillColor(GOLD)
    c.setFont("Helvetica", 9)
    c.drawString(15 * mm, h - 24 * mm, "Precision  -  Quality  -  Trust")
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 14)
    c.drawRightString(w - 15 * mm, h - 16 * mm, "TAX INVOICE")
    c.setFont("Helvetica", 8)
    c.drawRightString(w - 15 * mm, h - 22 * mm, inv.get("invoice_no", ""))

    y = h - 40 * mm
    c.setFillColor(GRAPHITE)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(15 * mm, y, "From:")
    c.setFont("Helvetica", 8)
    c.drawString(15 * mm, y - 5 * mm, lab.get("name", "Shree Dental Lab"))
    c.drawString(15 * mm, y - 9 * mm, f"GSTIN: {lab.get('gstin', '-')}")
    c.drawString(15 * mm, y - 13 * mm, lab.get("address", "Gujarat, India"))

    c.setFont("Helvetica-Bold", 9)
    c.drawString(110 * mm, y, "Bill To:")
    c.setFont("Helvetica", 8)
    c.drawString(110 * mm, y - 5 * mm, dentist.get("clinic_name", dentist.get("name", "")))
    c.drawString(110 * mm, y - 9 * mm, f"Dr. {dentist.get('name', '')}")
    c.drawString(110 * mm, y - 13 * mm, f"GSTIN: {dentist.get('gst_number', '-') or '-'}")
    c.drawString(110 * mm, y - 17 * mm, (dentist.get("billing_address", "") or "")[:55])

    c.setFont("Helvetica", 8)
    c.drawString(15 * mm, y - 22 * mm, f"Order: {inv.get('order_no', '')}   Date: {fmt_ist(inv.get('created_at'))}")

    # Table header
    ty = y - 32 * mm
    c.setFillColor(RED)
    c.rect(15 * mm, ty, w - 30 * mm, 7 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 7)
    cols = [(16, "Product / Tier"), (75, "HSN"), (92, "Teeth"), (130, "Qty"), (143, "Rate"), (163, "Amount")]
    for x, label in cols:
        c.drawString(x * mm, ty + 2 * mm, label)
    ty -= 6 * mm
    c.setFillColor(GRAPHITE)
    c.setFont("Helvetica", 7)
    for li in inv.get("line_items", []):
        c.drawString(16 * mm, ty, f"{li.get('product_name','')} - {li.get('tier_name','')}"[:42])
        c.drawString(75 * mm, ty, str(li.get("hsn", "")))
        teeth = ",".join(str(t.get("tooth")) for t in li.get("teeth", []))
        c.drawString(92 * mm, ty, teeth[:22])
        c.drawString(130 * mm, ty, str(li.get("units", "")))
        c.drawRightString(160 * mm, ty, f"{li.get('effective_rate',0):.0f}")
        c.drawRightString(w - 16 * mm, ty, f"{li.get('line_subtotal',0):.2f}")
        ty -= 5 * mm

    ty -= 3 * mm
    c.setStrokeColor(colors.lightgrey)
    c.line(110 * mm, ty, w - 15 * mm, ty)
    ty -= 5 * mm

    def row(label, val, bold=False, color=GRAPHITE):
        nonlocal ty
        c.setFillColor(color)
        c.setFont("Helvetica-Bold" if bold else "Helvetica", 9 if bold else 8)
        c.drawString(110 * mm, ty, label)
        c.drawRightString(w - 15 * mm, ty, val)
        ty -= 5.5 * mm

    row("Subtotal", _inr(inv.get("subtotal", 0)))
    if inv.get("total_discount", 0):
        row(f"Offer Discount", "-" + _inr(inv.get("total_discount", 0)), color=GOLD)
    if inv.get("manual_discount", 0):
        row("Manual Discount", "-" + _inr(inv.get("manual_discount", 0)), color=GOLD)
    if inv.get("gst_enabled"):
        if inv.get("igst", 0):
            row("IGST", _inr(inv.get("igst", 0)))
        else:
            row("CGST", _inr(inv.get("cgst", 0)))
            row("SGST", _inr(inv.get("sgst", 0)))
    row("Total Payable", _inr(inv.get("total", 0)), bold=True, color=RED)
    row("Paid", _inr(inv.get("paid", 0)))
    row("Pending", _inr(inv.get("pending", inv.get("total", 0) - inv.get("paid", 0))))

    ty -= 4 * mm
    c.setFillColor(GRAPHITE)
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(15 * mm, ty, "Amount in words: " + num_to_words_inr(inv.get("total", 0)))
    ty -= 10 * mm
    c.setFont("Helvetica", 7)
    c.setFillColor(colors.grey)
    c.drawString(15 * mm, 15 * mm, "This is a computer generated invoice. Thank you for choosing Shree Dental Lab.")
    c.showPage()
    c.save()
    buf.seek(0)
    return buf.read()


def _wrap(c, text, font, fsize, maxw, maxlines=2):
    words = (text or "").split()
    lines, cur = [], ""
    for wd in words:
        t = (cur + " " + wd).strip()
        if c.stringWidth(t, font, fsize) <= maxw:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = wd
            if len(lines) >= maxlines:
                break
    if cur and len(lines) < maxlines:
        lines.append(cur)
    return lines[:maxlines]


def _draw_label(c, ox, oy, bw, bh, label):
    """Draw a 4x3-style shipping label inside the box (origin bottom-left)."""
    snd = label.get("sender", {})
    rcv = label.get("receiver", {})
    pad = 6
    top = oy + bh

    # Header bar
    hb = 22
    c.setFillColor(CHARCOAL)
    c.rect(ox, top - hb, bw, hb, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(ox + pad, top - 9, (snd.get("name") or "Shree Dental Lab")[:26])
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 9)
    c.drawRightString(ox + bw - pad, top - 9, label.get("order_no", ""))
    c.setFillColor(colors.white)
    c.setFont("Helvetica", 5.5)
    c.drawString(ox + pad, top - 17.5, "PRECISION  -  QUALITY  -  TRUST")

    # QR (bottom-right)
    qr = qrcode.make(label.get("track_url", label.get("order_no", "")))
    qr_buf = io.BytesIO()
    qr.save(qr_buf, format="PNG")
    qr_buf.seek(0)
    qr_size = min(bw, bh) * 0.30
    qr_x = ox + bw - qr_size - pad
    qr_y = oy + pad + 8
    c.drawImage(ImageReader(qr_buf), qr_x, qr_y, qr_size, qr_size)
    c.setFillColor(GRAPHITE)
    c.setFont("Helvetica", 5.5)
    c.drawCentredString(qr_x + qr_size / 2, qr_y - 6, "Scan to track")

    # courier / tracking under QR header? put at bottom-left
    colw = bw - qr_size - 3 * pad
    lx = ox + pad
    y = top - hb - 10

    # FROM block
    c.setFillColor(GRAPHITE)
    c.setFont("Helvetica-Bold", 6)
    c.drawString(lx, y, "FROM (Sender):")
    y -= 8
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(lx, y, (snd.get("name") or "")[:42]); y -= 8
    c.setFont("Helvetica", 6.5)
    saddr = ", ".join([x for x in [snd.get("address", ""), snd.get("state", "")] if x]) or snd.get("state", "")
    for ln in _wrap(c, saddr, "Helvetica", 6.5, bw - 2 * pad, 1):
        c.drawString(lx, y, ln); y -= 7.5
    if snd.get("phone"):
        c.drawString(lx, y, "Ph: " + snd["phone"]); y -= 8

    # divider
    y -= 1
    c.setStrokeColor(colors.HexColor("#D8CFC2"))
    c.setLineWidth(0.7)
    c.line(lx, y, ox + bw - pad, y)
    y -= 11

    # DELIVER TO block (prominent)
    c.setFillColor(RED)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(lx, y, "DELIVER TO:")
    y -= 12
    c.setFillColor(GRAPHITE)
    name = rcv.get("name") or ""
    if name and not name.lower().startswith("dr"):
        name = "Dr. " + name
    c.setFont("Helvetica-Bold", 10.5)
    c.drawString(lx, y, name[:34]); y -= 11
    if rcv.get("clinic"):
        c.setFont("Helvetica-Bold", 8)
        c.drawString(lx, y, rcv["clinic"][:42]); y -= 10
    c.setFont("Helvetica", 8)
    for ln in _wrap(c, rcv.get("address", ""), "Helvetica", 8, colw, 2):
        c.drawString(lx, y, ln); y -= 9.5
    if rcv.get("city_line"):
        c.drawString(lx, y, rcv["city_line"][:46]); y -= 9.5
    if rcv.get("phone"):
        c.setFont("Helvetica-Bold", 9)
        c.drawString(lx, y, "Ph: " + rcv["phone"]); y -= 11

    # bottom-left: patient / teeth / courier
    by = oy + pad + 2
    c.setFillColor(GRAPHITE)
    c.setFont("Helvetica", 6)
    if label.get("courier_name") or label.get("tracking_no"):
        ctxt = " / ".join([x for x in [label.get("courier_name", ""), label.get("tracking_no", "")] if x])
        c.drawString(lx, by, ("Courier: " + ctxt)[:50]); by += 7.5
    if label.get("patient_names"):
        c.drawString(lx, by, ("Patient: " + label["patient_names"])[:50]); by += 7.5
    if label.get("teeth"):
        c.drawString(lx, by, ("Teeth: " + label["teeth"])[:50])


def dispatch_label_pdf(label, size="4x3"):
    buf = io.BytesIO()
    if size == "A4":
        pagesize = A4
    elif size == "4x6":
        pagesize = (4 * inch, 6 * inch)
    else:  # 4x3 (default)
        pagesize = (4 * inch, 3 * inch)
    c = canvas.Canvas(buf, pagesize=pagesize)
    w, hh = pagesize

    if size == "A4":
        m = 12 * mm
        bw, bh = 4 * inch, 3 * inch
        ox, oy = m, hh - m - bh
        c.setStrokeColor(colors.HexColor("#999999"))
        c.setDash(3, 3)
        c.rect(ox - 4, oy - 4, bw + 8, bh + 8, fill=0, stroke=1)
        c.setDash()
        _draw_label(c, ox, oy, bw, bh, label)
    elif size == "4x6":
        # draw the label in the top 4x3 region, leave lower area blank for pouch
        _draw_label(c, 0, hh - 3 * inch, w, 3 * inch, label)
    else:
        _draw_label(c, 0, 0, w, hh, label)

    c.showPage()
    c.save()
    buf.seek(0)
    return buf.read()
