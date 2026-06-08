import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/reports/daily
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const startOfDay = new Date(date + "T00:00:00.000Z");
  const endOfDay = new Date(date + "T23:59:59.999Z");

  const where: Record<string, unknown> = {
    createdAt: { gte: startOfDay, lte: endOfDay },
  };

  // Role-based filtering
  if (user.role === "sales") {
    where.OR = [{ currentOwnerId: user.id }, { primaryOwnerId: user.id }];
  }

  const [leadsCreated, leadsByStatus, callLogs, followUps, siteVisits, assignments] = await Promise.all([
    db.lead.count({ where }),
    db.lead.groupBy({ by: ["pipelineStatus"], where, _count: true }),
    db.callLog.count({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
        ...(user.role === "sales" ? { userId: user.id } : {}),
      },
    }),
    db.followUp.count({
      where: {
        scheduledAt: { gte: startOfDay, lte: endOfDay },
        ...(user.role === "sales" ? { userId: user.id } : {}),
      },
    }),
    db.siteVisit.count({
      where: {
        scheduledAt: { gte: startOfDay, lte: endOfDay },
        ...(user.role === "sales" ? { userId: user.id } : {}),
      },
    }),
    db.leadAssignment.count({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
    }),
  ]);

  const statusCounts: Record<string, number> = {};
  leadsByStatus.forEach((item) => {
    statusCounts[item.pipelineStatus] = item._count;
  });

  return NextResponse.json({
    date,
    leadsCreated,
    statusCounts,
    callLogs,
    followUps,
    siteVisits,
    assignments,
  });
}
