import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import bcrypt from "bcryptjs";

// PUT /api/users/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "super_admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const { name, email, role, isActive, password } = await req.json();

  // Only super_admin can modify admin/super_admin users
  if (role === "super_admin" && user.role !== "super_admin") {
    return NextResponse.json({ error: "Only Super Admin can modify Super Admin accounts" }, { status: 403 });
  }

  const targetUser = await db.user.findUnique({ where: { id } });
  if (targetUser?.role === "super_admin" && user.role !== "super_admin") {
    return NextResponse.json({ error: "Only Super Admin can modify Super Admin accounts" }, { status: 403 });
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (role !== undefined) updateData.role = role;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (password) updateData.password = await bcrypt.hash(password, 10);

  const updated = await db.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/users/[id] - Deactivate user
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "super_admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;

  // Don't allow deactivating super_admin unless you're super_admin
  const targetUser = await db.user.findUnique({ where: { id } });
  if (targetUser?.role === "super_admin" && user.role !== "super_admin") {
    return NextResponse.json({ error: "Cannot deactivate Super Admin" }, { status: 403 });
  }

  const updated = await db.user.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true, deactivated: updated.id });
}
