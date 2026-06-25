import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/reports/user?userId=XXX&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.nextUrl.searchParams.get("userId");
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const dateFilter: Record<string, unknown> = {};
  if (from || to) {
    dateFilter.createdAt = {
      ...(from ? { gte: new Date(from + "T00:00:00.000Z") } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
    };
  }

  const userWhere = { currentOwnerId: userId, ...dateFilter };

  // Compute today's window once
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [
    totalLeads,
    followUpLeads,
    freshLeadsToday,
    totalFreshLeadsInRange,
    connectedLeads,
    notConnectedLeads,
    siteVisitArranged,
    visitDone,
    bookingCount,
    totalCalls,
    lostLeads,
  ] = await Promise.all([
    db.lead.count({ where: userWhere }),
    db.lead.count({
      where: {
        currentOwnerId: userId,
        followUps: { some: { completed: false } },
        ...dateFilter,
      },
    }),
    db.lead.count({
      where: {
        currentOwnerId: userId,
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    }),
    // Total fresh leads (newly created) assigned to user in the date range
    db.lead.count({
      where: {
        currentOwnerId: userId,
        ...dateFilter,
      },
    }),
    db.lead.count({
      where: {
        currentOwnerId: userId,
        leadStatus: { in: ["Site Visit Done", "Prospect", "Not Interested", "Site Visit Promised", "Booked"] },
        ...dateFilter,
      },
    }),
    db.lead.count({
      where: {
        currentOwnerId: userId,
        leadStatus: "Not Connected",
        ...dateFilter,
      },
    }),
    db.lead.count({
      where: {
        currentOwnerId: userId,
        leadStatus: "Site Visit Promised",
        ...dateFilter,
      },
    }),
    db.lead.count({
      where: {
        currentOwnerId: userId,
        leadStatus: "Site Visit Done",
        ...dateFilter,
      },
    }),
    db.lead.count({
      where: {
        currentOwnerId: userId,
        leadStatus: "Booked",
        ...dateFilter,
      },
    }),
    // Overall Call Report: total calls made by this user in the date range
    db.callLog.count({
      where: {
        userId,
        callDate: {
          ...(from ? { gte: new Date(from + "T00:00:00.000Z") } : {}),
          ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
        },
      },
    }),
    // Lost leads (pipelineStatus = "Lost") — only truly lost, not "Not Connected"
    db.lead.count({
      where: {
        currentOwnerId: userId,
        pipelineStatus: "Lost",
        ...dateFilter,
      },
    }),
  ]);

  // Per-day fresh lead breakdown using raw SQL (Prisma doesn't support DATE() grouping directly)
  // We count leads grouped by the calendar date they were created (their "fresh" date).
  let freshLeadsByDate: Array<{ date: string; count: number }> = [];
  if (from && to) {
    const rows = (await db.$queryRaw`
      SELECT
        TO_CHAR(DATE("createdAt"), 'YYYY-MM-DD') AS date,
        COUNT(*)::int AS count
      FROM "Lead"
      WHERE "currentOwnerId" = ${userId}
        AND "createdAt" >= ${new Date(from + "T00:00:00.000Z")}
        AND "createdAt" <= ${new Date(to + "T23:59:59.999Z")}
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
    `) as Array<{ date: string; count: number }>;
    freshLeadsByDate = rows;
  }

  return NextResponse.json({
    totalLeads,
    followUpLeads,
    freshLeadsToday,
    totalFreshLeadsInRange,
    freshLeadsByDate,
    connectedLeads,
    notConnectedLeads,
    siteVisitArranged,
    visitDone,
    bookingCount,
    totalCalls,
    lostLeads,
  });
}
