import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/leads/[id]/follow-ups
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const followUps = await db.followUp.findMany({
    where: { leadId: id },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { scheduledAt: "desc" },
  });

  return NextResponse.json(followUps);
}

// POST /api/leads/[id]/follow-ups
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { scheduledAt, notes } = await req.json();

  if (!scheduledAt || !notes) {
    return NextResponse.json({ error: "Scheduled time and notes are required" }, { status: 400 });
  }

  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  // Auto-complete any previously pending follow-ups for this lead so that
  // only the NEWLY scheduled follow-up shows up as the next upcoming one.
  // Otherwise editing feedback and setting a new date leaves the old (earlier)
  // follow-up still pending, and the lead list UI shows the OLD date.
  await db.followUp.updateMany({
    where: {
      leadId: id,
      completed: false,
    },
    data: {
      completed: true,
      completedAt: new Date(),
    },
  });

  const followUp = await db.followUp.create({
    data: {
      leadId: id,
      userId: user.id,
      scheduledAt: new Date(scheduledAt),
      notes,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  await db.timelineEvent.create({
    data: {
      leadId: id,
      userId: user.id,
      eventType: "FollowUpScheduled",
      description: `Follow-up scheduled for ${new Date(scheduledAt).toLocaleString()}`,
    },
  });

  return NextResponse.json(followUp, { status: 201 });
}

// PUT /api/leads/[id]/follow-ups - Mark as completed
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { followUpId, completed } = await req.json();

  const followUp = await db.followUp.update({
    where: { id: followUpId },
    data: {
      completed,
      completedAt: completed ? new Date() : null,
    },
  });

  return NextResponse.json(followUp);
}
