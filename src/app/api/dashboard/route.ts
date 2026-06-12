import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/dashboard
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role === "admin") {
    return await getAdminDashboard();
  } else if (user.role === "telecalling") {
    return await getTelecallingDashboard(user.id);
  } else {
    return await getSalesDashboard(user.id);
  }
}

async function getAdminDashboard() {
  const [
    totalLeads,
    leadsByStatus,
    leadsBySource,
    recentLeads,
    teamMembers,
    todayFollowUps,
    pendingFollowUps,
    totalProjects,
  ] = await Promise.all([
    db.lead.count(),
    db.lead.groupBy({ by: ["pipelineStatus"], _count: true }),
    db.lead.groupBy({ by: ["source"], _count: true }),
    db.lead.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        currentOwner: { select: { name: true } },
        primaryOwner: { select: { name: true } },
      },
    }),
    db.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        _count: {
          select: {
            currentLeads: true,
            primaryLeads: true,
            callLogs: true,
          },
        },
      },
    }),
    db.followUp.count({
      where: {
        scheduledAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
        completed: false,
      },
    }),
    db.followUp.count({
      where: {
        completed: false,
      },
    }),
    db.project.count(),
  ]);

  const statusCounts: Record<string, number> = {};
  leadsByStatus.forEach((item) => {
    statusCounts[item.pipelineStatus] = item._count;
  });

  const sourceCounts: Record<string, number> = {};
  leadsBySource.forEach((item) => {
    sourceCounts[item.source] = item._count;
  });

  return NextResponse.json({
    role: "admin",
    totalLeads,
    statusCounts,
    sourceCounts,
    recentLeads,
    teamMembers,
    todayFollowUps,
    pendingFollowUps,
    totalProjects,
  });
}

async function getTelecallingDashboard(userId: string) {
  const [
    myLeadsCount,
    myLeadsByStatus,
    todayFollowUps,
    pendingFollowUps,
    pendingFollowUpsList,
    myCallLogsCount,
    allLeads,
    recentCallLogs,
  ] = await Promise.all([
    db.lead.count({ where: { currentOwnerId: userId } }),
    db.lead.groupBy({
      by: ["pipelineStatus"],
      where: { currentOwnerId: userId },
      _count: true,
    }),
    db.followUp.count({
      where: {
        userId,
        scheduledAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
        completed: false,
      },
    }),
    db.followUp.count({
      where: {
        userId,
        completed: false,
      },
    }),
    db.followUp.findMany({
      where: {
        userId,
        completed: false,
      },
      include: { lead: { select: { id: true, name: true, phone: true } } },
      orderBy: { scheduledAt: "asc" },
      take: 10,
    }),
    db.callLog.count({ where: { userId } }),
    db.lead.count(),
    db.callLog.findMany({
      where: { userId },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { lead: { select: { id: true, name: true } } },
    }),
  ]);

  const statusCounts: Record<string, number> = {};
  myLeadsByStatus.forEach((item) => {
    statusCounts[item.pipelineStatus] = item._count;
  });

  return NextResponse.json({
    role: "telecalling",
    myLeadsCount,
    allLeadsCount: allLeads,
    statusCounts,
    todayFollowUps,
    pendingFollowUps,
    pendingFollowUpsList,
    myCallLogsCount,
    recentCallLogs,
  });
}

async function getSalesDashboard(userId: string) {
  const [
    myLeadsCount,
    myLeadsByStatus,
    visitsScheduled,
    dealsInNegotiation,
    wonDeals,
    recentLeads,
    todayFollowUps,
    pendingFollowUps,
    pendingFollowUpsList,
  ] = await Promise.all([
    db.lead.count({
      where: { OR: [{ currentOwnerId: userId }, { primaryOwnerId: userId }] },
    }),
    db.lead.groupBy({
      by: ["pipelineStatus"],
      where: { OR: [{ currentOwnerId: userId }, { primaryOwnerId: userId }] },
      _count: true,
    }),
    db.siteVisit.count({
      where: {
        userId,
        status: "Scheduled",
        scheduledAt: { gte: new Date() },
      },
    }),
    db.lead.count({
      where: {
        currentOwnerId: userId,
        pipelineStatus: "Negotiation",
      },
    }),
    db.lead.count({
      where: {
        OR: [{ currentOwnerId: userId }, { primaryOwnerId: userId }],
        pipelineStatus: "Won",
      },
    }),
    db.lead.findMany({
      where: { OR: [{ currentOwnerId: userId }, { primaryOwnerId: userId }] },
      take: 10,
      orderBy: { updatedAt: "desc" },
      include: {
        currentOwner: { select: { name: true } },
        primaryOwner: { select: { name: true } },
      },
    }),
    db.followUp.count({
      where: {
        userId,
        scheduledAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
        completed: false,
      },
    }),
    db.followUp.count({
      where: {
        userId,
        completed: false,
      },
    }),
    db.followUp.findMany({
      where: {
        userId,
        completed: false,
      },
      include: { lead: { select: { id: true, name: true, phone: true } } },
      orderBy: { scheduledAt: "asc" },
      take: 10,
    }),
  ]);

  const statusCounts: Record<string, number> = {};
  myLeadsByStatus.forEach((item) => {
    statusCounts[item.pipelineStatus] = item._count;
  });

  return NextResponse.json({
    role: "sales",
    myLeadsCount,
    statusCounts,
    visitsScheduled,
    dealsInNegotiation,
    wonDeals,
    recentLeads,
    todayFollowUps,
    pendingFollowUps,
    pendingFollowUpsList,
  });
}
