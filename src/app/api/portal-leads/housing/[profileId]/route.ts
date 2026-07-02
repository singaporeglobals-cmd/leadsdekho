import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

/**
 * PUBLIC webhook endpoint — Housing.com PUSHES leads here.
 *
 * URL pattern:
 *   POST https://leadsdekho.in/api/portal-leads/housing/<profileId>
 *
 * where <profileId> is the Housing.com Profile ID (e.g. 22239545).
 * We look up the matching HousingAccount by profileId to:
 *   1. Verify the HMAC-SHA256 signature (if Housing sends one) using the
 *      account's encryption key — prevents fake lead injection.
 *   2. Pre-fill source = "Housing.com" and the account's default project
 *      (if set) so admin doesn't have to.
 *
 * Housing's webhook payload field names vary, but commonly include:
 *   name / lead_name / customerName / customer_name
 *   phone / mobile / number / contact / mobile_number
 *   email / mail / email_id
 *   project / project_name / projectName / propertyName
 *   budget / budget_range
 *   message / notes / requirement / remarks
 *   lead_id / leadId / reference / id   (used as portalRef for dedup)
 *
 * We pick any of these (case-insensitive) so we're compatible with whatever
 * Housing sends today or tomorrow.
 *
 * Security:
 *   - If a signature header is present (X-Housing-Signature or signature),
 *     we verify it against HMAC-SHA256(encryptionKey, rawBody).
 *   - If no signature is present, we still accept the lead (Housing may not
 *     sign webhooks in all partner programs) but log a warning.
 *
 * Response:
 *   201: { id, status: "pending", message }
 *   400: { error } (missing name/phone)
 *   404: { error } (unknown profileId)
 *   409: { error: "Duplicate" }
 *   401: { error: "Invalid signature" }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const { profileId } = await params;

  // Look up the Housing account by profileId
  const account = await db.housingAccount.findFirst({
    where: { profileId, isActive: true },
  });
  if (!account) {
    return NextResponse.json(
      { error: `No active Housing.com account found for profile_id=${profileId}` },
      { status: 404 }
    );
  }

  // Read the raw body first (for signature verification)
  const rawBody = await req.text();

  // Parse JSON
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // === Signature verification (if Housing sent one) ===
  // Housing signs the body with HMAC-SHA256 using the encryption key.
  // Header name varies — we check a few common ones.
  const sigHeader =
    req.headers.get("x-housing-signature") ||
    req.headers.get("x-signature") ||
    req.headers.get("signature") ||
    req.headers.get("x-hub-signature-256") ||
    "";
  if (sigHeader) {
    const expected = crypto
      .createHmac("sha256", account.encryptionKey)
      .update(rawBody, "utf8")
      .digest("hex");
    // Sig may come as "sha256=<hex>" or just "<hex>"
    const provided = sigHeader.startsWith("sha256=")
      ? sigHeader.slice(7)
      : sigHeader;
    if (provided.toLowerCase() !== expected.toLowerCase()) {
      console.warn(`[housing-webhook] signature mismatch for profile ${profileId}`);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }
  }

  // === Extract lead fields (case-insensitive, many alias names) ===
  // Support nested shapes like { lead: { name, phone } } or { data: { ... } }
  const root = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const nested =
    (typeof root.lead === "object" && root.lead !== null
      ? root.lead
      : typeof root.data === "object" && root.data !== null
      ? root.data
      : root) as Record<string, unknown>;

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

  const name = pick(
    "name", "lead_name", "customerName", "customer_name",
    "client_name", "buyer_name", "userName"
  );
  const phoneRaw = pick(
    "phone", "mobile", "number", "contact", "mobileNumber",
    "phone_number", "mobile_number", "contact_number", "phoneNumber"
  );
  // Normalize phone: strip +91, spaces, hyphens
  const phone = phoneRaw.replace(/[^\d]/g, "").replace(/^91/, "").replace(/^0/, "").slice(0, 10);

  if (!name || !phone) {
    return NextResponse.json(
      { error: "Both 'name' and 'phone' are required in the webhook payload" },
      { status: 400 }
    );
  }

  const email = pick("email", "mail", "mailId", "mail_id", "emailId", "email_id");
  const budget = pick("budget", "budget_range", "budgetRange", "price", "max_budget");
  const projectName = pick(
    "projectName", "project", "project_name", "propertyName", "property_name",
    "project_title"
  );
  const notes = pick(
    "notes", "message", "requirement", "comment", "description",
    "requirement_text", "query", "remark", "remarks"
  );
  const portalRef = pick(
    "portalRef", "ref", "lead_id", "leadId", "reference", "reference_id",
    "external_id", "lead_code", "id"
  );

  // === Duplicate check ===
  if (portalRef) {
    const existing = await db.portalLead.findFirst({
      where: { phone, portalRef, status: { in: ["pending", "confirmed"] } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Duplicate", message: "This lead is already in the queue" },
        { status: 409 }
      );
    }
  } else {
    // No portalRef — dedup by phone alone for pending leads
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
  // Pre-fill source = "Housing.com" and the account's default project (if set).
  const portalLead = await db.portalLead.create({
    data: {
      name,
      phone,
      email: email || null,
      source: "Housing.com",
      budget: budget || null,
      notes: notes || null,
      projectName: projectName || null,
      portalRef: portalRef || null,
      rawPayload: body as object,
      projectId: account.defaultProjectId || null,
    },
  });

  // Update the account's last-sync metadata (treat webhook delivery as a sync)
  try {
    await db.housingAccount.update({
      where: { id: account.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: "success",
        lastSyncMessage: `Webhook: received lead from ${name} (${phone})`,
      },
    });
  } catch (err) {
    console.error("[housing-webhook] failed to update last-sync", err);
  }

  return NextResponse.json(
    {
      id: portalLead.id,
      status: "pending",
      message: "Lead received from Housing.com webhook. Admin will review shortly.",
    },
    { status: 201 }
  );
}

/**
 * GET — returns 200 to confirm the webhook URL is reachable. Housing's
 * partner team may ping this to verify the endpoint before activating push.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const { profileId } = await params;
  const account = await db.housingAccount.findFirst({
    where: { profileId },
    select: { id: true, label: true, isActive: true },
  });
  if (!account) {
    return NextResponse.json(
      { ok: false, error: `No Housing.com account with profile_id=${profileId}` },
      { status: 404 }
    );
  }
  return NextResponse.json({
    ok: true,
    message: `Webhook endpoint active for Housing.com account "${account.label}".`,
    profileId,
    isActive: account.isActive,
    method: "POST",
    contentType: "application/json",
    requiredFields: ["name", "phone"],
    optionalFields: ["email", "budget", "projectName", "notes", "portalRef"],
    signatureHeader: "X-Housing-Signature (optional, HMAC-SHA256 hex of raw body using encryption key)",
  });
}
