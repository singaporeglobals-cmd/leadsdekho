import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/reports/source-wise?from=2026-01-01&to=2026-06-30
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  // Multi-value filters (comma-separated)
  const splitList = (v: string | null): string[] =>
    v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const projectList = splitList(searchParams.get("project"));
  const sourceList = splitList(searchParams.get("source"));
  const leadStatusList = splitList(searchParams.get("leadStatus"));

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const startDate = from ? new Date(from + "T00:00:00.000Z") : defaultFrom;
  const endDate = to ? new Date(to + "T23:59:59.999Z") : defaultTo;

  const where: Record<string, unknown> = {
    createdAt: { gte: startDate, lte: endDate },
  };

  // Project filter
  if (projectList.length > 0) {
    where.project = { id: { in: projectList } };
  }

  // Source filter
  if (sourceList.length > 0) {
    where.source = { in: sourceList };
  }

  // Lead status filter
  if (leadStatusList.length > 0) {
    where.leadStatus = { in: leadStatusList };
  }

  if (user.role === "sales" || user.role === "telecalling") {
    where.OR = [{ currentOwnerId: user.id }, { primaryOwnerId: user.id }];
  }

  // Get all leads in range
  // Include siteVisits filtered by the date range so we only count visits
  // that happened in this period (not visits from a different month on a
  // lead that was created in this range).
  const leads = await db.lead.findMany({
    where,
    include: {
      primaryOwner: { select: { name: true } },
      currentOwner: { select: { name: true } },
      project: { select: { name: true } },
      callLogs: { select: { id: true } },
      followUps: { select: { id: true, completed: true } },
      siteVisits: {
        where: {
          scheduledAt: { gte: startDate, lte: endDate },
        },
        select: { id: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by source
  const bySource: Record<string, {
    source: string;
    leads: typeof leads;
    total: number;
    statusBreakdown: Record<string, number>;
    projectBreakdown: Record<string, number>;
    wonCount: number;
    lostCount: number;
    callCount: number;
    followUpCount: number;
    siteVisitCount: number;
    completedFollowUps: number;
  }> = {};

  leads.forEach((lead) => {
    const src = lead.source || "Unknown";
    if (!bySource[src]) {
      bySource[src] = {
        source: src,
        leads: [],
        total: 0,
        statusBreakdown: {},
        projectBreakdown: {},
        wonCount: 0,
        lostCount: 0,
        callCount: 0,
        followUpCount: 0,
        siteVisitCount: 0,
        completedFollowUps: 0,
      };
    }
    bySource[src].leads.push(lead);
    bySource[src].total++;
    bySource[src].statusBreakdown[lead.pipelineStatus] = (bySource[src].statusBreakdown[lead.pipelineStatus] || 0) + 1;
    const projName = lead.project?.name || "No Project";
    bySource[src].projectBreakdown[projName] = (bySource[src].projectBreakdown[projName] || 0) + 1;
    if (lead.leadStatus === "Booked") bySource[src].wonCount++;
    if (lead.pipelineStatus === "Lost") bySource[src].lostCount++;
    bySource[src].callCount += lead.callLogs.length;
    bySource[src].followUpCount += lead.followUps.length;
    bySource[src].completedFollowUps += lead.followUps.filter((f) => f.completed).length;
    bySource[src].siteVisitCount += lead.siteVisits.length;
  });

  // Chart data
  const sourceLeadCounts = Object.values(bySource)
    .sort((a, b) => b.total - a.total)
    .map((s) => ({ name: s.source, leads: s.total, booked: s.wonCount, lost: s.lostCount }));

  const sourceWinRate = Object.values(bySource)
    .filter((s) => s.total > 0)
    .map((s) => ({
      name: s.source,
      bookingRate: s.total > 0 ? Math.round((s.wonCount / s.total) * 100) : 0,
      total: s.total,
      booked: s.wonCount,
    }));

  return NextResponse.json({
    bySource: Object.values(bySource).sort((a, b) => b.total - a.total),
    sourceLeadCounts,
    sourceWinRate,
    totalLeads: leads.length,
    totalSources: Object.keys(bySource).length,
  });
}
