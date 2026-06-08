import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// POST /api/leads/[id]/assign - Assign lead to another user
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { toUserId, reason } = await req.json();

  if (!toUserId) {
    return NextResponse.json({ error: "Target user is required" }, { status: 400 });
  }

  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      primaryOwner: { select: { id: true, name: true, role: true } },
    },
  });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  // Only currentOwner, primaryOwner, or Admin can assign
  if (user.role !== "admin" && lead.currentOwnerId !== user.id && lead.primaryOwnerId !== user.id) {
    return NextResponse.json({ error: "Only current owner, primary owner or admin can assign leads" }, { status: 403 });
  }

  const targetUser = await db.user.findUnique({ where: { id: toUserId } });
  if (!targetUser || !targetUser.isActive) {
    return NextResponse.json({ error: "Target user not found or inactive" }, { status: 400 });
  }

  // Create assignment record
  await db.leadAssignment.create({
    data: {
      leadId: id,
      fromUserId: lead.currentOwnerId,
      toUserId,
      reason: reason || null,
    },
  });

  // Determine if primaryOwner should also be updated
  // If current primaryOwner is admin, update primaryOwner to new assignee
  const updateData: Record<string, string> = { currentOwnerId: toUserId };
  if (lead.primaryOwner.role === "admin") {
    updateData.primaryOwnerId = toUserId;
  }

  // Update lead
  const updated = await db.lead.update({
    where: { id },
    data: updateData,
    include: {
      primaryOwner: { select: { id: true, name: true, email: true, role: true } },
      currentOwner: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  // Timeline event
  await db.timelineEvent.create({
    data: {
      leadId: id,
      userId: user.id,
      eventType: "Assigned",
      description: `Lead reassigned from ${user.name} to ${targetUser.name}`,
    },
  });

  return NextResponse.json(updated);
}
