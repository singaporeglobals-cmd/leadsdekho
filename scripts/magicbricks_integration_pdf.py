"""
MagicBricks → LeadsDekho API Integration Guide (PDF)
Single-page-per-section technical document for the MagicBricks account manager.
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    KeepTogether, PageBreak
)

# ---------- Fonts ----------
FONT_DIR = "/usr/share/fonts"
pdfmetrics.registerFont(TTFont("NotoSerifSC", f"{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf"))
pdfmetrics.registerFont(TTFont("NotoSerifSC-Bold", f"{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf"))
registerFontFamily("NotoSerifSC", normal="NotoSerifSC", bold="NotoSerifSC-Bold")
pdfmetrics.registerFont(TTFont("Mono", f"{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf"))
pdfmetrics.registerFont(TTFont("Mono-Bold", f"{FONT_DIR}/truetype/dejavu/DejaVuSansMono-Bold.ttf"))

# ---------- Palette (calm tech) ----------
C_PRIMARY = colors.HexColor("#0F172A")   # slate-900
C_ACCENT  = colors.HexColor("#1D4ED8")   # blue-700
C_BG_SOFT = colors.HexColor("#F1F5F9")   # slate-100
C_BORDER  = colors.HexColor("#CBD5E1")   # slate-300
C_TEXT    = colors.HexColor("#1E293B")   # slate-800
C_MUTED   = colors.HexColor("#64748B")   # slate-500
C_SUCCESS = colors.HexColor("#15803D")   # green-700
C_WARN    = colors.HexColor("#B45309")   # amber-700
C_CODE_BG = colors.HexColor("#0F172A")
C_CODE_TEXT = colors.HexColor("#E2E8F0")

# ---------- Styles ----------
styles = getSampleStyleSheet()

H_TITLE = ParagraphStyle("HTitle", parent=styles["Title"],
    fontName="NotoSerifSC-Bold", fontSize=22, leading=28,
    textColor=C_PRIMARY, spaceAfter=4, alignment=TA_LEFT)
H_SUB = ParagraphStyle("HSub", parent=styles["Normal"],
    fontName="NotoSerifSC", fontSize=11, leading=15,
    textColor=C_MUTED, spaceAfter=20, alignment=TA_LEFT)
H1 = ParagraphStyle("H1", parent=styles["Heading1"],
    fontName="NotoSerifSC-Bold", fontSize=14, leading=18,
    textColor=C_ACCENT, spaceBefore=18, spaceAfter=8, alignment=TA_LEFT)
H2 = ParagraphStyle("H2", parent=styles["Heading2"],
    fontName="NotoSerifSC-Bold", fontSize=11, leading=15,
    textColor=C_PRIMARY, spaceBefore=10, spaceAfter=6, alignment=TA_LEFT)
BODY = ParagraphStyle("Body", parent=styles["Normal"],
    fontName="NotoSerifSC", fontSize=10, leading=15,
    textColor=C_TEXT, spaceAfter=6, alignment=TA_LEFT)
BULLET = ParagraphStyle("Bullet", parent=BODY,
    leftIndent=14, bulletIndent=2, spaceAfter=4)
META = ParagraphStyle("Meta", parent=BODY,
    fontName="NotoSerifSC", fontSize=9, leading=12,
    textColor=C_MUTED, spaceAfter=2)
CODE = ParagraphStyle("Code", parent=styles["Normal"],
    fontName="Mono", fontSize=8.5, leading=12,
    textColor=C_CODE_TEXT, spaceAfter=0, alignment=TA_LEFT,
    leftIndent=0, rightIndent=0)

# ---------- Page geometry ----------
PAGE_W, PAGE_H = A4
LEFT_M = 18 * mm
RIGHT_M = 18 * mm
TOP_M = 20 * mm
BOTTOM_M = 18 * mm
CONTENT_W = PAGE_W - LEFT_M - RIGHT_M  # ≈ 174 mm

def header_footer(canv, doc):
    canv.saveState()
    # Top thin rule
    canv.setStrokeColor(C_ACCENT)
    canv.setLineWidth(1.2)
    canv.line(LEFT_M, PAGE_H - 14*mm, PAGE_W - RIGHT_M, PAGE_H - 14*mm)
    canv.setFont("NotoSerifSC", 8.5)
    canv.setFillColor(C_MUTED)
    canv.drawString(LEFT_M, PAGE_H - 11*mm, "MagicBricks × LeadsDekho  |  API Integration Guide")
    canv.drawRightString(PAGE_W - RIGHT_M, PAGE_H - 11*mm, "leadsdekho.in")
    # Footer
    canv.setStrokeColor(C_BORDER)
    canv.setLineWidth(0.5)
    canv.line(LEFT_M, 14*mm, PAGE_W - RIGHT_M, 14*mm)
    canv.setFont("NotoSerifSC", 8.5)
    canv.setFillColor(C_MUTED)
    canv.drawString(LEFT_M, 10*mm, "Confidential — For MagicBricks Integration Team")
    canv.drawRightString(PAGE_W - RIGHT_M, 10*mm, f"Page {doc.page}")
    canv.restoreState()

def section_title(text):
    return Paragraph(text, H1)

def subsection(text):
    return Paragraph(text, H2)

def para(text):
    return Paragraph(text, BODY)

def bullet(text):
    return Paragraph(f"• {text}", BULLET)

def code_block(code_str):
    """Render monospaced code on a dark background."""
    lines = code_str.rstrip("\n").split("\n")
    # Each line becomes a Paragraph for proper wrapping
    line_paras = [Paragraph(line.replace(" ", "&nbsp;") if line else "&nbsp;", CODE) for line in lines]
    tbl = Table([[line_paras]], colWidths=[CONTENT_W])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), C_CODE_BG),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return tbl

def styled_table(data, col_widths, header_bg=C_ACCENT, header_fg=colors.white,
                 row_alt=True, font_size=9):
    """Standard table with header row + alternating row backgrounds."""
    tbl = Table(data, colWidths=col_widths, repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), header_bg),
        ("TEXTCOLOR", (0, 0), (-1, 0), header_fg),
        ("FONTNAME", (0, 0), (-1, 0), "NotoSerifSC-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), font_size + 0.5),
        ("FONTNAME", (0, 1), (-1, -1), "NotoSerifSC"),
        ("FONTSIZE", (0, 1), (-1, -1), font_size),
        ("TEXTCOLOR", (0, 1), (-1, -1), C_TEXT),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, 0), "LEFT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.4, C_BORDER),
    ]
    if row_alt:
        for i in range(2, len(data), 2):
            style.append(("BACKGROUND", (0, i), (-1, i), C_BG_SOFT))
    tbl.setStyle(TableStyle(style))
    return tbl

def cell(text, bold=False, color=None, align=None):
    p = ParagraphStyle("c", parent=BODY, fontName="NotoSerifSC-Bold" if bold else "NotoSerifSC",
                       fontSize=9, leading=12, textColor=color or C_TEXT,
                       alignment=align or TA_LEFT, spaceAfter=0)
    return Paragraph(text, p)

# ---------- Build document ----------
OUT = "/home/z/my-project/download/MagicBricks-LeadsDekho-API-Integration.pdf"

doc = SimpleDocTemplate(
    OUT, pagesize=A4,
    leftMargin=LEFT_M, rightMargin=RIGHT_M,
    topMargin=TOP_M, bottomMargin=BOTTOM_M,
    title="MagicBricks × LeadsDekho API Integration",
    author="LeadsDekho",
    subject="API Integration Guide for MagicBricks Account Manager",
    creator="LeadsDekho",
)

story = []

# ===== Title block =====
story.append(Paragraph("MagicBricks × LeadsDekho", H_TITLE))
story.append(Paragraph("API Integration Guide — Lead Forwarding via HTTP POST", H_SUB))

# Accent rule
rule_tbl = Table([[""]], colWidths=[CONTENT_W], rowHeights=[2.5])
rule_tbl.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), C_ACCENT)]))
story.append(rule_tbl)
story.append(Spacer(1, 14))

# ===== Overview =====
story.append(section_title("1. Overview"))
story.append(para(
    "LeadsDekho is the CRM platform used by our sales team to track and act on customer enquiries. "
    "To receive MagicBricks leads in real time, we expose a single public HTTP endpoint that accepts "
    "lead data as JSON. Every lead posted to this endpoint is stored in a holding queue inside our admin "
    "panel — it does <b>not</b> appear directly in the sales dashboard. An admin reviews each lead, "
    "assigns it to a salesperson, links it to a project, and only then confirms it into the live pipeline. "
    "This guide contains everything MagicBricks needs to set up the integration on their side."
))

# ===== Endpoint Details =====
story.append(section_title("2. Endpoint Details"))
ep_data = [
    [cell("Field", bold=True, color=colors.white),
     cell("Value", bold=True, color=colors.white)],
    [cell("URL"), cell("https://leadsdekho.in/api/portal-leads")],
    [cell("Method"), cell("POST")],
    [cell("Content-Type"), cell("application/json")],
    [cell("Authentication"), cell("None (public endpoint)")],
    [cell("Response Format"), cell("JSON")],
    [cell("Timeout"), cell("30 seconds recommended")],
]
story.append(styled_table(ep_data, [40*mm, CONTENT_W - 40*mm]))

# ===== Request Body =====
story.append(section_title("3. Sample Request Body (JSON)"))
story.append(para("Below is a complete example of a MagicBricks lead payload:"))
sample_body = """{
  "name": "Rahul Sharma",
  "phone": "9876543210",
  "email": "rahul@example.com",
  "source": "MagicBricks",
  "budget": "50-75 Lakhs",
  "projectName": "3BHK Skyline Residency",
  "notes": "Looking for ready-to-move 3BHK in Whitefield, near metro",
  "portalRef": "MB-5839201"
}"""
story.append(code_block(sample_body))
story.append(Spacer(1, 8))
story.append(para(
    "Only <b>name</b> and <b>phone</b> are mandatory. All other fields are optional but recommended — "
    "richer payloads allow our sales team to qualify leads faster and reduce customer wait time."
))

# ===== Field Mapping =====
story.append(section_title("4. Field Mapping (MagicBricks → LeadsDekho)"))
fm_data = [
    [cell("MagicBricks Field", bold=True, color=colors.white),
     cell("Our API Field", bold=True, color=colors.white),
     cell("Required", bold=True, color=colors.white),
     cell("Notes", bold=True, color=colors.white)],
    [cell("Customer Name"), cell("name"), cell("Yes", color=C_WARN), cell("Full name of enquirer")],
    [cell("Mobile Number"), cell("phone"), cell("Yes", color=C_WARN), cell("10-digit Indian mobile, no country code")],
    [cell("Email"), cell("email"), cell("No"), cell("If absent, omit the field or send empty string")],
    [cell("Source Portal"), cell("source"), cell("No"), cell("Send literal value: <b>MagicBricks</b>")],
    [cell("Budget"), cell("budget"), cell("No"), cell("Free-form text, e.g. \"50-75 Lakhs\"")],
    [cell("Project / Property"), cell("projectName"), cell("No"), cell("Property name or project mentioned")],
    [cell("Requirement / Message"), cell("notes"), cell("No"), cell("Customer's verbatim requirement text")],
    [cell("MagicBricks Lead ID"), cell("portalRef"), cell("Recommended"), cell("Unique ID — used to detect duplicate submissions")],
]
story.append(styled_table(fm_data, [38*mm, 35*mm, 22*mm, CONTENT_W - 95*mm]))

# ===== Field Aliases =====
story.append(section_title("5. Accepted Field Name Aliases"))
story.append(para(
    "Our endpoint is forgiving on field names. MagicBricks can use whichever convention matches their "
    "internal schema — the table below lists all accepted variants (case-insensitive)."
))
al_data = [
    [cell("Logical Field", bold=True, color=colors.white),
     cell("Accepted JSON Keys (case-insensitive)", bold=True, color=colors.white)],
    [cell("Name"), cell("name, lead_name, customerName, customer_name")],
    [cell("Phone"), cell("phone, number, mobile, contact, mobileNumber, phone_number, mobile_number")],
    [cell("Email"), cell("email, mail, mailId, mail_id, emailId, email_id")],
    [cell("Source"), cell("source, portal, lead_source, portal_name, leadSource")],
    [cell("Budget"), cell("budget, budget_range, budgetRange")],
    [cell("Notes"), cell("notes, message, requirement, comment, description")],
    [cell("Project"), cell("projectName, project, project_name, propertyName, property_name")],
    [cell("Portal Ref"), cell("portalRef, ref, lead_id, leadId, reference, reference_id, external_id")],
]
story.append(styled_table(al_data, [35*mm, CONTENT_W - 35*mm]))

# ===== Response Codes =====
story.append(section_title("6. Response Codes"))
rc_data = [
    [cell("HTTP Status", bold=True, color=colors.white),
     cell("When", bold=True, color=colors.white),
     cell("Response Body", bold=True, color=colors.white)],
    [cell("201", color=C_SUCCESS, bold=True), cell("Lead accepted into pending queue"),
     cell('{ "id": "...", "status": "pending", "message": "..." }')],
    [cell("400", color=C_WARN, bold=True), cell("Missing name or phone"),
     cell('{ "error": "Both \'name\' and \'phone\' are required" }')],
    [cell("409", color=C_WARN, bold=True), cell("Duplicate (same phone + portalRef pending)"),
     cell('{ "error": "Duplicate", "message": "..." }')],
    [cell("500", color=C_WARN, bold=True), cell("Server error (rare)"),
     cell('{ "error": "Internal server error" }')],
]
story.append(styled_table(rc_data, [22*mm, 60*mm, CONTENT_W - 82*mm], font_size=8.5))

# ===== Integration Flow =====
story.append(section_title("7. End-to-End Integration Flow"))
story.append(bullet("<b>Customer</b> submits an enquiry on MagicBricks."))
story.append(bullet("<b>MagicBricks</b> sends the lead via HTTP POST to our endpoint in real time."))
story.append(bullet("Our system stores the lead in the <b>PortalLead holding table</b> with status = pending."))
story.append(bullet("The lead does <b>not</b> appear in the sales dashboard at this stage."))
story.append(bullet("Our <b>admin</b> opens the Portal Leads section, reviews the enquiry, assigns a salesperson and a project, then confirms."))
story.append(bullet("On confirmation, the lead is promoted into the main Lead table and becomes visible to the assigned salesperson."))
story.append(bullet("A timeline event is recorded automatically on the lead for audit purposes."))

# ===== Important Notes =====
story.append(section_title("8. Important Notes for MagicBricks"))
story.append(bullet("<b>Real-time forwarding</b> is preferred. Leads should be posted within 60 seconds of customer submission."))
story.append(bullet("<b>Always send portalRef</b> (MagicBricks Lead ID). Without it we cannot detect duplicate submissions and the same lead may be imported twice."))
story.append(bullet("<b>Phone format</b>: 10-digit Indian mobile, no +91 prefix, no spaces or hyphens. Example: 9876543210."))
story.append(bullet("<b>Send a test lead first</b>. After integration is live, please send one test lead with a dummy name (e.g. \"TEST MB Integration\") and share the response so we can verify at our end."))
story.append(bullet("<b>Idempotency</b>: If MagicBricks retries the same request (same phone + portalRef), we return 409 and skip — no duplicate is created. Safe to retry."))
story.append(bullet("<b>No authentication</b> is required currently. If MagicBricks policy mandates an API key or bearer token, please let us know and we will add it within one business day."))

# ===== Contact =====
story.append(section_title("9. Contact"))
contact_data = [
    [cell("Integration Lead", bold=True, color=colors.white),
     cell("[Your Name]", bold=True, color=colors.white)],
    [cell("Email"), cell("[your.email@company.com]")],
    [cell("Phone"), cell("[Your Phone Number]")],
    [cell("Endpoint Domain"), cell("leadsdekho.in")],
    [cell("Endpoint Path"), cell("/api/portal-leads")],
]
story.append(styled_table(contact_data, [50*mm, CONTENT_W - 50*mm]))

# ===== Build =====
doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print(f"PDF generated: {OUT}")
print(f"Size: {os.path.getsize(OUT) / 1024:.1f} KB")
