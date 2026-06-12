import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// POST /api/leads/import/confirm - Confirm CSV/XLS import with project mapping and per-row assignment
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admin can import
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { rows, projectMapping, skipDuplicates } = await req.json();

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  // Build project name -> projectId map from DB
  const projectMap: Record<string, string> = {};
  const allProjects = await db.project.findMany();
  allProjects.forEach((p) => {
    projectMap[p.name.toLowerCase()] = p.id;
  });

  // Build project mapping: projectName -> projectId
  const projMapping: Record<string, string> = projectMapping || {};

  const created = [];
  const skipped = [];

  // Use Prisma createMany for bulk insert where possible, but we need individual creates for timeline events
  // Process in batches for performance
  const BATCH_SIZE = 10;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (row: Record<string, unknown>) => {
      if (!row.name || !row.phone) return;

      // Skip duplicates if requested
      if (skipDuplicates && row.isDuplicate) {
        skipped.push(row);
        return;
      }

      // Determine primary/current owner - per-row assignee takes priority
      let ownerId: string;
      if (row.assignToId) {
        ownerId = row.assignToId as string;
      } else {
        ownerId = user.id;
      }

      // Find project - per-row projectId takes priority, then mapping, then name match
      let projectId: string | null = null;
      if (row.projectId) {
        // Per-row project selection (from dropdown)
        const found = allProjects.find((p) => p.id === row.projectId);
        if (found) projectId = found.id;
      } else if (row.projectName && projMapping[row.projectName as string]) {
        const mappedProject = allProjects.find((p) => p.id === projMapping[row.projectName as string]);
        if (mappedProject) projectId = mappedProject.id;
      } else if (row.projectName) {
        const existingProject = allProjects.find(
          (p) => p.name.toLowerCase() === (row.projectName as string).toLowerCase()
        );
        if (existingProject) projectId = existingProject.id;
      }

      // Source
      let source = (row.source as string) || "Manual";

      // Format the import date in notes if present
      let notes = (row.notes as string) || null;
      if (row.date) {
        notes = notes ? `${notes} | Import Date: ${row.date}` : `Import Date: ${row.date}`;
      }

      const lead = await db.lead.create({
        data: {
          name: row.name as string,
          phone: row.phone as string,
          email: (row.email as string) || null,
          source,
          budget: (row.budget as string) || null,
          notes,
          primaryOwnerId: ownerId,
          currentOwnerId: ownerId,
          projectId,
        },
      });

      // Create timeline event (fire and forget for performance)
      db.timelineEvent.create({
        data: {
          leadId: lead.id,
          userId: user.id,
          eventType: "Created",
          description: `Lead imported via CSV/XLS by ${user.name}`,
        },
      }).catch(() => {});

      // If assigned to someone else, create assignment record
      if (row.assignToId && row.assignToId !== user.id) {
        db.leadAssignment.create({
          data: {
            leadId: lead.id,
            fromUserId: user.id,
            toUserId: row.assignToId as string,
            reason: "Bulk import assignment",
          },
        }).catch(() => {});
      }

      created.push(lead);
    }));
  }

  return NextResponse.json({
    imported: created.length,
    skipped: skipped.length,
  }, { status: 201 });
}
