import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/properties
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // All authenticated users can read properties (needed for lead creation and assign)

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { location: { contains: search } },
    ];
  }

  const properties = await db.property.findMany({
    where,
    include: {
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Summary counts
  const statusCounts = await db.property.groupBy({
    by: ["status"],
    _count: true,
  });

  const summary: Record<string, number> = {};
  statusCounts.forEach((item) => {
    summary[item.status] = item._count;
  });

  return NextResponse.json({ properties, summary });
}

// POST /api/properties
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json();
  const { name, type, location, price, size, bedrooms, bathrooms, status, description, projectId } = body;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const property = await db.property.create({
    data: {
      name,
      type: type || "Apartment",
      location: location || null,
      price: price ? parseFloat(price) : null,
      size: size || null,
      bedrooms: bedrooms ? parseInt(bedrooms) : null,
      bathrooms: bathrooms ? parseInt(bathrooms) : null,
      status: status || "Available",
      description: description || null,
      projectId: projectId || null,
    },
    include: { project: { select: { id: true, name: true } } },
  });

  return NextResponse.json(property, { status: 201 });
}
