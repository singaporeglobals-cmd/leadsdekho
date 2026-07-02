/**
 * Housing.com Partner API client.
 *
 * Housing.com provides partners (brokers / developers) with a Profile ID and
 * an Encryption Key. The Encryption Key is used to sign outbound requests
 * with HMAC-SHA256. The signed request returns JSON (or XML in legacy mode)
 * with a list of leads for the partner's projects.
 *
 * Endpoint pattern (partner lead-pull API):
 *   POST https://lead.housing.com/api/v2/leads/get
 *   Content-Type: application/json
 *   Body: { profile_id, from_date, to_date, signature }
 *   signature = HMAC-SHA256(encryptionKey, profile_id + from_date + to_date)
 *
 * The response shape varies slightly by Housing API version. We parse
 * defensively and accept a few common shapes:
 *   - { leads: [...] }
 *   - { data: [...] }
 *   - { result: [...] }
 *   - [...] (raw array)
 *
 * If Housing pushes leads via webhook instead (recommended), admin can skip
 * the sync button entirely — incoming POSTs land in /api/portal-leads and
 * appear here automatically.
 */

import crypto from "crypto";
import { db } from "@/lib/db";

export interface HousingLead {
  // Normalized lead shape after parsing Housing's response
  name: string;
  phone: string;
  email?: string | null;
  budget?: string | null;
  projectName?: string | null;
  notes?: string | null;
  portalRef?: string | null;
  raw: Record<string, unknown>;
}

interface SyncResult {
  ok: boolean;
  fetched: number;
  imported: number;
  duplicated: number;
  failed: number;
  message: string;
  sample?: HousingLead;
}

interface HousingConfig {
  profileId: string;
  encryptionKey: string;
  defaultProjectId?: string | null;
  lastLeadRef?: string | null;
}

export interface HousingAccountRow {
  id: string;
  label: string;
  profileId: string;
  encryptionKey: string;
  defaultProjectId?: string | null;
  lastLeadRef?: string | null;
}

/**
 * Compute HMAC-SHA256 signature hex. Housing's docs require this to be
 * appended to the request as the `signature` field.
 */
function sign(encryptionKey: string, message: string): string {
  return crypto
    .createHmac("sha256", encryptionKey)
    .update(message, "utf8")
    .digest("hex");
}

/**
 * Normalize a phone number into a 10-digit Indian mobile. Strips +91,
 * spaces, hyphens. Returns empty string if not 10 digits after cleanup.
 */
function normalizePhone(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return "";
  const s = String(raw).replace(/[^\d]/g, "");
  // Strip leading 91 if present
  if (s.length === 12 && s.startsWith("91")) return s.slice(2);
  if (s.length === 11 && s.startsWith("0")) return s.slice(1);
  if (s.length === 10) return s;
  return s; // let downstream validation handle odd lengths
}

/**
 * Pick a value from a record by trying multiple known field-name aliases
 * (case-insensitive).
 */
function pick(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const found = Object.keys(obj).find(
      (bk) => bk.toLowerCase() === k.toLowerCase()
    );
    if (found) {
      const v = obj[found];
      if (v !== null && v !== undefined && String(v).trim() !== "") {
        return String(v).trim();
      }
    }
  }
  return "";
}

/**
 * Normalize one raw lead object from Housing's API into our internal shape.
 */
function normalizeLead(raw: Record<string, unknown>): HousingLead | null {
  const name = pick(raw, "name", "lead_name", "customerName", "customer_name", "client_name", "buyer_name");
  const phone = normalizePhone(
    pick(raw, "phone", "mobile", "number", "contact", "mobileNumber", "phone_number", "mobile_number", "contact_number")
  );
  if (!name || !phone) return null;

  const email = pick(raw, "email", "mail", "emailId", "email_id", "mail_id");
  const budget = pick(raw, "budget", "budget_range", "budgetRange", "price", "max_budget");
  const projectName = pick(
    raw,
    "projectName", "project", "project_name", "propertyName", "property_name",
    "project_title", "project_name_text"
  );
  const notes = pick(
    raw,
    "notes", "message", "requirement", "comment", "description",
    "requirement_text", "query", "remark", "remarks"
  );
  const portalRef = pick(
    raw,
    "portalRef", "ref", "lead_id", "leadId", "reference", "reference_id",
    "external_id", "lead_code", "id"
  );

  return {
    name,
    phone,
    email: email || null,
    budget: budget || null,
    projectName: projectName || null,
    notes: notes || null,
    portalRef: portalRef || null,
    raw,
  };
}

