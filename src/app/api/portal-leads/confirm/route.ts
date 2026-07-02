import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * POST /api/portal-leads/confirm — ADMIN only.
 *
 * Body: {
 *   leads: [
 *     {
 *       id: string,            // PortalLead ID
 *       assignToId?: string,   // User ID to assign the lead to (defaults to admin)
 *       projectId?: string,    // Project ID to link the lead to
 *       source?: string,       // Override source (defaults to portalLead.source)
 *     }
 *   ]
 * }
 *
 * For each portal lead:
 *   1. Fetch the PortalLead row
 *   2. Create a corresponding Lead in the main Lead table with the chosen
 *      assignee/project/source.
 *   3. Mark the PortalLead as "confirmed" (kept for audit, not deleted).
 *   4. Create timeline event on the new Lead.
 *
 * Returns { confirmed: number, failed: [{ id, error }] }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "super_admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  let body: { leads?: Array<{ id: string; assignToId?: string; projectId?: string; source?: string }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.leads || !Array.isArray(body.leads) || body.leads.length === 0) {
    return NextResponse.json({ error: "No leads provided" }, { status: 400 });
  }

  // Pre-fetch all users and projects so we can validate IDs in O(1) per lead
  const [allUsers, allProjects] = await Promise.all([
    db.user.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    db.project.findMany({ select: { id: true, name: true } }),
  ]);
  const userMap = new Map(allUsers.map((u) => [u.id, u]));
  const projectMap = new Map(allProjects.map((p) => [p.id, p]));

  // Phone-based duplicate check: if a lead with this phone already exists in the
  // main Lead table, skip it (don't create duplicate).
  const phones = body.leads
    .map((l) => l.id)
    .filter(Boolean);
  // We don't know phones yet — we'll fetch PortalLead rows first
  const portalLeadIds = body.leads.map((l) => l.id);
  const portalLeads = await db.portalLead.findMany({
    where: { id: { in: portalLeadIds }, status: "pending" },
  });
  const portalLeadMap = new Map(portalLeads.map((p) => [p.id, p]));

  // Check existing main-Lead phones to detect duplicates
  const allPhones = portalLeads.map((p) => p.phone).filter(Boolean);
  const existingLeads = allPhones.length > 0
    ? await db.lead.findMany({ where: { phone: { in: allPhones } }, select: { id: true, phone: true } })
    : [];
  const existingPhones = new Set(existingLeads.map((l) => l.phone));

  const confirmed: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];
  const duplicated: string[] = [];

  // Process each portal lead
  for (const item of body.leads) {
    const portalLead = portalLeadMap.get(item.id);
    if (!portalLead) {
      failed.push({ id: item.id, error: "Portal lead not found or already confirmed" });
      continue;
    }

    // Duplicate phone check — skip if a Lead already exists with this phone
    if (existingPhones.has(portalLead.phone)) {
      // Mark the portal lead as confirmed (so it leaves the pending queue) but don't create a new Lead
      await db.portalLead.update({
        where: { id: portalLead.id },
        data: { status: "confirmed" },
      });
      duplicated.push(portalLead.id);
      continue;
    }

    // Validate assignee
    let ownerId = user.id;
    if (item.assignToId) {
      const u = userMap.get(item.assignToId);
      if (!u) {
        failed.push({ id: item.id, error: "Assignee user not found or inactive" });
        continue;
      }
      ownerId = item.assignToId;
    }

    // Validate project
    let projectId: string | null = null;
    if (item.projectId) {
      const p = projectMap.get(item.projectId);
      if (!p) {
        failed.push({ id: item.id, error: "Project not found" });
        continue;
      }
      projectId = item.projectId;
    }

    // Source: use override if provided, else the portal lead's source
    const source = item.source || portalLead.source || "Portal";

    // Compose notes — include original notes from portal + audit trail
    const noteParts: string[] = [];
    if (portalLead.notes) noteParts.push(portalLead.notes);
    if (portalLead.projectName) noteParts.push(`Original project name: ${portalLead.projectName}`);
    if (portalLead.portalRef) noteParts.push(`Portal ref: ${portalLead.portalRef}`);
    noteParts.push(`Imported from portal: ${source}`);
    const notes = noteParts.join(" | ");

    try {
      // Create the main Lead
      const lead = await db.lead.create({
        data: {
          name: portalLead.name,
          phone: portalLead.phone,
          email: portalLead.email,
          source,
          budget: portalLead.budget,
          notes,
          primaryOwnerId: ownerId,
          currentOwnerId: ownerId,
          projectId,
        },
      });

      // Timeline event
      await db.timelineEvent.create({
        data: {
          leadId: lead.id,
          userId: user.id,
          eventType: "Created",
          description: `Lead imported from portal "${source}" by ${user.name}`,
        },
      });

      // Assignment record if assigned to someone else
      if (ownerId !== user.id) {
        await db.leadAssignment.create({
          data: {
            leadId: lead.id,
            fromUserId: user.id,
            toUserId: ownerId,
            reason: `Assigned during portal-lead confirmation (source: ${source})`,
          },
        });
      }

      // Mark the PortalLead as confirmed (kept for audit)
      await db.portalLead.update({
        where: { id: portalLead.id },
        data: {
          status: "confirmed",
          assignedTo: ownerId,
          projectId: projectId,
        },
      });

      confirmed.push(lead.id);
    } catch (err) {
      console.error(`Failed to confirm portal lead ${item.id}:`, err);
      failed.push({ id: item.id, error: "Internal server error during lead creation" });
    }
  }

  return NextResponse.json({
    confirmed: confirmed.length,
    duplicated: duplicated.length,
    failed: failed.length,
    failedDetails: failed,
  }, { status: 201 });
}
