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

  // Parse assignee filter (multi-value, comma-separated)
  const assigneeParam = req.nextUrl.searchParams.get("assignee");
  const assigneeList = assigneeParam
    ? assigneeParam.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  let assigneeFilter: { currentOwnerId?: { in: string[] } } = {};
  if (assigneeList.length > 0) {
    assigneeFilter = { currentOwnerId: { in: assigneeList } };
  }

  const combinedFilter = { ...dateFilter, ...assigneeFilter };

  if (user.role === "admin" || user.role === "super_admin") {
    return await getAdminDashboard(combinedFilter, dateFilter);
  } else if (user.role === "telecalling") {
    return await getTelecallingDashboard(user.id, dateFilter);
  } else {
    return await getSalesDashboard(user.id, dateFilter);
  }
}

async function getAdminDashboard(combinedFilter: { createdAt?: { gte?: Date; lte?: Date }; currentOwnerId?: { in: string[] } }, dateFilter: { createdAt?: { gte?: Date; lte?: Date } }) {
  // Compute today's follow-up window once
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

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
      select: {
        id: true,
        name: true,
        phone: true,
        source: true,
        pipelineStatus: true,
        createdAt: true,
        currentOwner: { select: { name: true } },
        primaryOwner: { select: { name: true } },
      },
    }),
    // Slim teamMembers query - drop _count (was causing N+1-style joins); we'll compute counts separately only if needed
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
          },
        },
      },
    }),
    db.user.findMany({
      where: { isActive: true, role: { in: ["telecalling", "sales"] } },
      select: { id: true, name: true, role: true },
    }),
    // LOST leads are EXCLUDED from follow-up counts (they still appear in My Leads,
    // but should not surface as pending follow-up reminders).
    db.followUp.count({
      where: {
        lead: { pipelineStatus: { not: "Lost" } },
        scheduledAt: { gte: todayStart, lte: todayEnd },
        completed: false,
      },
    }),
    db.followUp.count({
      where: {
        lead: { pipelineStatus: { not: "Lost" } },
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
  // Use only currentOwnerId so reassigned leads disappear from the original creator's dashboard.
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
    // Count today's follow-ups on leads CURRENTLY owned by this user (regardless of who created the follow-up)
    // LOST leads are EXCLUDED from follow-up counts.
    db.followUp.count({
      where: {
        lead: { currentOwnerId: userId, pipelineStatus: { not: "Lost" } },
        scheduledAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
        completed: false,
      },
    }),
    db.followUp.count({
      where: {
        lead: { currentOwnerId: userId, pipelineStatus: { not: "Lost" } },
        completed: false,
      },
    }),
    db.followUp.findMany({
      where: {
        lead: { currentOwnerId: userId, pipelineStatus: { not: "Lost" } },
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
  // Use only currentOwnerId so reassigned leads disappear from the original creator's dashboard.
  const userWhere = { currentOwnerId: userId, ...dateFilter };

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
    // Count today's follow-ups on leads CURRENTLY owned by this user (regardless of who created the follow-up)
    // LOST leads are EXCLUDED from follow-up counts.
    db.followUp.count({
      where: {
        lead: { currentOwnerId: userId, pipelineStatus: { not: "Lost" } },
        scheduledAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
        completed: false,
      },
    }),
    db.followUp.count({
      where: {
        lead: { currentOwnerId: userId, pipelineStatus: { not: "Lost" } },
        completed: false,
      },
    }),
    db.followUp.findMany({
      where: {
        lead: { currentOwnerId: userId, pipelineStatus: { not: "Lost" } },
        completed: false,
      },
      include: { lead: { select: { id: true, name: true, phone: true } } },
      orderBy: { scheduledAt: "asc" },
      take: 10,
    }),
    db.lead.count({
      where: {
        currentOwnerId: userId,
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
