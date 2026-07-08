import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/portal-leads/settings — ADMIN only.
 * Returns the current Housing.com integration settings.
 * The encryption key is masked in the response for security.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "super_admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  let settings = await db.portalSetting.findUnique({ where: { id: "singleton" } });
  if (!settings) {
    settings = await db.portalSetting.create({ data: { id: "singleton" } });
  }

  return NextResponse.json({
    housingProfileId: settings.housingProfileId || "",
    housingEncryptionKey: settings.housingEncryptionKey || "",
    housingEncryptionKeyMasked: settings.housingEncryptionKey
      ? settings.housingEncryptionKey.slice(0, 4) + "••••••••" + settings.housingEncryptionKey.slice(-4)
      : "",
    housingDefaultProjectId: settings.housingDefaultProjectId || "",
    housingLastSyncAt: settings.housingLastSyncAt,
    housingLastSyncStatus: settings.housingLastSyncStatus,
    housingLastSyncMessage: settings.housingLastSyncMessage,
  });
}

/**
 * PUT /api/portal-leads/settings — ADMIN only.
 * Body: {
 *   housingProfileId?: string,
 *   housingEncryptionKey?: string,
 *   housingDefaultProjectId?: string
 * }
 */
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "super_admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};

  if (typeof body.housingProfileId === "string") {
    updateData.housingProfileId = body.housingProfileId.trim() || null;
  }
  if (typeof body.housingEncryptionKey === "string") {
    // Allow empty string to clear; otherwise update
    updateData.housingEncryptionKey = body.housingEncryptionKey.trim() || null;
  }
  if (typeof body.housingDefaultProjectId === "string") {
    updateData.housingDefaultProjectId = body.housingDefaultProjectId || null;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  // Upsert: settings row may not exist yet
  const updated = await db.portalSetting.upsert({
    where: { id: "singleton" },
    update: updateData,
    create: { id: "singleton", ...updateData },
  });

  return NextResponse.json({
    success: true,
    housingProfileId: updated.housingProfileId || "",
    housingDefaultProjectId: updated.housingDefaultProjectId || "",
    housingEncryptionKeyMasked: updated.housingEncryptionKey
      ? updated.housingEncryptionKey.slice(0, 4) + "••••••••" + updated.housingEncryptionKey.slice(-4)
      : "",
  });
}
