import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/site-visits - Get all site visits + leads with leadStatus "Site Visit Done"
// Query params:
//   - userId: filter by assigned user (admin only)
//   - from: YYYY-MM-DD
//   - to: YYYY-MM-DD
//   - projectId: project id
//   - source: lead source name
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filterUserId = searchParams.get("userId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const projectId = searchParams.get("projectId");
  const source = searchParams.get("source");

  // Build date filter for site visit scheduledAt
  const dateFilter: { scheduledAt?: { gte?: Date; lte?: Date } } = {};
  if (from) {
    dateFilter.scheduledAt = dateFilter.scheduledAt || {};
    dateFilter.scheduledAt.gte = new Date(from + "T00:00:00.000Z");
  }
  if (to) {
    dateFilter.scheduledAt = dateFilter.scheduledAt || {};
    dateFilter.scheduledAt.lte = new Date(to + "T23:59:59.999Z");
  }

  // Get all actual site visit records
  const where: Record<string, unknown> = { ...dateFilter };
  // User filter for site visits
  if (filterUserId && filterUserId !== "all") {
    where.userId = filterUserId;
  } else if (user.role === "sales") {
    // Sales users can only see their own visits
    where.userId = user.id;
  } else if (user.role === "telecalling") {
    // Telecalling users have no direct site visits; show empty
    // (They might still want to see visits for leads they own - skip for simplicity)
  }

  // For site visits, we need to filter by lead's project/source if specified
  // We do this by adding a lead relation filter
  const leadFilter: Record<string, unknown> = {};
  if (projectId && projectId !== "all") {
    leadFilter.projectId = projectId;
  }
  if (source && source !== "all") {
    leadFilter.source = source;
  }
  if (Object.keys(leadFilter).length > 0) {
    where.lead = leadFilter;
  }

  const actualVisits = await db.siteVisit.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
      lead: {
        select: {
          id: true,
          name: true,
          phone: true,
          source: true,
          projectId: true,
          project: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { scheduledAt: "desc" },
  });

  // Get leads with leadStatus = "Site Visit Done"
  // (These are virtual entries - leads marked as "Site Visit Done" without an actual visit record)
  const svDoneWhere: Record<string, unknown> = { leadStatus: "Site Visit Done" };
  if (filterUserId && filterUserId !== "all") {
    svDoneWhere.currentOwnerId = filterUserId;
  } else if (user.role === "sales") {
    svDoneWhere.currentOwnerId = user.id;
  }
  // Apply project/source filters to virtual visits too
  if (projectId && projectId !== "all") {
    svDoneWhere.projectId = projectId;
  }
  if (source && source !== "all") {
    svDoneWhere.source = source;
  }
  // Apply date filter to virtual visits using lead.createdAt as fallback
  if (from || to) {
    svDoneWhere.createdAt = {};
    if (from) (svDoneWhere.createdAt as Record<string, unknown>).gte = new Date(from + "T00:00:00.000Z");
    if (to) (svDoneWhere.createdAt as Record<string, unknown>).lte = new Date(to + "T23:59:59.999Z");
  }

  const svDoneLeads = await db.lead.findMany({
    where: svDoneWhere,
    include: {
      currentOwner: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });

  // Get lead IDs that already have actual site visit records
  const leadsWithVisits = new Set(actualVisits.map((v) => v.leadId));

  // Add virtual entries for leads with "Site Visit Done" status but no actual visit record
  const virtualVisits = svDoneLeads
    .filter((lead) => !leadsWithVisits.has(lead.id))
    .map((lead) => ({
      id: `virtual-svd-${lead.id}`,
      leadId: lead.id,
      scheduledAt: lead.createdAt,
      notes: "Via Lead Status: Site Visit Done",
      status: "Completed",
      feedback: null,
      user: lead.currentOwner || { id: "", name: "Unknown" },
      lead: {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        source: lead.source,
        projectId: lead.projectId,
        project: lead.project ? { id: lead.project.id, name: lead.project.name } : null,
      },
      isViaLeadStatus: true,
    }));

  // Combine and sort
  const allVisits = [
    ...actualVisits.map((v) => ({
      id: v.id,
      leadId: v.leadId,
      scheduledAt: v.scheduledAt,
      notes: v.notes,
      status: v.status,
      feedback: v.feedback,
      user: v.user,
      lead: v.lead,
      isViaLeadStatus: false,
    })),
    ...virtualVisits,
  ].sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  return NextResponse.json({ visits: allVisits });
}
