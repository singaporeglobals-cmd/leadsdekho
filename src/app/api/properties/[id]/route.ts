import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/properties/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const property = await db.property.findUnique({
    where: { id },
    include: { project: { select: { id: true, name: true } } },
  });

  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(property);
}

// PUT /api/properties/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.type !== undefined) updateData.type = body.type;
  if (body.location !== undefined) updateData.location = body.location || null;
  if (body.price !== undefined) updateData.price = body.price ? parseFloat(body.price) : null;
  if (body.size !== undefined) updateData.size = body.size || null;
  if (body.bedrooms !== undefined) updateData.bedrooms = body.bedrooms ? parseInt(body.bedrooms) : null;
  if (body.bathrooms !== undefined) updateData.bathrooms = body.bathrooms ? parseInt(body.bathrooms) : null;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.description !== undefined) updateData.description = body.description || null;
  if (body.projectId !== undefined) updateData.projectId = body.projectId || null;

  const updated = await db.property.update({
    where: { id },
    data: updateData,
    include: { project: { select: { id: true, name: true } } },
  });

  return NextResponse.json(updated);
}

// DELETE /api/properties/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  await db.property.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
