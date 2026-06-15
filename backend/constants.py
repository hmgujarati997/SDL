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
    # 3D / mesh & scan formats
    ".stl", ".obj", ".ply", ".off", ".3mf", ".dcm", ".3oxz", ".dxd",
    # Dental CAD/CAM lab formats (3Shape, exocad, Medit, Dentsply, etc.)
    ".constructioninfo", ".dcm", ".3shape", ".exo", ".exocad", ".lab",
    ".cmg", ".cmg3ml", ".3ml", ".pcd", ".scan", ".tmj", ".xorder",
    ".dxf", ".igs", ".iges", ".step", ".stp",
    # Generic data / archives / docs
    ".xml", ".json", ".txt", ".csv", ".zip", ".rar", ".7z", ".pdf",
    # Images
    ".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff", ".gif",
}

# Statuses a dentist is allowed to see verbatim. Every other (internal SOP)
# status is collapsed to "Work in Progress" so the lab's production workflow
# is never exposed to dentists.
DENTIST_WIP_LABEL = "Work in Progress"
DENTIST_VISIBLE_STATUSES = {
    "Order Received",
    "Impression Awaited",
    "Impression Received",
    "Dispatched",
    "Delivered",
    "Cancelled",
}


def dentist_facing_status(status):
    """Map any internal status to the dentist-facing label."""
    if not status:
        return status
    return status if status in DENTIST_VISIBLE_STATUSES else DENTIST_WIP_LABEL


WHATSAPP_EVENTS = [
    "order_placed", "order_accepted", "file_issue", "payment_request",
    "payment_success", "payment_failed", "sent_to_designer", "design_received",
    "design_assigned",
    "cutting_started", "sintering_started", "glazing_started", "ready_packaging",
    "packed", "dispatched", "delivered", "trial_dispatched", "remake_received",
    "remake_created", "remake_file_required", "order_delayed",
    "impression_placed", "impression_received", "impression_damaged",
    "pickup_scheduled",
]
