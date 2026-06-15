import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/site-visits - Get all site visits + leads with leadStatus "Site Visit Done"
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all actual site visit records
  const where: Record<string, unknown> = {};
  if (user.role === "sales") {
    where.userId = user.id;
  }

  const actualVisits = await db.siteVisit.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
      lead: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { scheduledAt: "desc" },
  });

  // Get leads with leadStatus = "Site Visit Done"
  const svDoneWhere: Record<string, unknown> = { leadStatus: "Site Visit Done" };
  if (user.role === "sales") {
    svDoneWhere.OR = [
      { currentOwnerId: user.id },
      { primaryOwnerId: user.id },
    ];
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
      lead: { id: lead.id, name: lead.name, phone: lead.phone },
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
