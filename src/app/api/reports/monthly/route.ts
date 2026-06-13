import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/reports/monthly
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // format: 2026-06
  const now = new Date();
  const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [year, mon] = targetMonth.split("-").map(Number);
  const startOfMonth = new Date(year, mon - 1, 1);
  const endOfMonth = new Date(year, mon, 0, 23, 59, 59, 999);

  const where: Record<string, unknown> = {
    createdAt: { gte: startOfMonth, lte: endOfMonth },
  };

  if (user.role === "sales") {
    where.OR = [{ currentOwnerId: user.id }, { primaryOwnerId: user.id }];
  }

  const [leadsCreated, leadsByStatus, leadsBySource, callLogsCount, wonLeads, lostLeads] = await Promise.all([
    db.lead.count({ where }),
    db.lead.groupBy({ by: ["pipelineStatus"], where, _count: true }),
    db.lead.groupBy({ by: ["source"], where, _count: true }),
    db.callLog.count({
      where: {
        createdAt: { gte: startOfMonth, lte: endOfMonth },
        ...(user.role === "sales" ? { userId: user.id } : {}),
      },
    }),
    db.lead.count({
      where: {
        ...where,
        leadStatus: "Booked",
      },
    }),
    db.lead.count({
      where: {
        ...where,
        pipelineStatus: "Lost",
      },
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
    month: targetMonth,
    leadsCreated,
    statusCounts,
    sourceCounts,
    callLogsCount,
    bookedLeads,
    lostLeads,
  });
}
