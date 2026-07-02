import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * DELETE /api/portal-leads/[id] — ADMIN only.
 * Marks a pending portal lead as "discarded" (soft delete, kept for audit).
 * Alternatively, if ?hard=true is passed, permanently deletes the row.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "super_admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const hardDelete = searchParams.get("hard") === "true";

  const existing = await db.portalLead.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Portal lead not found" }, { status: 404 });
  }

  if (hardDelete) {
    await db.portalLead.delete({ where: { id } });
  } else {
    await db.portalLead.update({
      where: { id },
      data: { status: "discarded" },
    });
  }

  return NextResponse.json({ success: true });
}

/**
 * PATCH /api/portal-leads/[id] — ADMIN only.
 * Update a pending portal lead's fields (name, phone, email, source, budget,
 * notes, projectName, assignedTo, projectId) before confirming.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "super_admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = String(body.name).trim();
  if (body.phone !== undefined) updateData.phone = String(body.phone).trim();
  if (body.email !== undefined) updateData.email = body.email ? String(body.email).trim() : null;
  if (body.source !== undefined) updateData.source = String(body.source).trim() || "Portal";
  if (body.budget !== undefined) updateData.budget = body.budget ? String(body.budget).trim() : null;
  if (body.notes !== undefined) updateData.notes = body.notes ? String(body.notes).trim() : null;
  if (body.projectName !== undefined) updateData.projectName = body.projectName ? String(body.projectName).trim() : null;
  if (body.assignedTo !== undefined) updateData.assignedTo = body.assignedTo || null;
  if (body.projectId !== undefined) updateData.projectId = body.projectId || null;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await db.portalLead.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}
