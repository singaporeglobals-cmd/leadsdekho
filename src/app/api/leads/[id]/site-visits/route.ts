import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/leads/[id]/site-visits
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const visits = await db.siteVisit.findMany({
    where: { leadId: id },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { scheduledAt: "desc" },
  });

  return NextResponse.json(visits);
}

// POST /api/leads/[id]/site-visits
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { scheduledAt, notes } = await req.json();

  if (!scheduledAt) {
    return NextResponse.json({ error: "Scheduled time is required" }, { status: 400 });
  }

  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const visit = await db.siteVisit.create({
    data: {
      leadId: id,
      userId: user.id,
      scheduledAt: new Date(scheduledAt),
      notes: notes || "",
    },
    include: { user: { select: { id: true, name: true } } },
  });

  await db.timelineEvent.create({
    data: {
      leadId: id,
      userId: user.id,
      eventType: "SiteVisitScheduled",
      description: `Site visit scheduled for ${new Date(scheduledAt).toLocaleString()}`,
    },
  });

  return NextResponse.json(visit, { status: 201 });
}

// PUT /api/leads/[id]/site-visits - Update visit status
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { visitId, status, feedback } = await req.json();

  const visit = await db.siteVisit.update({
    where: { id: visitId },
    data: {
      status,
      feedback: feedback || undefined,
    },
  });

  return NextResponse.json(visit);
}
