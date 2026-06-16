import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/lead-sources?all=true  (returns all including inactive, for management page)
// GET /api/lead-sources          (returns only active sources, for dropdowns)
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const showAll = searchParams.get("all") === "true";

  // Only admins can see all sources (including inactive)
  const isAdmin = user.role === "admin" || user.role === "super_admin";
  const includeInactive = showAll && isAdmin;

  const leadSources = await db.leadSource.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json(leadSources);
}

// POST /api/lead-sources
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "super_admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { name } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const trimmedName = name.trim();

  // Check for duplicate name
  const existing = await db.leadSource.findUnique({
    where: { name: trimmedName },
  });
  if (existing) {
    return NextResponse.json({ error: "A lead source with this name already exists" }, { status: 409 });
  }

  const leadSource = await db.leadSource.create({
    data: { name: trimmedName },
    select: {
      id: true,
      name: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json(leadSource, { status: 201 });
}