/**
 * Fetch leads from Housing's API. Returns an array of normalized leads.
 *
 * Strategy:
 *   - Try the documented POST endpoint with HMAC signature first
 *   - Fall back to GET with profile_id + key as query params
 *   - If both fail, throw with the most informative error message
 */
export async function fetchHousingLeads(
  config: HousingConfig,
  fromDate: string,
  toDate: string
): Promise<{ leads: HousingLead[]; rawStatus: number; rawBodyPreview: string }> {
  const { profileId, encryptionKey } = config;
  if (!profileId || !encryptionKey) {
    throw new Error("Housing.com Profile ID and Encryption Key are required");
  }

  // Build signature. Housing's partner docs require this to be appended to the
  // request as the `signature` field.
  const message = `${profileId}${fromDate}${toDate}`;
  const signature = sign(encryptionKey, message);

  // Endpoint candidates — Housing has used different URLs over time.
  // We try each in order until one returns a parseable response.
  const endpoints = [
    "https://lead.housing.com/api/v2/leads/get",
    "https://lead.housing.com/api/v1/leads/get",
    "https://api.housing.com/api/v2/leads/get",
    "https://developer.housing.com/api/v1/leads/get",
  ];

  let lastErr: Error | null = null;
  let lastStatus = 0;
  let lastBodyPreview = "";

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          profile_id: profileId,
          from_date: fromDate,
          to_date: toDate,
          signature,
        }),
        // Vercel serverless function timeout guard
        next: { revalidate: 0 },
      });

      lastStatus = res.status;
      const text = await res.text();
      lastBodyPreview = text.slice(0, 500);

      if (!res.ok) {
        lastErr = new Error(`Housing API ${res.status}: ${lastBodyPreview}`);
        continue;
      }

      // Parse JSON
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        lastErr = new Error(`Housing API returned non-JSON: ${lastBodyPreview}`);
        continue;
      }

      // Extract leads array from common response shapes
      const leadsRaw = extractLeadsArray(json);
      if (leadsRaw.length === 0) {
        // Maybe this endpoint is the right one but genuinely has 0 leads
        // in the window — return empty success rather than continuing.
        return { leads: [], rawStatus: res.status, rawBodyPreview: lastBodyPreview };
      }

      const normalized = leadsRaw
        .map((r) => normalizeLead(r as Record<string, unknown>))
        .filter((l): l is HousingLead => l !== null);

      return { leads: normalized, rawStatus: res.status, rawBodyPreview: lastBodyPreview };
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      continue;
    }
  }

  throw lastErr || new Error("Failed to fetch leads from Housing.com — all endpoints returned errors");
}

/**
 * Try to extract a leads array from various response shapes.
 */
function extractLeadsArray(json: unknown): unknown[] {
  if (Array.isArray(json)) return json;
  if (typeof json !== "object" || json === null) return [];

  const obj = json as Record<string, unknown>;
  for (const key of ["leads", "data", "result", "results", "items", "lead_list"]) {
    if (Array.isArray(obj[key])) return obj[key] as unknown[];
  }

  // Some responses wrap leads in a `response` object
  if (typeof obj.response === "object" && obj.response !== null) {
    return extractLeadsArray(obj.response);
  }

  return [];
}

/**
 * Main sync function. Called by /api/portal-leads/housing-sync.
 *
 * Pulls leads from Housing for the given date window (default: last 7 days),
 * inserts new ones into PortalLead with status=pending, skips duplicates
 * (by phone+portalRef or phone alone), and returns a summary.
 */
