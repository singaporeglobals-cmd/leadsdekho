import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/leads - List leads with role-based filtering
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  // Multi-value filters: comma-separated values. e.g. ?leadStatus=Not Connected,Not Interested
  // Empty / missing means "no filter".
  const splitList = (v: string | null): string[] =>
    v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];

  const statusList = splitList(searchParams.get("status"));
  const leadStatusList = splitList(searchParams.get("leadStatus"));
  const sourceList = splitList(searchParams.get("source"));
  const projectList = splitList(searchParams.get("project"));
  const ownerList = splitList(searchParams.get("owner"));
  // subStage can be: empty (no filter), or a list of sub-stage values.
  // The special value "__none__" matches leads where subStage IS NULL.
  const subStageList = splitList(searchParams.get("subStage"));

  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const myLeads = searchParams.get("myLeads") === "true";
  const fresh = searchParams.get("fresh") === "true";
  const pendingFollowUps = searchParams.get("pendingFollowUps") === "true";
  const todayFollowUps = searchParams.get("todayFollowUps") === "true";
  const followUpDate = searchParams.get("followUpDate"); // YYYY-MM-DD
  const dateFrom = searchParams.get("dateFrom") || searchParams.get("from");
  const dateTo = searchParams.get("dateTo") || searchParams.get("to");
  const allCallLogs = searchParams.get("allCallLogs") === "true";

  const where: Record<string, unknown> = {};

  // Role-based filtering
  // Telecalling & Sales both see only leads CURRENTLY assigned to them (currentOwnerId)
  // primaryOwnerId is NOT used because once a lead is reassigned, the original creator
  // should no longer see it in their lists.
  // Admin/super_admin see ALL leads
  if (user.role === "telecalling" || user.role === "sales") {
    where.currentOwnerId = user.id;
  }

  // My Leads filter - show only leads CURRENTLY assigned to current user
  if (myLeads) {
    where.currentOwnerId = user.id;
  }

  // Fresh Leads filter - new leads (pipelineStatus=New) assigned to current user
  // Once feedback is given, pipelineStatus auto-changes to "Contacted" so they disappear from here
  if (fresh) {
    where.AND = [
      { currentOwnerId: user.id },
      { pipelineStatus: "New" },
    ];
    // Remove the top-level currentOwnerId if it conflicts with AND
    delete where.currentOwnerId;
    delete where.pipelineStatus; // Already in AND
  }

  if (statusList.length > 0 && !fresh) where.pipelineStatus = { in: statusList };
  if (leadStatusList.length > 0) where.leadStatus = { in: leadStatusList };

  // Build the "AND" conditions list so we can combine multi-filter OR groups safely
  // (search uses OR; subStage with __none__ also uses OR; we must not overwrite each other).
  const andConditions: Record<string, unknown>[] = [];

  if (subStageList.length > 0) {
    const realSubStages = subStageList.filter((s) => s !== "__none__");
    const includeNull = subStageList.includes("__none__");
    if (realSubStages.length > 0 && includeNull) {
      andConditions.push({ OR: [{ subStage: { in: realSubStages } }, { subStage: null }] });
    } else if (realSubStages.length > 0) {
      andConditions.push({ subStage: { in: realSubStages } });
    } else if (includeNull) {
      andConditions.push({ subStage: null });
    }
  }
  if (sourceList.length > 0) where.source = { in: sourceList };
  if (ownerList.length > 0) where.currentOwnerId = { in: ownerList };
  if (projectList.length > 0) where.projectId = { in: projectList };

  // Pending Follow-ups filter - leads that have at least one incomplete follow-up (any date).
  // NOTE: We do NOT filter followUps by userId here, because the follow-up's userId is
  // the person who CREATED it (e.g., a telecaller who called the lead), not the person
  // currently responsible for the lead. Visibility is controlled by lead ownership:
  //   - admin/super_admin: see ALL leads with pending follow-ups
  //   - telecalling/sales: only leads where currentOwnerId == user.id
  if (pendingFollowUps) {
    where.followUps = {
      some: {
        completed: false,
      },
    };
    if (user.role === "telecalling" || user.role === "sales") {
      where.currentOwnerId = user.id;
    }
  }

  // Today's Follow-ups (or specific date) - leads with incomplete follow-ups
  // scheduled on the given date (defaults to today).
  // Same visibility rule as pendingFollowUps above: do NOT filter followUps by userId,
  // only restrict by lead ownership for telecalling/sales.
  if (todayFollowUps) {
    const targetDate = followUpDate ? new Date(followUpDate) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    where.followUps = {
      some: {
        completed: false,
        scheduledAt: { gte: startOfDay, lte: endOfDay },
      },
    };
    if (user.role === "telecalling" || user.role === "sales") {
      where.currentOwnerId = user.id;
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
    if (user.role === "telecalling" || user.role === "sales" || myLeads) {
      // Restrict search to leads currently owned by the user
      andConditions.push({
        OR: [
          { currentOwnerId: user.id, name: { contains: search } },
          { currentOwnerId: user.id, phone: { contains: search } },
          { currentOwnerId: user.id, email: { contains: search } },
        ],
      });
    } else {
      andConditions.push({ OR: searchConditions });
    }
  }

  // Combine all AND conditions into the where clause.
  // If `where.AND` already exists (e.g., from `fresh` filter), we append to it.
  if (andConditions.length > 0) {
    if (where.AND) {
      // Existing AND array (from `fresh` filter)
      const existing = Array.isArray(where.AND) ? where.AND : [where.AND];
      where.AND = [...existing, ...andConditions];
    } else {
      where.AND = andConditions;
    }
  }

  // Counts are optional - the client can request them via includeCounts=true (default)
  // but we skip the My Leads / Fresh Leads counts unless explicitly requested with includeBadgeCounts=true
  // to avoid 2 extra count queries on every pagination / filter change.
  const includeCounts = searchParams.get("includeCounts") !== "false";
  const includeBadgeCounts = searchParams.get("includeBadgeCounts") === "true";

  // Build the count queries for My Leads and Fresh Leads
  // Use only currentOwnerId so that reassigned leads disappear from the original creator's counts.
  const myLeadsWhere = {
    currentOwnerId: user.id,
  };
  const freshLeadsWhere = {
    AND: [
      { currentOwnerId: user.id },
      { pipelineStatus: "New" },
    ],
  };

  const countPromises: Promise<number>[] = [
    db.lead.count({ where }), // total for current filter
  ];
  if (includeBadgeCounts) {
    countPromises.push(
      db.lead.count({ where: myLeadsWhere }),
      db.lead.count({ where: freshLeadsWhere })
    );
  }

  const [leads, ...counts] = await Promise.all([
    db.lead.findMany({
      where,
      // Use select (not include) to ONLY fetch fields the UI needs - reduces payload & join overhead
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        source: true,
        budget: true,
        notes: true,
        pipelineStatus: true,
        leadStatus: true,
        subStage: true,
        lostReason: true,
        primaryOwnerId: true,
        currentOwnerId: true,
        projectId: true,
        createdAt: true,
        updatedAt: true,
        primaryOwner: { select: { id: true, name: true, email: true, role: true } },
        currentOwner: { select: { id: true, name: true, email: true, role: true } },
        project: { select: { id: true, name: true } },
        // Only fetch the LATEST call log (for the "last feedback" badge) - we lazy-load full history on demand
        callLogs: {
          orderBy: { createdAt: "desc" },
          take: allCallLogs ? undefined : 1,
          select: {
            id: true,
            notes: true,
            callType: true,
            subStage: true,
            callDate: true,
            createdAt: true,
            user: { select: { id: true, name: true } },
          },
        },
        // Only the next upcoming follow-up (for the date badge)
        followUps: {
          where: { completed: false },
          orderBy: { scheduledAt: "asc" },
          take: 1,
          select: {
            id: true,
            scheduledAt: true,
            notes: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    ...countPromises,
  ]);

  const total = counts[0];
  const myLeadsCount = includeBadgeCounts ? counts[1] : undefined;
  const freshLeadsCount = includeBadgeCounts ? counts[2] : undefined;

  // Set Cache-Control header so the browser can reuse the response for same-session navigations
  // (60s stale-while-revalidate). Auth handled per-request via cookie so this is safe.
  const res = NextResponse.json({ leads, total, page, limit, myLeadsCount, freshLeadsCount });
  res.headers.set("Cache-Control", "private, max-age=0, stale-while-revalidate=60");
  return res;
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
