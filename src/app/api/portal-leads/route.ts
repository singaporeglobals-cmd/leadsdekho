import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * PUBLIC endpoint — accepts incoming leads from external portals (Housing.com,
 * MagicBricks, 99acres, etc.). No authentication required; portals can't auth.
 *
 * SECURITY: This endpoint is rate-limited and accepts only the lead fields.
 * Leads are saved into the PortalLead table (NOT the main Lead table) so they
 * don't pollute the lead dashboard until an admin has reviewed and confirmed them.
 *
 * The endpoint accepts ANY of these field name variations (case-insensitive):
 *   - name / lead_name / customerName / customer_name
 *   - phone / number / mobile / contact / mobileNumber / phone_number
 *   - email / mail / mailId / mail_id / emailId
 *   - source / portal / lead_source / portal_name  (default: "Portal")
 *   - budget / budget_range / budgetRange
 *   - notes / message / requirement / comment
 *   - projectName / project / project_name / propertyName
 *   - portalRef / ref / lead_id / leadId / reference
 *
 * Required fields: name AND phone (both must be non-empty)
 *
 * Response 201: { id, status: "pending", message }
 * Response 400: { error } (missing name/phone)
 * Response 409: { error: "Duplicate" } (same phone + portalRef already received)
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Helper to read a value from the body by trying multiple field-name aliases
  const pick = (...keys: string[]): string => {
    for (const k of keys) {
      // Case-insensitive search across all keys in body
      const found = Object.keys(body).find(
        (bk) => bk.toLowerCase() === k.toLowerCase()
      );
      if (found) {
        const v = body[found];
        if (v !== null && v !== undefined && String(v).trim() !== "") {
          return String(v).trim();
        }
      }
    }
    return "";
  };

  const name = pick("name", "lead_name", "customerName", "customer_name", "BuyerName", "Name", "LeadName", "ContactName");
  const phoneRaw = pick("phone", "number", "mobile", "contact", "mobileNumber", "phone_number", "mobile_number", "ContactNo", "Mobile", "Contact", "MobileNumber", "ContactNumber", "PhoneNumber");
  const email = pick("email", "mail", "mailId", "mail_id", "emailId", "email_id", "EmailID", "Email", "MailID", "MailId");
  let source = pick("source", "portal", "lead_source", "portal_name", "leadSource", "LeadSource", "SubSource") || "";
  const budget = pick("budget", "budget_range", "budgetRange", "Budget", "BudgetRange", "Price");
  const notes = pick("notes", "message", "requirement", "comment", "description", "Remark", "Remarks", "Requirement", "RequirementText", "Query");
  const projectName = pick("projectName", "project", "project_name", "propertyName", "property_name", "ProjectName", "Project", "PropertyName");
  const portalRef = pick("portalRef", "ref", "lead_id", "leadId", "reference", "reference_id", "external_id", "RequirementID", "LeadID", "LeadId", "Reference", "ExternalID", "LeadCode");
  const city = pick("city", "city_name", "cityName", "CityName", "City");

  // Auto-detect source if not explicitly provided
  if (!source) {
    const raw = JSON.stringify(body).toLowerCase();
    if (raw.includes("magicbricks") || raw.includes("magic_bricks") || raw.includes("magic-bricks")) {
      source = "MagicBricks";
    } else if (raw.includes("housing")) {
      source = "Housing.com";
    } else if (raw.includes("99acres")) {
      source = "99acres";
    } else {
      source = "Portal";
    }
  }

  // If source contains "magic" but isn't exactly "MagicBricks", normalize
  if (source.toLowerCase().includes("magic") && source !== "MagicBricks") {
    source = "MagicBricks";
  }

  if (!name || !phoneRaw) {
    return NextResponse.json(
      { error: "Both 'name' and 'phone' are required" },
      { status: 400 }
    );
  }

  // Normalize phone: keep only digits, strip leading 91 / 0, take last 10
  const phone = phoneRaw.replace(/[^\d]/g, "").replace(/^91/, "").replace(/^0/, "").slice(-10);
  if (phone.length < 10) {
    return NextResponse.json(
      { error: `Phone number '${phoneRaw}' is invalid — need at least 10 digits` },
      { status: 400 }
    );
  }

  // Duplicate check: same phone + portalRef already pending (avoid double-import from same portal)
  if (portalRef) {
    const existing = await db.portalLead.findFirst({
      where: { phone, portalRef, status: "pending" },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Duplicate", message: "This lead is already in the pending queue" },
        { status: 409 }
      );
    }
  }

  // Save the lead into the PortalLead holding table
  // Combine city + notes for richer context (so admin sees city at a glance)
  const combinedNotes = city && notes ? `City: ${city} | ${notes}` : (city ? `City: ${city}` : notes);

  const portalLead = await db.portalLead.create({
    data: {
      name,
      phone,
      email: email || null,
      source,
      budget: budget || null,
      notes: combinedNotes || null,
      projectName: projectName || null,
      portalRef: portalRef || null,
      rawPayload: body as object,
    },
  });

  // Log incoming lead for debugging (visible in Vercel logs)
  console.log(
    `[portal-leads] received lead: source=${source}, name=${name}, phone=${phone}, ` +
      `project=${projectName || "n/a"}, ref=${portalRef || "n/a"}`
  );

  return NextResponse.json(
    {
      id: portalLead.id,
      status: "pending",
      message: "Lead received. An admin will review it shortly.",
    },
    { status: 201 }
  );
}

/**
 * GET endpoint — ADMIN only. Lists pending portal leads for review.
 * Supports ?status=pending|confirmed|discarded (default: pending).
 */
export async function GET(req: NextRequest) {
  // Lazy import to avoid pulling auth into the public POST path's bundle (minor optimization)
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "super_admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "pending";

  const portalLeads = await db.portalLead.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
  });

  // Total pending count for badge
  const pendingCount = await db.portalLead.count({ where: { status: "pending" } });

  return NextResponse.json({ portalLeads, pendingCount });
}
