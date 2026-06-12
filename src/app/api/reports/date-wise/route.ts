import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/reports/date-wise?from=2026-01-01&to=2026-06-30
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const projectFilter = searchParams.get("project");
  const sourceFilter = searchParams.get("source");

  // Default: current month
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const startDate = from ? new Date(from + "T00:00:00.000Z") : defaultFrom;
  const endDate = to ? new Date(to + "T23:59:59.999Z") : defaultTo;

  const where: Record<string, unknown> = {
    createdAt: { gte: startDate, lte: endDate },
  };

  // Project filter
  if (projectFilter) {
    where.project = { id: projectFilter };
  }

  // Source filter
  if (sourceFilter) {
    where.source = sourceFilter;
  }

  // Role-based filtering
  if (user.role === "sales" || user.role === "telecalling") {
    where.OR = [{ currentOwnerId: user.id }, { primaryOwnerId: user.id }];
  }

  // Get leads
  const leads = await db.lead.findMany({
    where,
    include: {
      primaryOwner: { select: { name: true } },
      currentOwner: { select: { name: true } },
      project: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by date
  const byDate: Record<string, {
    date: string;
    leads: typeof leads;
    total: number;
    statusBreakdown: Record<string, number>;
    sourceBreakdown: Record<string, number>;
    projectBreakdown: Record<string, number>;
  }> = {};

  leads.forEach((lead) => {
    const dateKey = lead.createdAt.toISOString().split("T")[0];
    if (!byDate[dateKey]) {
      byDate[dateKey] = {
        date: dateKey,
        leads: [],
        total: 0,
        statusBreakdown: {},
        sourceBreakdown: {},
        projectBreakdown: {},
      };
    }
    byDate[dateKey].leads.push(lead);
    byDate[dateKey].total++;
    byDate[dateKey].statusBreakdown[lead.pipelineStatus] = (byDate[dateKey].statusBreakdown[lead.pipelineStatus] || 0) + 1;
    byDate[dateKey].sourceBreakdown[lead.source] = (byDate[dateKey].sourceBreakdown[lead.source] || 0) + 1;
    const projName = lead.project?.name || "No Project";
    byDate[dateKey].projectBreakdown[projName] = (byDate[dateKey].projectBreakdown[projName] || 0) + 1;
  });

  // Activity counts
  const callLogs = await db.callLog.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      ...(user.role === "sales" || user.role === "telecalling" ? { userId: user.id } : {}),
    },
    select: { createdAt: true },
  });

  const followUps = await db.followUp.findMany({
    where: {
      scheduledAt: { gte: startDate, lte: endDate },
      ...(user.role === "sales" || user.role === "telecalling" ? { userId: user.id } : {}),
    },
    select: { scheduledAt: true },
  });

  const siteVisits = await db.siteVisit.findMany({
    where: {
      scheduledAt: { gte: startDate, lte: endDate },
      ...(user.role === "sales" || user.role === "telecalling" ? { userId: user.id } : {}),
    },
    select: { scheduledAt: true },
  });

  // Activity grouped by date
  const activityByDate: Record<string, { calls: number; followUps: number; siteVisits: number }> = {};
  callLogs.forEach((c) => {
    const dk = c.createdAt.toISOString().split("T")[0];
    if (!activityByDate[dk]) activityByDate[dk] = { calls: 0, followUps: 0, siteVisits: 0 };
    activityByDate[dk].calls++;
  });
  followUps.forEach((f) => {
    const dk = f.scheduledAt.toISOString().split("T")[0];
    if (!activityByDate[dk]) activityByDate[dk] = { calls: 0, followUps: 0, siteVisits: 0 };
    activityByDate[dk].followUps++;
  });
  siteVisits.forEach((s) => {
    const dk = s.scheduledAt.toISOString().split("T")[0];
    if (!activityByDate[dk]) activityByDate[dk] = { calls: 0, followUps: 0, siteVisits: 0 };
    activityByDate[dk].siteVisits++;
  });

  // Summary
  const summary = {
    totalLeads: leads.length,
    newLeads: leads.filter((l) => l.pipelineStatus === "New").length,
    contacted: leads.filter((l) => l.pipelineStatus === "Contacted").length,
    qualified: leads.filter((l) => l.pipelineStatus === "Qualified").length,
    visited: leads.filter((l) => l.pipelineStatus === "Visited" || l.pipelineStatus === "Visit Scheduled").length,
    won: leads.filter((l) => l.pipelineStatus === "Won").length,
    lost: leads.filter((l) => l.pipelineStatus === "Lost").length,
    totalCalls: callLogs.length,
    totalFollowUps: followUps.length,
    totalSiteVisits: siteVisits.length,
  };

  // Chart data - daily trend
  const dailyTrend = Object.keys(byDate)
    .sort()
    .map((date) => ({
      date,
      leads: byDate[date].total,
      calls: activityByDate[date]?.calls || 0,
      followUps: activityByDate[date]?.followUps || 0,
      siteVisits: activityByDate[date]?.siteVisits || 0,
    }));

  return NextResponse.json({
    summary,
    byDate: Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date)),
    dailyTrend,
    activityByDate,
  });
}