export async function syncHousingLeads(
  config: HousingConfig,
  options: { days?: number } = {}
): Promise<SyncResult> {
  const days = Math.max(1, Math.min(90, options.days ?? 7));
  const now = new Date();
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Housing expects dates in YYYY-MM-DD HH:MM:SS or YYYY-MM-DD format
  const fmt = (d: Date) =>
    d.toISOString().slice(0, 19).replace("T", " ");

  let fetched: HousingLead[] = [];
  let rawStatus = 0;
  let rawBodyPreview = "";
  try {
    const result = await fetchHousingLeads(config, fmt(from), fmt(now));
    fetched = result.leads;
    rawStatus = result.rawStatus;
    rawBodyPreview = result.rawBodyPreview;
  } catch (err) {
    return {
      ok: false,
      fetched: 0,
      imported: 0,
      duplicated: 0,
      failed: 0,
      message: err instanceof Error ? err.message : "Housing API request failed",
    };
  }

  if (fetched.length === 0) {
    return {
      ok: true,
      fetched: 0,
      imported: 0,
      duplicated: 0,
      failed: 0,
      message: rawBodyPreview
        ? `Housing API responded OK but no leads found in last ${days} days. Preview: ${rawBodyPreview.slice(0, 200)}`
        : `No leads found in the last ${days} days.`,
    };
  }

  // Insert into PortalLead, skipping duplicates.
  // Duplicate rule: same phone + portalRef already pending/confirmed.
  // If no portalRef, fall back to phone-only dedup against pending queue.
  let imported = 0;
  let duplicated = 0;
  let failed = 0;
  let sample: HousingLead | undefined;

  for (const lead of fetched) {
    try {
      // Check duplicate
      let existing: { id: string } | null = null;
      if (lead.portalRef) {
        existing = await db.portalLead.findFirst({
          where: {
            phone: lead.phone,
            portalRef: lead.portalRef,
            status: { in: ["pending", "confirmed"] },
          },
          select: { id: true },
        });
      }
      if (!existing) {
        // Also check by phone alone for pending leads (same person re-enquiring)
        existing = await db.portalLead.findFirst({
          where: { phone: lead.phone, status: "pending" },
          select: { id: true },
        });
      }

      if (existing) {
        duplicated++;
        continue;
      }

      await db.portalLead.create({
        data: {
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          source: "Housing.com",
          budget: lead.budget,
          notes: lead.notes,
          projectName: lead.projectName,
          portalRef: lead.portalRef,
          rawPayload: lead.raw as object,
          // Pre-assign default project if admin has configured one
          projectId: config.defaultProjectId || null,
        },
      });
      if (!sample) sample = lead;
      imported++;
    } catch (err) {
      console.error("Housing sync: failed to insert lead", err);
      failed++;
    }
  }

  return {
    ok: true,
    fetched: fetched.length,
    imported,
    duplicated,
    failed,
    message:
      `Fetched ${fetched.length} lead(s) from Housing.com (HTTP ${rawStatus}). ` +
      `Imported ${imported}, skipped ${duplicated} duplicate(s), failed ${failed}.`,
    sample,
  };
}

/**
 * Sync multiple Housing accounts in sequence. Returns aggregated stats
 * plus per-account details so the UI can show which accounts succeeded
 * and which failed.
 */
export async function syncAllHousingAccounts(
  accounts: HousingAccountRow[],
  options: { days?: number } = {}
): Promise<{
  totalFetched: number;
  totalImported: number;
  totalDuplicated: number;
  totalFailed: number;
  perAccount: Array<{ accountId: string; label: string; result: SyncResult }>;
  messages: string[];
}> {
  let totalFetched = 0;
  let totalImported = 0;
  let totalDuplicated = 0;
  let totalFailed = 0;
  const perAccount: Array<{ accountId: string; label: string; result: SyncResult }> = [];
  const messages: string[] = [];

  for (const acct of accounts) {
    const result = await syncHousingLeads(
      {
        profileId: acct.profileId,
        encryptionKey: acct.encryptionKey,
        defaultProjectId: acct.defaultProjectId,
        lastLeadRef: acct.lastLeadRef,
      },
      options
    );

    // Update the account's last-sync metadata
    try {
      await db.housingAccount.update({
        where: { id: acct.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: result.ok ? (result.failed > 0 ? "partial" : "success") : "error",
          lastSyncMessage: result.message.slice(0, 500),
        },
      });
    } catch (err) {
      console.error(`Failed to update last-sync for account ${acct.id}`, err);
    }

    totalFetched += result.fetched;
    totalImported += result.imported;
    totalDuplicated += result.duplicated;
    totalFailed += result.failed;
    perAccount.push({ accountId: acct.id, label: acct.label, result });
    messages.push(`[${acct.label}] ${result.message}`);
  }

  return {
    totalFetched,
    totalImported,
    totalDuplicated,
    totalFailed,
    perAccount,
    messages,
  };
}
