import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/dashboard
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Parse month filter
  const monthParam = req.nextUrl.searchParams.get("month");
  let dateFilter: { createdAt?: { gte?: Date; lte?: Date } } = {};
  if (monthParam && monthParam !== "all") {
    const [year, month] = monthParam.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    dateFilter = { createdAt: { gte: startDate, lte: endDate } };
  }

  // Parse assignee filter
  const assigneeParam = req.nextUrl.searchParams.get("assignee");
  let assigneeFilter: { currentOwnerId?: string } = {};
  if (assigneeParam && assigneeParam !== "all") {
    assigneeFilter = { currentOwnerId: assigneeParam };
  }

  const combinedFilter = { ...dateFilter, ...assigneeFilter };

  if (user.role === "admin") {
    return await getAdminDashboard(combinedFilter, dateFilter);
  } else if (user.role === "telecalling") {
    return await getTelecallingDashboard(user.id, dateFilter);
  } else {
    return await getSalesDashboard(user.id, dateFilter);
  }
}

async function getAdminDashboard(combinedFilter: { createdAt?: { gte?: Date; lte?: Date }; currentOwnerId?: string }, dateFilter: { createdAt?: { gte?: Date; lte?: Date } }) {
  const [
    totalLeads,
    leadsByStatus,
    leadsBySource,
    leadsByOwner,
    recentLeads,
    teamMembers,
    ownerUsers,
    todayFollowUps,
    pendingFollowUps,
    totalProjects,
    bookedCount,
  ] = await Promise.all([
    db.lead.count({ where: combinedFilter }),
    db.lead.groupBy({ by: ["pipelineStatus"], where: combinedFilter, _count: true }),
    db.lead.groupBy({ by: ["source"], where: combinedFilter, _count: true }),
    db.lead.groupBy({ by: ["currentOwnerId"], where: dateFilter, _count: true }),
    db.lead.findMany({
      where: combinedFilter,
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
    db.user.findMany({
      where: { isActive: true, role: { in: ["telecalling", "sales"] } },
      select: { id: true, name: true, role: true },
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
    db.lead.count({
      where: { leadStatus: "Booked", ...combinedFilter },
    }),
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
    leadsByOwner,
    recentLeads,
    teamMembers,
    ownerUsers,
    todayFollowUps,
    pendingFollowUps,
    totalProjects,
    bookedCount,
  });
}

async function getTelecallingDashboard(userId: string, dateFilter: { createdAt?: { gte?: Date; lte?: Date } }) {
  const userWhere = { currentOwnerId: userId, ...dateFilter };

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
    db.lead.count({ where: userWhere }),
    db.lead.groupBy({
      by: ["pipelineStatus"],
      where: userWhere,
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
    db.lead.count({ where: dateFilter }),
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

async function getSalesDashboard(userId: string, dateFilter: { createdAt?: { gte?: Date; lte?: Date } }) {
  const userWhere = { OR: [{ currentOwnerId: userId }, { primaryOwnerId: userId }], ...dateFilter };

  const [
    myLeadsCount,
    myLeadsByStatus,
    visitsScheduled,
    dealsInNegotiation,
    recentLeads,
    todayFollowUps,
    pendingFollowUps,
    pendingFollowUpsList,
    bookedCount,
  ] = await Promise.all([
    db.lead.count({
      where: userWhere,
    }),
    db.lead.groupBy({
      by: ["pipelineStatus"],
      where: userWhere,
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
        ...dateFilter,
      },
    }),
    db.lead.findMany({
      where: userWhere,
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
    db.lead.count({
      where: {
        OR: [{ currentOwnerId: userId }, { primaryOwnerId: userId }],
        leadStatus: "Booked",
        ...dateFilter,
      },
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
    bookedCount,
    recentLeads,
    todayFollowUps,
    pendingFollowUps,
    pendingFollowUpsList,
  });
}
