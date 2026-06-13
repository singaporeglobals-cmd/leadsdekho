import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// PUT /api/projects/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const { name, location, description } = await req.json();

  const project = await db.project.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(location !== undefined && { location: location || null }),
      ...(description !== undefined && { description: description || null }),
    },
  });

  return NextResponse.json(project);
}

// DELETE /api/projects/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;

  // Unlink leads from this project before deleting
  await db.lead.updateMany({
    where: { projectId: id },
    data: { projectId: null },
  });

  await db.project.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
