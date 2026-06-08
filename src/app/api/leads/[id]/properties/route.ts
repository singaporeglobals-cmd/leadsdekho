import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/leads/[id]/properties - Get all properties linked to a lead
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const leadProperties = await db.leadProperty.findMany({
    where: { leadId: id },
    include: {
      property: {
        select: { id: true, name: true, type: true, status: true, price: true, location: true, size: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(leadProperties);
}

// POST /api/leads/[id]/properties - Link a property to a lead
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { propertyId } = await req.json();

  if (!propertyId) {
    return NextResponse.json({ error: "Property ID is required" }, { status: 400 });
  }

  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  // Check if already linked
  const existing = await db.leadProperty.findUnique({
    where: { leadId_propertyId: { leadId: id, propertyId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Property already linked to this lead" }, { status: 409 });
  }

  const property = await db.property.findUnique({ where: { id: propertyId } });
  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const leadProperty = await db.leadProperty.create({
    data: { leadId: id, propertyId },
    include: {
      property: {
        select: { id: true, name: true, type: true, status: true, price: true, location: true, size: true },
      },
    },
  });

  // Timeline event
  await db.timelineEvent.create({
    data: {
      leadId: id,
      userId: user.id,
      eventType: "PropertyLinked",
      description: `Property "${property.name}" linked to lead`,
    },
  });

  return NextResponse.json(leadProperty, { status: 201 });
}

// DELETE /api/leads/[id]/properties - Unlink a property from a lead
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { propertyId } = await req.json();

  if (!propertyId) {
    return NextResponse.json({ error: "Property ID is required" }, { status: 400 });
  }

  const existing = await db.leadProperty.findUnique({
    where: { leadId_propertyId: { leadId: id, propertyId } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  const property = await db.property.findUnique({ where: { id: propertyId } });

  await db.leadProperty.delete({
    where: { leadId_propertyId: { leadId: id, propertyId } },
  });

  // Timeline event
  await db.timelineEvent.create({
    data: {
      leadId: id,
      userId: user.id,
      eventType: "PropertyUnlinked",
      description: `Property "${property?.name || "Unknown"}" unlinked from lead`,
    },
  });

  return NextResponse.json({ success: true });
}
