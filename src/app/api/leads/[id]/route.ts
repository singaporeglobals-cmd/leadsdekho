import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/leads/[id] - Get single lead
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      primaryOwner: { select: { id: true, name: true, email: true, role: true } },
      currentOwner: { select: { id: true, name: true, email: true, role: true } },
      project: { select: { id: true, name: true } },
      callLogs: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
      followUps: { include: { user: { select: { id: true, name: true } } }, orderBy: { scheduledAt: "desc" } },
      siteVisits: { include: { user: { select: { id: true, name: true } } }, orderBy: { scheduledAt: "desc" } },
      assignments: { include: { fromUser: { select: { name: true } }, toUser: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      leadProperties: {
        include: {
          property: {
            select: { id: true, name: true, type: true, status: true, price: true, location: true, size: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      timeline: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  // Check access
  if (user.role === "sales") {
    if (lead.currentOwnerId !== user.id && lead.primaryOwnerId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
  }

  // Enrich timeline with user names manually
  const timelineUserIds = lead.timeline.map((t: { userId: string | null }) => t.userId).filter(Boolean) as string[];
  const uniqueUserIds = [...new Set(timelineUserIds)];
  const timelineUsers = uniqueUserIds.length > 0
    ? await db.user.findMany({ where: { id: { in: uniqueUserIds } }, select: { id: true, name: true } })
    : [];
  const userMap = Object.fromEntries(timelineUsers.map((u: { id: string; name: string }) => [u.id, u.name]));

  const enrichedTimeline = lead.timeline.map((t: { userId: string | null; [key: string]: unknown }) => ({
    ...t,
    user: t.userId ? { name: userMap[t.userId] || "Unknown" } : null,
  }));

  return NextResponse.json({ ...lead, timeline: enrichedTimeline });
}

// PUT /api/leads/[id] - Update a lead
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  // Only currentOwner or Admin/Super Admin can edit
  if (user.role !== "admin" && user.role !== "super_admin" && lead.currentOwnerId !== user.id) {
    return NextResponse.json({ error: "You can only edit leads you currently own" }, { status: 403 });
  }

  const body = await req.json();
  const { name, phone, email, source, budget, notes, pipelineStatus, lostReason, projectId, leadStatus, subStage } = body;

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (phone !== undefined) updateData.phone = phone;
  if (email !== undefined) updateData.email = email || null;
  if (source !== undefined) updateData.source = source;
  if (budget !== undefined) updateData.budget = budget || null;
  if (notes !== undefined) updateData.notes = notes || null;
  if (projectId !== undefined) updateData.projectId = projectId || null;
  if (lostReason !== undefined) updateData.lostReason = lostReason || null;
  if (leadStatus !== undefined) updateData.leadStatus = leadStatus;
  // subStage: persist when explicitly provided. Pass null to clear.
  // Auto-clear when the new leadStatus doesn't support sub-stages.
  if (subStage !== undefined) {
    updateData.subStage = subStage || null;
  } else if (leadStatus !== undefined && leadStatus !== "Not Interested" && leadStatus !== "Not Connected") {
    // Lead status changed to something without sub-stages — clear any stale subStage
    updateData.subStage = null;
  }

  if (pipelineStatus !== undefined && pipelineStatus !== lead.pipelineStatus) {
    updateData.pipelineStatus = pipelineStatus;
    // Create timeline event for status change
    await db.timelineEvent.create({
      data: {
        leadId: id,
        userId: user.id,
        eventType: "StatusChanged",
        description: `Status changed from ${lead.pipelineStatus} to ${pipelineStatus}`,
      },
    });
  }

  const updated = await db.lead.update({
    where: { id },
    data: updateData,
    include: {
      primaryOwner: { select: { id: true, name: true, email: true, role: true } },
      currentOwner: { select: { id: true, name: true, email: true, role: true } },
      project: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/leads/[id] - Delete a lead (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role !== "admin" && user.role !== "super_admin") {
    return NextResponse.json({ error: "Only admin can delete leads" }, { status: 403 });
  }

  const { id } = await params;
  await db.lead.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
