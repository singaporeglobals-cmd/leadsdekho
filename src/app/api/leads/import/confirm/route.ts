import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// POST /api/leads/import/confirm - Confirm CSV/XLS import with project mapping
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admin can import
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { rows, assignTo, projectMapping, skipDuplicates } = await req.json();

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  // Determine primary/current owner
  let ownerId: string;
  if (assignTo) {
    ownerId = assignTo;
  } else {
    ownerId = user.id;
  }

  // Build project name -> projectId map
  const projectMap: Record<string, string> = {};
  const allProjects = await db.project.findMany();
  allProjects.forEach((p) => {
    projectMap[p.name.toLowerCase()] = p.id;
  });

  // Build project mapping: projectName -> projectId
  const projMapping: Record<string, string> = projectMapping || {};

  const created = [];
  const skipped = [];

  for (const row of rows) {
    if (!row.name || !row.phone) continue;

    // Skip duplicates if requested
    if (skipDuplicates && row.isDuplicate) {
      skipped.push(row);
      continue;
    }

    // Find project by mapping or by name
    let projectId: string | null = null;
    if (row.projectName && projMapping[row.projectName]) {
      const mappedProject = allProjects.find((p) => p.id === projMapping[row.projectName]);
      if (mappedProject) {
        projectId = mappedProject.id;
      }
    } else if (row.projectName) {
      const existingProject = allProjects.find(
        (p) => p.name.toLowerCase() === row.projectName.toLowerCase()
      );
      if (existingProject) {
        projectId = existingProject.id;
      }
    }

    // Handle date field
    let source = row.source || "CSV Import";
    if (row.date) {
      source = row.source || "CSV Import";
    }

    // Format the import date in notes if present
    let notes = row.notes || null;
    if (row.date) {
      notes = notes ? `${notes} | Import Date: ${row.date}` : `Import Date: ${row.date}`;
    }

    const lead = await db.lead.create({
      data: {
        name: row.name,
        phone: row.phone,
        email: row.email || null,
        source,
        budget: row.budget || null,
        notes,
        primaryOwnerId: ownerId,
        currentOwnerId: ownerId,
        projectId,
      },
    });

    await db.timelineEvent.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        eventType: "Created",
        description: `Lead imported via CSV/XLS by ${user.name}`,
      },
    });



    // If admin assigned to someone, create assignment record
    if (assignTo && assignTo !== user.id) {
      await db.leadAssignment.create({
        data: {
          leadId: lead.id,
          fromUserId: user.id,
          toUserId: assignTo,
          reason: "Bulk import assignment",
        },
      });
    }

    created.push(lead);
  }

  return NextResponse.json({
    imported: created.length,
    skipped: skipped.length,
  }, { status: 201 });
}
