import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * PUBLIC webhook endpoint — MagicBricks PUSHES leads here.
 *
 * URL pattern:
 *   POST https://leadsdekho.in/api/portal-leads/magicbricks
 *
 * This is a dedicated endpoint that handles MagicBricks's payload format,
 * including PascalCase field names (BuyerName, ContactNo, EmailID, CityName,
 * ProjectName, Budget, Remark, LeadID, RequirementID, etc.) as well as the
 * more generic lowercase aliases supported by /api/portal-leads.
 *
 * MagicBricks's partner integration typically POSTs a JSON document with
 * one of these shapes:
 *
 *   1. Flat object (most common):
 *        {
 *          "BuyerName": "Ramesh Kumar",
 *          "ContactNo": "9876543210",
 *          "EmailID": "ramesh@example.com",
 *          "CityName": "Kolkata",
 *          "ProjectName": "Royal Aura",
 *          "Budget": "50-70 Lacs",
 *          "Remark": "Looking for 3 BHK",
 *          "RequirementID": "MB1234567",
 *          "LeadSource": "MagicBricks",
 *          "PostedOn": "2024-12-01 12:30:00"
 *        }
 *
 *   2. Wrapped under a "lead" or "data" key:
 *        { "lead": { "BuyerName": "...", "ContactNo": "..." } }
 *
 *   3. Plain lowercase aliases (also accepted):
 *        { "name": "...", "phone": "...", "email": "..." }
 *
 * Required fields (case-insensitive, any alias accepted):
 *   - BuyerName / Name / LeadName / CustomerName / ContactName
 *   - ContactNo / Mobile / Phone / Number / Contact / MobileNumber
 *
 * Optional fields:
 *   - EmailID / Email / MailID
 *   - CityName / City
 *   - ProjectName / Project / PropertyName
 *   - Budget / BudgetRange / Price
 *   - Remark / Remarks / Message / Requirement / Notes / Comment / Description
 *   - RequirementID / LeadID / LeadId / Ref / Reference / ExternalID
 *   - LeadSource / Source / SubSource
 *
 * Security:
 *   - Public endpoint (no auth — MagicBricks can't authenticate)
 *   - If a signature header is present (X-MB-Signature, X-MagicBricks-Signature,
 *     X-Signature), it is logged but not strictly enforced. MagicBricks doesn't
 *     always sign webhooks; admin should review each lead before confirming.
 *   - Rate limiting is handled at the platform level.
 *
 * Response:
 *   201: { id, status: "pending", message }
 *   400: { error } (missing name/phone, or invalid JSON)
 *   409: { error: "Duplicate" } (same phone + portalRef already pending)
 */
export async function POST(req: NextRequest) {
  // Read raw body first (for logging / future signature verification)
  const rawBody = await req.text();

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. MagicBricks must POST a JSON document." },
      { status: 400 }
    );
  }

  // Support nested shapes: { lead: {...} } or { data: {...} } or flat
  const root = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const nested =
    (typeof root.lead === "object" && root.lead !== null
      ? root.lead
      : typeof root.data === "object" && root.data !== null
      ? root.data
      : typeof root.Lead === "object" && root.Lead !== null
      ? root.Lead
      : root) as Record<string, unknown>;

  // Helper: case-insensitive multi-key lookup
  const pick = (...keys: string[]): string => {
    for (const k of keys) {
      const found = Object.keys(nested).find(
        (bk) => bk.toLowerCase() === k.toLowerCase()
      );
      if (found) {
        const v = nested[found];
        if (v !== null && v !== undefined && String(v).trim() !== "") {
          return String(v).trim();
        }
      }
    }
    return "";
  };

  // === Extract lead fields (MagicBricks PascalCase + generic lowercase) ===
  const name = pick(
    "BuyerName", "Name", "LeadName", "CustomerName", "ContactName",
    "Customer_Name", "Lead_Name", "name", "lead_name", "customerName",
    "userName", "client_name", "buyer_name"
  );
  const phoneRaw = pick(
    "ContactNo", "Mobile", "Phone", "Number", "Contact", "MobileNumber",
    "ContactNumber", "PhoneNumber", "Phone_Number", "Mobile_Number",
    "phone", "mobile", "number", "contact", "mobileNumber",
    "phone_number", "mobile_number", "contact_number", "phoneNumber"
  );
  // Normalize phone: keep only digits, strip leading 91 / 0, take last 10
  const phone = phoneRaw
    .replace(/[^\d]/g, "")
    .replace(/^91/, "")
    .replace(/^0/, "")
    .slice(-10);

  if (!name || !phone) {
    return NextResponse.json(
      {
        error:
          "Both 'BuyerName' (or Name) and 'ContactNo' (or Mobile/Phone) are required in the MagicBricks payload",
      },
      { status: 400 }
    );
  }

  const email = pick(
    "EmailID", "Email", "MailID", "MailId", "EmailId",
    "email", "mail", "mailId", "mail_id", "emailId", "email_id"
  );
  const city = pick("CityName", "City", "city", "city_name", "cityName");
  const budget = pick(
    "Budget", "BudgetRange", "Price", "MaxBudget", "Max_Budget",
    "budget", "budget_range", "budgetRange", "price"
  );
  const projectName = pick(
    "ProjectName", "Project", "PropertyName", "Property_Name",
    "projectName", "project", "project_name", "propertyName",
    "property_name", "project_title"
  );
  // MagicBricks typically uses "Remark" or "Remarks" for the requirement text
  const remark = pick(
    "Remark", "Remarks", "Message", "Requirement", "RequirementText",
    "Query", "Comment", "Description", "Notes",
    "notes", "message", "requirement", "comment", "description",
    "requirement_text", "query", "remark", "remarks"
  );
  // Combine city + remark into notes for fuller context
  const notes = [city && `City: ${city}`, remark].filter(Boolean).join(remark && city ? " | " : "");

  // MagicBricks lead ID / reference — used for dedup
  const portalRef = pick(
    "RequirementID", "LeadID", "LeadId", "Ref", "Reference",
    "ReferenceID", "ExternalID", "ID", "LeadCode",
    "portalRef", "ref", "lead_id", "leadId", "reference",
    "reference_id", "external_id", "lead_code", "id"
  );

  // Sub-source (e.g. "MagicBricks - Kolkata") if MagicBricks sends one
  const subSource = pick("LeadSource", "Source", "SubSource", "leadSource", "source", "portal");

  // === Duplicate check ===
  // If portalRef is present, dedup by (phone + portalRef). Otherwise dedup by phone.
  if (portalRef) {
    const existing = await db.portalLead.findFirst({
      where: { phone, portalRef, status: { in: ["pending", "confirmed"] } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Duplicate", message: "This MagicBricks lead is already in the queue" },
        { status: 409 }
      );
    }
  } else {
    const existing = await db.portalLead.findFirst({
      where: { phone, status: "pending" },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Duplicate", message: "A pending lead with this phone already exists" },
        { status: 409 }
      );
    }
  }

  // === Insert into PortalLead ===
  // Source is always "MagicBricks" so admin can filter / report on it.
  const portalLead = await db.portalLead.create({
    data: {
      name,
      phone,
      email: email || null,
      source: "MagicBricks",
      budget: budget || null,
      notes: notes || null,
      projectName: projectName || null,
      portalRef: portalRef || null,
      rawPayload: body as object,
    },
  });

  // Log the incoming webhook for debugging (visible in Vercel logs)
  console.log(
    `[magicbricks-webhook] received lead: name=${name}, phone=${phone}, ` +
      `project=${projectName || "n/a"}, ref=${portalRef || "n/a"}, ` +
      `subSource=${subSource || "n/a"}`
  );

  return NextResponse.json(
    {
      id: portalLead.id,
      status: "pending",
      message: "Lead received from MagicBricks webhook. Admin will review shortly.",
    },
    { status: 201 }
  );
}

/**
 * GET — returns 200 to confirm the webhook URL is reachable.
 * MagicBricks's partner team may ping this to verify the endpoint before
 * activating lead push.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "MagicBricks webhook endpoint is active.",
    endpoint: "POST /api/portal-leads/magicbricks",
    contentType: "application/json",
    requiredFields: ["BuyerName (or Name)", "ContactNo (or Mobile/Phone)"],
    optionalFields: [
      "EmailID",
      "CityName",
      "ProjectName",
      "Budget",
      "Remark",
      "RequirementID",
      "LeadSource",
    ],
    notes:
      "Both PascalCase (MagicBricks style) and lowercase field names are accepted. Phone numbers are normalized to 10 digits.",
  });
}
