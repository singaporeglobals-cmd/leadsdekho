import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/reports/project-wise?from=2026-01-01&to=2026-06-30
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const startDate = from ? new Date(from + "T00:00:00.000Z") : defaultFrom;
  const endDate = to ? new Date(to + "T23:59:59.999Z") : defaultTo;

  const where: Record<string, unknown> = {
    createdAt: { gte: startDate, lte: endDate },
  };

  if (user.role === "sales" || user.role === "telecalling") {
    where.OR = [{ currentOwnerId: user.id }, { primaryOwnerId: user.id }];
  }

  // Get all leads in range with project info
  const leads = await db.lead.findMany({
    where,
    include: {
      primaryOwner: { select: { name: true } },
      currentOwner: { select: { name: true } },
      project: { select: { name: true, location: true } },
      callLogs: { select: { id: true } },
      followUps: { select: { id: true, completed: true } },
      siteVisits: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by project
  const byProject: Record<string, {
    projectName: string;
    projectLocation: string;
    leads: typeof leads;
    total: number;
    statusBreakdown: Record<string, number>;
    sourceBreakdown: Record<string, number>;
    wonCount: number;
    lostCount: number;
    callCount: number;
    followUpCount: number;
    siteVisitCount: number;
    completedFollowUps: number;
  }> = {};

  leads.forEach((lead) => {
    const projName = lead.project?.name || "No Project";
    const projLoc = lead.project?.location || "";
    if (!byProject[projName]) {
      byProject[projName] = {
        projectName: projName,
        projectLocation: projLoc,
        leads: [],
        total: 0,
        statusBreakdown: {},
        sourceBreakdown: {},
        wonCount: 0,
        lostCount: 0,
        callCount: 0,
        followUpCount: 0,
        siteVisitCount: 0,
        completedFollowUps: 0,
      };
    }
    byProject[projName].leads.push(lead);
    byProject[projName].total++;
    byProject[projName].statusBreakdown[lead.pipelineStatus] = (byProject[projName].statusBreakdown[lead.pipelineStatus] || 0) + 1;
    byProject[projName].sourceBreakdown[lead.source] = (byProject[projName].sourceBreakdown[lead.source] || 0) + 1;
    if (lead.pipelineStatus === "Won") byProject[projName].wonCount++;
    if (lead.pipelineStatus === "Lost") byProject[projName].lostCount++;
    byProject[projName].callCount += lead.callLogs.length;
    byProject[projName].followUpCount += lead.followUps.length;
    byProject[projName].completedFollowUps += lead.followUps.filter((f) => f.completed).length;
    byProject[projName].siteVisitCount += lead.siteVisits.length;
  });

  // Chart data
  const projectLeadCounts = Object.values(byProject)
    .sort((a, b) => b.total - a.total)
    .map((p) => ({ name: p.projectName, leads: p.total, won: p.wonCount, lost: p.lostCount }));

  const projectWinRate = Object.values(byProject)
    .filter((p) => p.total > 0)
    .map((p) => ({
      name: p.projectName,
      winRate: p.total > 0 ? Math.round((p.wonCount / p.total) * 100) : 0,
      total: p.total,
      won: p.wonCount,
    }));

  // Source distribution per project (for stacked chart)
  const allSources = [...new Set(leads.map((l) => l.source || "Unknown"))];
  const projectSourceMatrix = Object.values(byProject).map((p) => {
    const row: Record<string, string | number> = { name: p.projectName };
    allSources.forEach((src) => {
      row[src] = p.sourceBreakdown[src] || 0;
    });
    return row;
  });

  return NextResponse.json({
    byProject: Object.values(byProject).sort((a, b) => b.total - a.total),
    projectLeadCounts,
    projectWinRate,
    projectSourceMatrix,
    allSources,
    totalLeads: leads.length,
    totalProjects: Object.keys(byProject).length,
  });
}
