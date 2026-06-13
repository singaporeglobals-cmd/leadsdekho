import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/reports/user?userId=XXX&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
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

  const [
    totalLeads,
    followUpLeads,
    freshLeadsToday,
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
        ...dateFilter,
      },
    }),
    db.lead.count({
      where: {
        currentOwnerId: userId,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
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
  ]);

  return NextResponse.json({
    totalLeads,
    followUpLeads,
    freshLeadsToday,
    connectedLeads,
    notConnectedLeads,
    siteVisitArranged,
    visitDone,
    bookingCount,
  });
}
