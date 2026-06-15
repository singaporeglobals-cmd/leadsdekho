import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// PUT /api/lead-sources/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "super_admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { name, isActive } = body;

  // If name is being updated, check for duplicates
  if (name !== undefined) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    const existing = await db.leadSource.findUnique({
      where: { name: trimmedName },
    });
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "A lead source with this name already exists" }, { status: 409 });
    }
  }

  const data: { name?: string; isActive?: boolean } = {};
  if (name !== undefined) data.name = name.trim();
  if (isActive !== undefined) data.isActive = isActive;

  try {
    const leadSource = await db.leadSource.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    });
    return NextResponse.json(leadSource);
  } catch {
    return NextResponse.json({ error: "Lead source not found" }, { status: 404 });
  }
}

// DELETE /api/lead-sources/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "super_admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;

  try {
    await db.leadSource.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Lead source not found" }, { status: 404 });
  }
}
