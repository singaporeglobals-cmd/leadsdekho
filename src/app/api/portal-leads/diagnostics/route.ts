import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/portal-leads/diagnostics — ADMIN only.
 *
 * Returns the most recent inbound portal leads across ALL sources so the admin
 * can see at a glance whether MagicBricks / Housing / etc. are actually pushing
 * leads to the system.
 *
 * Query params:
 *   ?limit=20  (max 100, default 20)
 *
 * Response:
 *   {
 *     recent: [{ id, name, phone, source, projectName, portalRef, createdAt, status, rawPayload }],
 *     bySource: [{ source, count }],
 *     pendingTotal: number,
 *     last24h: number,
 *     last7d: number,
 *     endpoints: { generic, magicbricks, housing }
 *   }
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "super_admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

  // Most recent inbound leads (across all statuses)
  const recent = await db.portalLead.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      source: true,
      budget: true,
      notes: true,
      projectName: true,
      portalRef: true,
      status: true,
      createdAt: true,
      rawPayload: true,
    },
  });

  // Counts by source
  const bySource = await db.portalLead.groupBy({
    by: ["source"],
    _count: { _all: true },
    orderBy: { _count: { id: "desc" } },
  });

  // Pending total
  const pendingTotal = await db.portalLead.count({ where: { status: "pending" } });

  // Counts in last 24h and last 7d
  const now = new Date();
  const last24h = await db.portalLead.count({
    where: { createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
  });
  const last7d = await db.portalLead.count({
    where: { createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
  });

  // Housing account webhook URLs (so admin can copy them too)
  const housingAccounts = await db.housingAccount.findMany({
    where: { isActive: true },
    select: { id: true, label: true, profileId: true, lastSyncAt: true, lastSyncStatus: true, lastSyncMessage: true },
    orderBy: { label: "asc" },
  });

  const base = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "leadsdekho.in");
  const proto = req.headers.get("x-forwarded-proto") || "https";

  return NextResponse.json({
    recent,
    bySource: bySource.map((g) => ({ source: g.source, count: g._count._all })),
    pendingTotal,
    last24h,
    last7d,
    endpoints: {
      generic: `${proto}://${base}/api/portal-leads`,
      magicbricks: `${proto}://${base}/api/portal-leads/magicbricks`,
      housing: housingAccounts.map((a) => ({
        label: a.label,
        profileId: a.profileId,
        url: `${proto}://${base}/api/portal-leads/housing/${a.profileId}`,
        lastSyncAt: a.lastSyncAt,
        lastSyncStatus: a.lastSyncStatus,
        lastSyncMessage: a.lastSyncMessage,
      })),
    },
  });
}
