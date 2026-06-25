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
  const { notes, callType, callDate, assignTo, leadStatus, subStage } = await req.json();

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
      subStage: subStage || null,
      callDate: callDate ? new Date(callDate) : new Date(),
    },
    include: { user: { select: { id: true, name: true } } },
  });

  // If leadStatus / subStage provided, update the lead too (so the new status
  // sticks on the lead, not just on this call log entry)
  if (leadStatus || subStage !== undefined) {
    const leadUpdate: Record<string, unknown> = {};
    if (leadStatus) leadUpdate.leadStatus = leadStatus;
    if (subStage !== undefined) leadUpdate.subStage = subStage || null;
    // Auto-clear subStage if leadStatus changed to a non-sub-stage value
    if (leadStatus && leadStatus !== "Not Interested" && leadStatus !== "Not Connected") {
      leadUpdate.subStage = null;
    }
    await db.lead.update({ where: { id }, data: leadUpdate });
  }

  // Auto-update pipeline status from "New" to "Contacted" when feedback is given
  if (lead.pipelineStatus === "New") {
    await db.lead.update({
      where: { id },
      data: { pipelineStatus: "Contacted" },
    });
    await db.timelineEvent.create({
      data: {
        leadId: id,
        userId: user.id,
        eventType: "StatusChanged",
        description: `Status auto-changed from New to Contacted (feedback given)`,
      },
    });
  }

  // Timeline event
  await db.timelineEvent.create({
    data: {
      leadId: id,
      userId: user.id,
      eventType: "FeedbackAdded",
      description: `Feedback logged: ${notes.substring(0, 100)}`,
    },
  });

  // Auto-complete pending follow-ups for this lead that are due today or earlier
  // This makes leads disappear from "Today's Follow-ups" filter once feedback is given
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const pendingFollowUps = await db.followUp.findMany({
    where: {
      leadId: id,
      completed: false,
      scheduledAt: { lte: today },
    },
  });
  if (pendingFollowUps.length > 0) {
    await db.followUp.updateMany({
      where: { id: { in: pendingFollowUps.map(f => f.id) } },
      data: { completed: true, completedAt: new Date() },
    });
    await db.timelineEvent.create({
      data: {
        leadId: id,
        userId: user.id,
        eventType: "FollowUpCompleted",
        description: `${pendingFollowUps.length} pending follow-up(s) auto-completed via feedback`,
      },
    });
  }

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
