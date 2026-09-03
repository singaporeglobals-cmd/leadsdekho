import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { parseImportDate } from "@/lib/parse-import-date";

// POST /api/leads/import/confirm - Confirm CSV/XLS import with project mapping and per-row assignment
//
// Robustness design (fixes "Import failed" 500 errors):
//   1. EVERY row is validated UPFRONT (name/phone/assignee/project) — invalid rows are
//      collected and reported, never thrown.
//   2. Leads are inserted with chunked createManyAndReturn (100/chunk) — a handful of
//      queries instead of 3-per-row, so even thousands of rows finish well under the
//      30s serverless timeout.
//   3. Timeline events + assignments are batched with createMany AFTER the leads are
//      inserted (awaited) — previously they were fire-and-forget promises that could
//      be silently dropped when Vercel froze the function.
//   4. The whole handler is wrapped in try/catch so the client always gets a JSON
//      error message instead of an HTML 500 page.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admin or super_admin can import
  if (user.role !== "admin" && user.role !== "super_admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  let body: {
    rows?: Record<string, unknown>[];
    projectMapping?: Record<string, string>;
    skipDuplicates?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { rows, projectMapping, skipDuplicates } = body;

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  try {
    // ---- Fetch reference data in parallel (projects + active users) ----
    const [allProjects, allUsers] = await Promise.all([
      db.project.findMany({ select: { id: true, name: true } }),
      db.user.findMany({ select: { id: true, isActive: true } }),
    ]);
    const validUserIds = new Set(allUsers.filter((u) => u.isActive).map((u) => u.id));
    const projMapping: Record<string, string> = projectMapping || {};

    // ---- Validate every row upfront; never throw on bad data ----
    const toCreate: {
      name: string;
      phone: string;
      email: string | null;
      source: string;
      budget: string | null;
      notes: string | null;
      primaryOwnerId: string;
      currentOwnerId: string;
      projectId: string | null;
      createdAt: Date;
    }[] = [];

    const skipped: { row: number; name: string; phone: string }[] = [];
    const invalid: { row: number; name: string; phone: string; reason: string }[] = [];

    const normalizePhone = (raw: string) => raw.replace(/[^\d+]/g, "");

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx] || {};
      const rawName = String(row.name ?? "").trim();
      const rawPhone = normalizePhone(String(row.phone ?? "").trim());

      // Rows without any phone cannot become leads (phone is required).
      // Rows with a phone but no name are still valuable — auto-name them.
      if (!rawPhone) {
        invalid.push({ row: idx + 1, name: rawName, phone: "", reason: "Missing phone number" });
        continue;
      }

      // Skip duplicates if requested
      if (skipDuplicates && row.isDuplicate) {
        skipped.push({ row: idx + 1, name: rawName, phone: rawPhone });
        continue;
      }

      // Determine primary/current owner — per-row assignee takes priority
      let ownerId = user.id;
      const rawAssign = row.assignToId ? String(row.assignToId) : "";
      if (rawAssign) {
        if (validUserIds.has(rawAssign)) {
          ownerId = rawAssign;
        } else {
          // Assignee no longer exists / is inactive → fall back to importer instead of failing
          invalid.push({
            row: idx + 1,
            name: rawName,
            phone: rawPhone,
            reason: "Assigned user not found — lead assigned to you instead",
          });
        }
      }

      // Find project — per-row projectId, then mapping, then name match
      let projectId: string | null = null;
      const rawProjectId = row.projectId ? String(row.projectId) : "";
      const rawProjectName = row.projectName ? String(row.projectName).trim() : "";
      if (rawProjectId) {
        const found = allProjects.find((p) => p.id === rawProjectId);
        if (found) projectId = found.id;
      } else if (rawProjectName) {
        const mappedId = projMapping[rawProjectName];
        const found = mappedId
          ? allProjects.find((p) => p.id === mappedId)
          : allProjects.find((p) => p.name.toLowerCase() === rawProjectName.toLowerCase());
        if (found) projectId = found.id;
      }

      // Parse the lead date from the import file (DD.MM.YY / DD-MM-YYYY / DD/MM/YYYY / ISO / Excel serial).
      // If the date is missing or invalid, fall back to current date/time.
      const parsedDate = parseImportDate(row.date);
      const leadCreatedAt = parsedDate ?? new Date();

      // Keep the original import date in notes as an audit trail
      let notes = row.notes ? String(row.notes).trim() : null;
      if (row.date) {
        const dateStr = String(row.date).trim();
        notes = notes ? `${notes} | Import Date: ${dateStr}` : `Import Date: ${dateStr}`;
        if (!parsedDate) {
          notes += " (format unrecognized, used import timestamp)";
        }
      }

      toCreate.push({
        name: rawName || "Unknown",
        phone: rawPhone,
        email: row.email ? String(row.email).trim() || null : null,
        source: row.source ? String(row.source).trim() || "Manual" : "Manual",
        budget: row.budget ? String(row.budget).trim() || null : null,
        notes,
        primaryOwnerId: ownerId,
        currentOwnerId: ownerId,
        projectId,
        createdAt: leadCreatedAt,
      });
    }

    // ---- Bulk insert leads in chunks (createManyAndReturn returns rows with IDs) ----
    const createdLeads: { id: string; phone: string; name: string; currentOwnerId: string }[] = [];
    const CHUNK_SIZE = 100;
    for (let i = 0; i < toCreate.length; i += CHUNK_SIZE) {
      const chunk = toCreate.slice(i, i + CHUNK_SIZE);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const inserted = await db.lead.createManyAndReturn({
        data: chunk,
        select: { id: true, phone: true, name: true, currentOwnerId: true },
      });
      createdLeads.push(...inserted);
    }

    // ---- Batch timeline events (awaited — no more fire-and-forget losses) ----
    if (createdLeads.length > 0) {
      await db.timelineEvent.createMany({
        data: createdLeads.map((lead) => ({
          leadId: lead.id,
          userId: user.id,
          eventType: "Created",
          description: `Lead imported via file by ${user.name}`,
        })),
      });

      // ---- Batch assignment records for leads assigned to someone else ----
      const assignmentData: {
        leadId: string;
        fromUserId: string;
        toUserId: string;
        reason: string;
      }[] = [];
      for (let i = 0; i < createdLeads.length; i++) {
        const input = toCreate[i];
        const lead = createdLeads[i];
        if (input.currentOwnerId !== user.id) {
          assignmentData.push({
            leadId: lead.id,
            fromUserId: user.id,
            toUserId: input.currentOwnerId,
            reason: "Bulk import assignment",
          });
        }
      }
      if (assignmentData.length > 0) {
        await db.leadAssignment.createMany({ data: assignmentData });
      }
    }

    return NextResponse.json(
      {
        imported: createdLeads.length,
        skipped: skipped.length,
        invalid: invalid.length,
        invalidDetails: invalid.slice(0, 20),
        warnings: invalid.filter((i) => i.reason.includes("assigned to you")).length,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("Import confirm error:", e);
    const message = e instanceof Error ? e.message : "Unknown database error";
    return NextResponse.json(
      { error: `Import failed: ${message}` },
      { status: 500 }
    );
  }
}
