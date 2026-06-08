import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// POST /api/leads/import/confirm - Confirm CSV import
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows, assignTo } = await req.json();

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  // Determine primary/current owner
  let ownerId: string;
  if (user.role === "admin" && assignTo) {
    ownerId = assignTo;
  } else {
    ownerId = user.id;
  }

  const created = [];

  for (const row of rows) {
    if (!row.name || !row.phone) continue;

    const lead = await db.lead.create({
      data: {
        name: row.name,
        phone: row.phone,
        email: row.email || null,
        source: row.source || "CSV Import",
        budget: row.budget || null,
        notes: row.notes || null,
        primaryOwnerId: ownerId,
        currentOwnerId: ownerId,
        projectId: row.project_id || null,
      },
    });

    await db.timelineEvent.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        eventType: "Created",
        description: `Lead imported via CSV by ${user.name}`,
      },
    });

    created.push(lead);
  }

  return NextResponse.json({ imported: created.length }, { status: 201 });
}
