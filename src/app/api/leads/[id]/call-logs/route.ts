import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/leads/[id]/call-logs
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const callLogs = await db.callLog.findMany({
    where: { leadId: id },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(callLogs);
}

// POST /api/leads/[id]/call-logs
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { notes, callType, callDate, assignTo } = await req.json();

  if (!notes) {
    return NextResponse.json({ error: "Notes are required" }, { status: 400 });
  }

  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  // Only currentOwner or Admin can log calls
  if (user.role !== "admin" && lead.currentOwnerId !== user.id) {
    return NextResponse.json({ error: "Only current owner or admin can log calls" }, { status: 403 });
  }

  const callLog = await db.callLog.create({
    data: {
      leadId: id,
      userId: user.id,
      notes,
      callType: callType || "Feedback",
      callDate: callDate ? new Date(callDate) : new Date(),
    },
    include: { user: { select: { id: true, name: true } } },
  });

  // Timeline event
  await db.timelineEvent.create({
    data: {
      leadId: id,
      userId: user.id,
      eventType: "FeedbackAdded",
      description: `Feedback logged: ${notes.substring(0, 100)}`,
    },
  });

  // Quick assign if specified
  if (assignTo) {
    const targetUser = await db.user.findUnique({ where: { id: assignTo } });
    if (targetUser && targetUser.isActive) {
      await db.leadAssignment.create({
        data: {
          leadId: id,
          fromUserId: lead.currentOwnerId,
          toUserId: assignTo,
          reason: "Quick assign from feedback",
        },
      });
      await db.lead.update({
        where: { id },
        data: { currentOwnerId: assignTo },
      });
      await db.timelineEvent.create({
        data: {
          leadId: id,
          userId: user.id,
          eventType: "Assigned",
          description: `Lead reassigned to ${targetUser.name} via quick assign`,
        },
      });
    }
  }

  return NextResponse.json(callLog, { status: 201 });
}
