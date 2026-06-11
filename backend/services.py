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


def dispatch_label_pdf(label, size="4x6"):
    buf = io.BytesIO()
    if size == "A4":
        pagesize = A4
    else:
        pagesize = (4 * inch, 6 * inch)
    c = canvas.Canvas(buf, pagesize=pagesize)
    w, hh = pagesize
    m = 6 * mm
    c.setFillColor(CHARCOAL)
    c.rect(0, hh - 14 * mm, w, 14 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(m, hh - 9 * mm, "SHREE DENTAL LAB")
    c.setFillColor(GOLD)
    c.setFont("Helvetica", 6)
    c.drawString(m, hh - 12.5 * mm, "PRECISION - QUALITY - TRUST")

    y = hh - 20 * mm
    c.setFillColor(GRAPHITE)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(m, y, label.get("order_no", ""))
    y -= 6 * mm
    c.setFont("Helvetica", 8)

    def line(t):
        nonlocal y
        c.drawString(m, y, t[:48])
        y -= 5 * mm

    line(f"Patient: {label.get('patient_names', '')}")
    line(f"Items/Teeth: {label.get('teeth', '')}")
    line(f"Dr. {label.get('dentist_name', '')} - {label.get('clinic_name', '')}")
    line(f"Deliver: {label.get('delivery_address', '')}")
    line(f"Contact: {label.get('contact', '')}")
    line(f"Courier: {label.get('courier_name', '')}")
    line(f"Tracking: {label.get('tracking_no', '')}")
    line(f"Packed by: {label.get('packed_by', '')}")

    # QR
    qr = qrcode.make(label.get("track_url", label.get("order_no", "")))
    qr_buf = io.BytesIO()
    qr.save(qr_buf, format="PNG")
    qr_buf.seek(0)
    qr_size = 28 * mm
    c.drawImage(ImageReader(qr_buf), w - qr_size - m, m, qr_size, qr_size)
    c.setFont("Helvetica", 6)
    c.drawString(m, m + 4 * mm, "Scan to track order")
    c.showPage()
    c.save()
    buf.seek(0)
    return buf.read()
