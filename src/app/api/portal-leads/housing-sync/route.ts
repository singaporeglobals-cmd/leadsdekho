import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { syncHousingLeads } from "@/lib/housing-api";

/**
 * POST /api/portal-leads/housing-sync — ADMIN only.
 *
 * Triggers a manual sync from Housing.com's partner API. Pulls leads from the
 * last N days (default 7, max 90) and inserts new ones into PortalLead with
 * status=pending. Updates PortalSetting.housingLastSync* fields with the
 * result.
 *
 * Body (all optional):
 *   { days?: number }  // override lookback window
 *
 * Response:
 *   { ok, fetched, imported, duplicated, failed, message }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "super_admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  // Load settings
  let settings = await db.portalSetting.findUnique({ where: { id: "singleton" } });
  if (!settings) {
    settings = await db.portalSetting.create({ data: { id: "singleton" } });
  }

  if (!settings.housingProfileId || !settings.housingEncryptionKey) {
    return NextResponse.json(
      { error: "Housing.com credentials are not configured. Please save Profile ID and Encryption Key first." },
      { status: 400 }
    );
  }

  // Optional days override from body
  let days = 7;
  try {
    const body = await req.json();
    if (typeof body?.days === "number") {
      days = Math.max(1, Math.min(90, Math.floor(body.days)));
    }
  } catch {
    // Body may be empty; ignore
  }

  try {
    const result = await syncHousingLeads(
      {
        profileId: settings.housingProfileId,
        encryptionKey: settings.housingEncryptionKey,
        defaultProjectId: settings.housingDefaultProjectId,
        lastLeadRef: settings.housingLastLeadRef,
      },
      { days }
    );

    // Persist last sync status
    await db.portalSetting.update({
      where: { id: "singleton" },
      data: {
        housingLastSyncAt: new Date(),
        housingLastSyncStatus: result.ok ? (result.failed > 0 ? "partial" : "success") : "error",
        housingLastSyncMessage: result.message.slice(0, 500),
      },
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected sync failure";
    await db.portalSetting.update({
      where: { id: "singleton" },
      data: {
        housingLastSyncAt: new Date(),
        housingLastSyncStatus: "error",
        housingLastSyncMessage: message.slice(0, 500),
      },
    });
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
