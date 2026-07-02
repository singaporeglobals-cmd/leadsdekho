import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * PUT /api/portal-leads/housing-accounts/[id] — ADMIN only.
 * Update an existing Housing.com account.
 *
 * Body (all optional):
 *   { label?, profileId?, encryptionKey?, defaultProjectId?, isActive? }
 *
 * If encryptionKey is omitted/empty, the existing key is preserved.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "super_admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const existing = await db.housingAccount.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};

  if (typeof body.label === "string") {
    const label = body.label.trim();
    if (!label) return NextResponse.json({ error: "Label cannot be empty" }, { status: 400 });
    updateData.label = label;
  }
  if (typeof body.profileId === "string") {
    const profileId = body.profileId.trim();
    if (!profileId) return NextResponse.json({ error: "Profile ID cannot be empty" }, { status: 400 });
    // Check for duplicate (excluding self)
    const dup = await db.housingAccount.findFirst({
      where: { profileId, NOT: { id } },
      select: { id: true },
    });
    if (dup) {
      return NextResponse.json(
        { error: `Another account with Profile ID ${profileId} already exists` },
        { status: 409 }
      );
    }
    updateData.profileId = profileId;
  }
  if (typeof body.encryptionKey === "string" && body.encryptionKey.trim() !== "") {
    updateData.encryptionKey = body.encryptionKey.trim();
  }
  if (typeof body.endpointUrl === "string") {
    // Empty string clears the field; non-empty string sets it
    updateData.endpointUrl = body.endpointUrl.trim() || null;
  }
  if (typeof body.defaultProjectId === "string") {
    updateData.defaultProjectId = body.defaultProjectId || null;
  }
  if (typeof body.isActive === "boolean") {
    updateData.isActive = body.isActive;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await db.housingAccount.update({ where: { id }, data: updateData });

  return NextResponse.json({
    id: updated.id,
    label: updated.label,
    profileId: updated.profileId,
    encryptionKeyMasked: updated.encryptionKey
      ? updated.encryptionKey.slice(0, 4) + "••••••••" + updated.encryptionKey.slice(-4)
      : "",
    endpointUrl: updated.endpointUrl || "",
    defaultProjectId: updated.defaultProjectId || "",
    isActive: updated.isActive,
  });
}

/**
 * DELETE /api/portal-leads/housing-accounts/[id] — ADMIN only.
 * Hard-deletes a Housing.com account. Already-synced leads remain in the
 * PortalLead table (their source is still "Housing.com" — they're unaffected).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "super_admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await db.housingAccount.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  await db.housingAccount.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
