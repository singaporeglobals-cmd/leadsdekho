import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/reports/export?type=leads&from=2026-01-01&to=2026-06-30
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "leads";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};

  // Date range filter
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from + "T00:00:00.000Z") } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
    };
  }

  // Role-based filtering
  if (user.role === "sales" || user.role === "telecalling") {
    where.OR = [{ currentOwnerId: user.id }, { primaryOwnerId: user.id }];
  }

  let csvContent = "";

  if (type === "leads") {
    const leads = await db.lead.findMany({
      where,
      include: {
        primaryOwner: { select: { name: true } },
        currentOwner: { select: { name: true } },
        project: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    csvContent = "Name,Phone,Email,Source,Budget,Status,Primary Owner,Current Owner,Project,Created At\n";
    leads.forEach((lead) => {
      csvContent += `"${lead.name}","${lead.phone}","${lead.email || ""}","${lead.source}","${lead.budget || ""}","${lead.pipelineStatus}","${lead.primaryOwner.name}","${lead.currentOwner.name}","${lead.project?.name || ""}","${lead.createdAt.toISOString()}"\n`;
    });
  } else if (type === "callLogs") {
    const logs = await db.callLog.findMany({
      where: {
        ...(user.role === "sales" || user.role === "telecalling" ? { userId: user.id } : {}),
        ...(from || to ? {
          createdAt: {
            ...(from ? { gte: new Date(from + "T00:00:00.000Z") } : {}),
            ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
          },
        } : {}),
      },
      include: {
        lead: { select: { name: true, phone: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    csvContent = "Lead Name,Lead Phone,Call Type,Notes,Called By,Call Date\n";
    logs.forEach((log) => {
      csvContent += `"${log.lead.name}","${log.lead.phone}","${log.callType}","${log.notes.replace(/"/g, '""')}","${log.user.name}","${log.callDate.toISOString()}"\n`;
    });
  } else if (type === "leadsReport") {
    const source = searchParams.get("source");
    const project = searchParams.get("project");

    // Build where clause
    const leadsWhere: Record<string, unknown> = {};
    if (from || to) {
      leadsWhere.createdAt = {
        ...(from ? { gte: new Date(from + "T00:00:00.000Z") } : {}),
        ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
      };
    }
    if (source && source !== "all") leadsWhere.source = source;
    if (project && project !== "all") leadsWhere.projectId = project;

    // Admin only
    if (user.role !== "admin") {
      leadsWhere.OR = [{ currentOwnerId: user.id }, { primaryOwnerId: user.id }];
    }

    const leads = await db.lead.findMany({
      where: leadsWhere,
      include: {
        currentOwner: { select: { name: true } },
        project: { select: { name: true } },
        callLogs: {
          select: { notes: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Build CSV with feedback in one cell
    csvContent = "Date,Lead Source,Name,Number,Mail ID,Project Name,Assign Executive,Feedback\n";
    leads.forEach((lead) => {
      const date = lead.createdAt.toISOString().split("T")[0];
      const [y, m, d] = date.split("-");
      const formattedDate = `${d}.${m}.${y.slice(2)}`;

      // Concatenate all feedback notes with dates
      const feedbackParts = lead.callLogs.map((log) => {
        const logDate = log.createdAt.toISOString().split("T")[0];
        const [ly, lm, ld] = logDate.split("-");
        const shortDate = `${ld}.${lm}`;
        return `${log.notes.toUpperCase()}...${shortDate}`;
      });
      const feedback = feedbackParts.join(" ") || "-";

      csvContent += `"${formattedDate}","${lead.source}","${lead.name}","${lead.phone}","${lead.email || ""}","${lead.project?.name || ""}","${lead.currentOwner.name}","${feedback.replace(/"/g, '""')}"\n`;
    });
  } else if (type === "siteVisits") {
    const visits = await db.siteVisit.findMany({
      where: {
        ...(user.role === "sales" || user.role === "telecalling" ? { userId: user.id } : {}),
        ...(from || to ? {
          scheduledAt: {
            ...(from ? { gte: new Date(from + "T00:00:00.000Z") } : {}),
            ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
          },
        } : {}),
      },
      include: {
        lead: { select: { name: true, phone: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    csvContent = "Lead Name,Lead Phone,Status,Notes,Feedback,Scheduled By,Scheduled At\n";
    visits.forEach((v) => {
      csvContent += `"${v.lead.name}","${v.lead.phone}","${v.status}","${v.notes}","${v.feedback || ""}","${v.user.name}","${v.scheduledAt.toISOString()}"\n`;
    });
  }

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${type}-export.csv"`,
    },
  });
}
