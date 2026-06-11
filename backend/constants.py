"""Workflow stages, shades, enums."""

ZIRCONIA_STAGES = [
    "Order Received",
    "Order Accepted",
    "Sent to Designer",
    "Design Received",
    "Cutting Started",
    "Sintering Started",
    "Glazing Started",
    "QC Done / Ready for Packaging",
    "Packed / Dispatch Label Printed",
    "Dispatched",
    "Delivered",
]

IMPRESSION_PRESTAGES = [
    "Impression Awaited",
    "Impression Received",
    "In-House Scanning",
]

TRIAL_STAGES = ["Trial Ready", "Trial Dispatched", "Trial Approved"]

EXTRA_STATUSES = ["On Hold", "Cancelled"]

ALL_STATUSES = IMPRESSION_PRESTAGES + ZIRCONIA_STAGES + TRIAL_STAGES + EXTRA_STATUSES

VITA_SHADES = [
    "A1", "A2", "A3", "A3.5", "A4",
    "B1", "B2", "B3", "B4",
    "C1", "C2", "C3", "C4",
    "D2", "D3", "D4",
    "OM1", "OM2", "OM3",
    "Custom (see notes)",
]

FDI_TEETH = {
    "upper_right": [18, 17, 16, 15, 14, 13, 12, 11],
    "upper_left": [21, 22, 23, 24, 25, 26, 27, 28],
    "lower_left": [31, 32, 33, 34, 35, 36, 37, 38],
    "lower_right": [48, 47, 46, 45, 44, 43, 42, 41],
}

FILE_ISSUE_REASONS = [
    "Scan file missing", "Wrong file uploaded", "File not opening",
    "Margin unclear", "Bite issue", "Shade details missing", "Other",
]

REMAKE_REASONS = [
    "Not fitting properly", "Shade mismatch", "Margin issue", "Broken/damaged",
    "Wrong tooth", "Design issue", "Manufacturing issue", "Other",
]

ALLOWED_FILE_EXT = {
    ".stl", ".obj", ".ply", ".zip", ".pdf", ".jpg", ".jpeg", ".png",
    ".dcm", ".3oxz", ".dxd", ".rar", ".7z", ".webp",
}

WHATSAPP_EVENTS = [
    "order_placed", "order_accepted", "file_issue", "payment_request",
    "payment_success", "payment_failed", "sent_to_designer", "design_received",
    "cutting_started", "sintering_started", "glazing_started", "ready_packaging",
    "packed", "dispatched", "delivered", "trial_dispatched", "remake_received",
    "remake_created", "remake_file_required", "order_delayed",
    "impression_placed", "impression_received", "impression_damaged",
    "pickup_scheduled",
]
