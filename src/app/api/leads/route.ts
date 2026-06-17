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
  const myLeads = searchParams.get("myLeads") === "true";
  const fresh = searchParams.get("fresh") === "true";
  const pendingFollowUps = searchParams.get("pendingFollowUps") === "true";
  const dateFrom = searchParams.get("dateFrom") || searchParams.get("from");
  const dateTo = searchParams.get("dateTo") || searchParams.get("to");
  const projectId = searchParams.get("project");
  const allCallLogs = searchParams.get("allCallLogs") === "true";

  const where: Record<string, unknown> = {};

  // Role-based filtering
  if (user.role === "telecalling") {
    // Telecalling sees ALL leads by default
  } else if (user.role === "sales") {
    // Sales sees leads where they are currentOwner OR primaryOwner
    where.OR = [
      { currentOwnerId: user.id },
      { primaryOwnerId: user.id },
    ];
  }
  // Admin sees ALL leads

  // My Leads filter - show only leads assigned to current user
  if (myLeads) {
    // Override role-based filtering - only show user's own leads
    where.OR = [
      { currentOwnerId: user.id },
      { primaryOwnerId: user.id },
    ];
  }

  // Fresh Leads filter - new leads (pipelineStatus=New) assigned to current user
  // Once feedback is given, pipelineStatus auto-changes to "Contacted" so they disappear from here
  if (fresh) {
    where.AND = [
      {
        OR: [
          { currentOwnerId: user.id },
          { primaryOwnerId: user.id },
        ],
      },
      {
        pipelineStatus: "New",
      },
    ];
    // Remove the top-level OR if it conflicts with AND
    delete where.OR;
    delete where.pipelineStatus; // Already in AND
  }

  if (status && !fresh) where.pipelineStatus = status;
  if (leadStatus) where.leadStatus = leadStatus;
  if (source) where.source = source;
  if (ownerFilter) where.currentOwnerId = ownerFilter;
  if (projectId) where.projectId = projectId;

  // Pending Follow-ups filter - leads that have at least one incomplete follow-up
  // scheduled for the current user
  if (pendingFollowUps) {
    where.followUps = {
      some: {
        userId: user.id,
        completed: false,
      },
    };
    // Restrict to user's own leads for telecalling/sales (admin sees all)
    if (user.role === "telecalling" || user.role === "sales") {
      where.OR = [
        { currentOwnerId: user.id },
        { primaryOwnerId: user.id },
      ];
    }
  }
  if ((dateFrom || dateTo) && !fresh) {
    where.createdAt = {};
    if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      (where.createdAt as Record<string, unknown>).lte = toDate;
    }
  }
  if (search) {
    const searchConditions = [
      { name: { contains: search } },
      { phone: { contains: search } },
      { email: { contains: search } },
    ];
    if (user.role === "sales" || myLeads) {
      where.OR = [
        { currentOwnerId: user.id, name: { contains: search } },
        { currentOwnerId: user.id, phone: { contains: search } },
        { currentOwnerId: user.id, email: { contains: search } },
        { primaryOwnerId: user.id, name: { contains: search } },
        { primaryOwnerId: user.id, phone: { contains: search } },
        { primaryOwnerId: user.id, email: { contains: search } },
      ];
    } else {
      where.OR = searchConditions;
    }
  }

  // Determine if we should include counts (default: true for efficiency)
  const includeCounts = searchParams.get("includeCounts") !== "false";

  // Build the count queries for My Leads and Fresh Leads (only when requested)
  const myLeadsWhere = {
    OR: [
      { currentOwnerId: user.id },
      { primaryOwnerId: user.id },
    ],
  };
  const freshLeadsWhere = {
    AND: [
      {
        OR: [
          { currentOwnerId: user.id },
          { primaryOwnerId: user.id },
        ],
      },
      { pipelineStatus: "New" },
    ],
  };

  const countPromises: Promise<number>[] = [
    db.lead.count({ where }), // total for current filter
  ];
  if (includeCounts) {
    countPromises.push(
      db.lead.count({ where: myLeadsWhere }),
      db.lead.count({ where: freshLeadsWhere })
    );
  }

  const [leads, ...counts] = await Promise.all([
    db.lead.findMany({
      where,
      include: {
        primaryOwner: { select: { id: true, name: true, email: true, role: true } },
        currentOwner: { select: { id: true, name: true, email: true, role: true } },
        project: { select: { id: true, name: true } },
        callLogs: { orderBy: { createdAt: "desc" }, ...(allCallLogs ? {} : { take: 1 }), include: { user: { select: { name: true } } } },
        followUps: {
          where: { completed: false },
          orderBy: { scheduledAt: "asc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    ...countPromises,
  ]);

  const total = counts[0];
  const myLeadsCount = includeCounts ? counts[1] : undefined;
  const freshLeadsCount = includeCounts ? counts[2] : undefined;

  return NextResponse.json({ leads, total, page, limit, myLeadsCount, freshLeadsCount });
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
