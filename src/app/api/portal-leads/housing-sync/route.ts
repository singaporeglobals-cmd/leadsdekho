import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { syncHousingLeads, syncAllHousingAccounts } from "@/lib/housing-api";

/**
 * POST /api/portal-leads/housing-sync — ADMIN only.
 *
 * Triggers a manual sync from Housing.com's partner API. Pulls leads from the
 * last N days (default 7, max 90) and inserts new ones into PortalLead with
 * status=pending.
 *
 * Query params:
 *   ?accountId=<id>   — sync only one specific Housing account
 *   (omitted)         — sync ALL active accounts sequentially
 *
 * Body (all optional):
 *   { days?: number }  // override lookback window
 *
 * Response (single account):
 *   { ok, fetched, imported, duplicated, failed, message }
 *
 * Response (all accounts):
 *   {
 *     ok: boolean,
 *     totalFetched, totalImported, totalDuplicated, totalFailed,
 *     perAccount: [{ accountId, label, result }],
 *     message: string  // aggregated
 *   }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "super_admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");

  // Optional days override
  let days = 7;
  try {
    const body = await req.json();
    if (typeof body?.days === "number") {
      days = Math.max(1, Math.min(90, Math.floor(body.days)));
    }
  } catch {
    // Body may be empty; ignore
  }

  // === Single-account sync ===
  if (accountId) {
    const account = await db.housingAccount.findUnique({ where: { id: accountId } });
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    if (!account.isActive) {
      return NextResponse.json({ error: "Account is inactive. Activate it first." }, { status: 400 });
    }

    try {
      const result = await syncHousingLeads(
        {
          profileId: account.profileId,
          encryptionKey: account.encryptionKey,
          defaultProjectId: account.defaultProjectId,
          lastLeadRef: account.lastLeadRef,
        },
        { days }
      );

      await db.housingAccount.update({
        where: { id: account.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: result.ok ? (result.failed > 0 ? "partial" : "success") : "error",
          lastSyncMessage: result.message.slice(0, 500),
        },
      });

      return NextResponse.json(result, { status: result.ok ? 200 : 502 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected sync failure";
      await db.housingAccount.update({
        where: { id: account.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: "error",
          lastSyncMessage: message.slice(0, 500),
        },
      });
      return NextResponse.json({ ok: false, message }, { status: 500 });
    }
  }

  // === Sync ALL active accounts ===
  const accounts = await db.housingAccount.findMany({ where: { isActive: true } });
  if (accounts.length === 0) {
    return NextResponse.json(
      { error: "No active Housing.com accounts configured. Add an account first." },
      { status: 400 }
    );
  }

  try {
    const result = await syncAllHousingAccounts(
      accounts.map((a) => ({
        id: a.id,
        label: a.label,
        profileId: a.profileId,
        encryptionKey: a.encryptionKey,
        defaultProjectId: a.defaultProjectId,
        lastLeadRef: a.lastLeadRef,
      })),
      { days }
    );

    const ok = result.perAccount.every((p) => p.result.ok);
    return NextResponse.json(
      {
        ok,
        ...result,
        message:
          `Synced ${accounts.length} account(s). ` +
          `Total fetched ${result.totalFetched}, imported ${result.totalImported}, ` +
          `duplicated ${result.totalDuplicated}, failed ${result.totalFailed}.`,
      },
      { status: ok ? 200 : 502 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected sync failure";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
