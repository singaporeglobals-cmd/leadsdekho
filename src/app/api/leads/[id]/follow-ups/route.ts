import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { parseISTDateTimeLocal } from "@/lib/timezone";

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

  // Auto-complete only follow-ups that are already DUE (past/now) so that
  // scheduling a new follow-up does NOT silently delete an existing FUTURE
  // follow-up scheduled for a different date. Previously this completed ALL
  // pending follow-ups, which made a lead vanish from a future date's
  // "Follow Up" filter as soon as any new follow-up was added.
  await db.followUp.updateMany({
    where: {
      leadId: id,
      completed: false,
      scheduledAt: { lte: new Date() },
    },
    data: {
      completed: true,
      completedAt: new Date(),
    },
  });

  // scheduledAt comes from a <input type="datetime-local"> which has NO tz
  // offset. All users are in IST, so parse it as IST (+05:30) to get the
  // correct absolute UTC moment regardless of the server's TZ (Vercel = UTC).
  const followUp = await db.followUp.create({
    data: {
      leadId: id,
      userId: user.id,
      scheduledAt: parseISTDateTimeLocal(scheduledAt),
      notes,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  await db.timelineEvent.create({
    data: {
      leadId: id,
      userId: user.id,
      eventType: "FollowUpScheduled",
      description: `Follow-up scheduled for ${parseISTDateTimeLocal(scheduledAt).toLocaleString()}`,
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
