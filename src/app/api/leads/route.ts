import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/leads - List leads with role-based filtering
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const leadStatus = searchParams.get("leadStatus");
  const source = searchParams.get("source");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const ownerFilter = searchParams.get("owner");
  const dateFrom = searchParams.get("dateFrom") || searchParams.get("from");
  const dateTo = searchParams.get("dateTo") || searchParams.get("to");
  const projectId = searchParams.get("project");
  const allCallLogs = searchParams.get("allCallLogs") === "true";

  const where: Record<string, unknown> = {};

  // Role-based filtering
  if (user.role === "telecalling") {
    // Telecalling sees ALL leads
  } else if (user.role === "sales") {
    // Sales sees leads where they are currentOwner OR primaryOwner
    where.OR = [
      { currentOwnerId: user.id },
      { primaryOwnerId: user.id },
    ];
  }
  // Admin sees ALL leads

  if (status) where.pipelineStatus = status;
  if (leadStatus) where.leadStatus = leadStatus;
  if (source) where.source = source;
  if (ownerFilter) where.currentOwnerId = ownerFilter;
  if (projectId) where.projectId = projectId;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      (where.createdAt as Record<string, unknown>).lte = toDate;
    }
  }
  if (search) {
    where.OR = user.role === "sales"
      ? [
          { currentOwnerId: user.id, name: { contains: search } },
          { currentOwnerId: user.id, phone: { contains: search } },
          { currentOwnerId: user.id, email: { contains: search } },
          { primaryOwnerId: user.id, name: { contains: search } },
          { primaryOwnerId: user.id, phone: { contains: search } },
          { primaryOwnerId: user.id, email: { contains: search } },
        ]
      : [
          { name: { contains: search } },
          { phone: { contains: search } },
          { email: { contains: search } },
        ];
  }

  const [leads, total] = await Promise.all([
    db.lead.findMany({
      where,
      include: {
        primaryOwner: { select: { id: true, name: true, email: true, role: true } },
        currentOwner: { select: { id: true, name: true, email: true, role: true } },
        project: { select: { id: true, name: true } },
        callLogs: { orderBy: { createdAt: "desc" }, ...(allCallLogs ? {} : { take: 1 }), include: { user: { select: { name: true } } } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.lead.count({ where }),
  ]);

  return NextResponse.json({ leads, total, page, limit });
}

// POST /api/leads - Create a lead
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, phone, email, source, budget, notes, projectId, assignTo } = body;

  if (!name || !phone) {
    return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
  }

  // Primary owner logic
  let primaryOwnerId: string;
  let currentOwnerId: string;

  if (user.role === "admin" && assignTo) {
    // Admin assigns to someone else - that person becomes primaryOwner
    primaryOwnerId = assignTo;
    currentOwnerId = assignTo;
  } else {
    // Creator is the primary owner
    primaryOwnerId = user.id;
    currentOwnerId = user.id;
  }

  const lead = await db.lead.create({
    data: {
      name,
      phone,
      email: email || null,
      source: source || "Manual",
      budget: budget || null,
      notes: notes || null,
      primaryOwnerId,
      currentOwnerId,
      projectId: projectId || null,
    },
    include: {
      primaryOwner: { select: { id: true, name: true, email: true, role: true } },
      currentOwner: { select: { id: true, name: true, email: true, role: true } },
      project: { select: { id: true, name: true } },
    },
  });

  // Create timeline event
  await db.timelineEvent.create({
    data: {
      leadId: lead.id,
      userId: user.id,
      eventType: "Created",
      description: `Lead created by ${user.name}`,
    },
  });

  // If admin assigned to someone, create assignment record
  if (user.role === "admin" && assignTo && assignTo !== user.id) {
    await db.leadAssignment.create({
      data: {
        leadId: lead.id,
        fromUserId: user.id,
        toUserId: assignTo,
        reason: "Initial assignment",
      },
    });
    await db.timelineEvent.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        eventType: "Assigned",
        description: `Lead assigned to ${lead.currentOwner.name}`,
      },
    });
  }

  return NextResponse.json(lead, { status: 201 });
}
