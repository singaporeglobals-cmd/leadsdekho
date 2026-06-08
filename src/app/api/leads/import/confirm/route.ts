import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// POST /api/leads/import/confirm - Confirm CSV import with property mapping
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admin can import
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { rows, assignTo, propertyMapping } = await req.json();

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

  // Build property mapping: projectName -> propertyId
  const propMapping: Record<string, string> = propertyMapping || {};

  const created = [];

  for (const row of rows) {
    if (!row.name || !row.phone) continue;

    // Find or create project by name
    let projectId: string | null = null;
    if (row.projectName) {
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
      // Include the date in the source or notes
      source = row.source || "CSV Import";
    }

    const lead = await db.lead.create({
      data: {
        name: row.name,
        phone: row.phone,
        email: row.email || null,
        source,
        budget: row.budget || null,
        notes: row.notes || (row.date ? `Import Date: ${row.date}` : null),
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
        description: `Lead imported via CSV by ${user.name}`,
      },
    });

    // If property mapping exists for this project name, link the property
    if (row.projectName && propMapping[row.projectName]) {
      const propertyId = propMapping[row.projectName];
      // Check if the property exists
      const property = await db.property.findUnique({ where: { id: propertyId } });
      if (property) {
        await db.leadProperty.create({
          data: {
            leadId: lead.id,
            propertyId,
          },
        }).catch(() => {
          // Ignore if already linked
        });
      }
    }

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

  return NextResponse.json({ imported: created.length }, { status: 201 });
}
