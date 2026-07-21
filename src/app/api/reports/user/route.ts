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

  // Date filter for lead-creation metrics (fresh leads, total leads):
  // uses Lead.createdAt — i.e. when the lead entered the system.
  const createdFilter: Record<string, unknown> = {};
  if (from || to) {
    createdFilter.createdAt = {
      ...(from ? { gte: new Date(from + "T00:00:00.000Z") } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
    };
  }

  // Date filter for STATUS-based metrics (visit done, visit arranged, booked,
  // connected, not connected): uses Lead.updatedAt — i.e. when the status was
  // last changed. This is critical so that, e.g. a lead created in June whose
  // site visit happened in July shows up in July's "Visit Done" count, not
  // June's. (Status changes always bump updatedAt via Prisma @updatedAt.)
  const statusChangedFilter: Record<string, unknown> = {};
  if (from || to) {
    statusChangedFilter.updatedAt = {
      ...(from ? { gte: new Date(from + "T00:00:00.000Z") } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
    };
  }

  const userWhere = { currentOwnerId: userId, ...createdFilter };

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
  ] = await Promise.all([
    db.lead.count({ where: userWhere }),
    db.lead.count({
      where: {
        currentOwnerId: userId,
        followUps: { some: { completed: false } },
        ...createdFilter,
      },
    }),
    db.lead.count({
      where: {
        currentOwnerId: userId,
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    }),
    // Total fresh leads (newly created) assigned to user in the date range.
    // Uses createdAt — when the lead entered the system.
    db.lead.count({
      where: {
        currentOwnerId: userId,
        ...createdFilter,
      },
    }),
    // Connected: status was set to a "connected" state in this date range.
    // Uses updatedAt so leads created earlier but connected this month are
    // attributed to the month the connection actually happened.
    db.lead.count({
      where: {
        currentOwnerId: userId,
        leadStatus: { in: ["Site Visit Done", "Prospect", "Not Interested", "Site Visit Promised", "Booked"] },
        ...statusChangedFilter,
      },
    }),
    // Not Connected: status changed to "Not Connected" in this date range.
    db.lead.count({
      where: {
        currentOwnerId: userId,
        leadStatus: "Not Connected",
        ...statusChangedFilter,
      },
    }),
    // Site Visit Arranged: status changed to "Site Visit Promised" in this
    // date range (i.e. the visit was arranged this month, not when lead was
    // created).
    db.lead.count({
      where: {
        currentOwnerId: userId,
        leadStatus: "Site Visit Promised",
        ...statusChangedFilter,
      },
    }),
    // Visit Done: status changed to "Site Visit Done" in this date range.
    // i.e. the visit actually happened in this month, regardless of when
    // the lead was originally created.
    db.lead.count({
      where: {
        currentOwnerId: userId,
        leadStatus: "Site Visit Done",
        ...statusChangedFilter,
      },
    }),
    // Booked: status changed to "Booked" in this date range.
    db.lead.count({
      where: {
        currentOwnerId: userId,
        leadStatus: "Booked",
        ...statusChangedFilter,
      },
    }),
  ]);

  // Overall Call Report: group each CALL by the lead's current status.
  // Categories are MUTUALLY EXCLUSIVE and sum to totalCalls:
  //   1. lost            — pipelineStatus = 'Lost' (truly lost, NOT 'Not Connected')
  //   2. not_connected   — leadStatus = 'Not Connected' (and not lost)
  //   3. site_visit_promised — leadStatus = 'Site Visit Promised' (and not lost)
  //   4. connected       — everything else (Prospect / Site Visit Done / Not Interested / Booked / null)
  // This way: totalCalls = lost + notConnected + siteVisitPromised + connected
  const callReport = {
    total: 0,
    connected: 0,
    notConnected: 0,
    siteVisitPromised: 0,
    lostLead: 0,
  };
  if (from && to) {
    const callRows = (await db.$queryRaw`
      SELECT
        CASE
          WHEN l."pipelineStatus" = 'Lost' THEN 'lost'
          WHEN l."leadStatus" = 'Not Connected' THEN 'not_connected'
          WHEN l."leadStatus" = 'Site Visit Promised' THEN 'site_visit_promised'
          ELSE 'connected'
        END AS category,
        COUNT(*)::int AS count
      FROM "CallLog" c
      JOIN "Lead" l ON c."leadId" = l."id"
      WHERE c."userId" = ${userId}
        AND c."callDate" >= ${new Date(from + "T00:00:00.000Z")}
        AND c."callDate" <= ${new Date(to + "T23:59:59.999Z")}
      GROUP BY category
    `) as Array<{ category: string; count: number }>;
    for (const row of callRows) {
      if (row.category === "lost") callReport.lostLead = row.count;
      else if (row.category === "not_connected") callReport.notConnected = row.count;
      else if (row.category === "site_visit_promised") callReport.siteVisitPromised = row.count;
      else if (row.category === "connected") callReport.connected = row.count;
      callReport.total += row.count;
    }
  }

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
    callReport,
  });
}
