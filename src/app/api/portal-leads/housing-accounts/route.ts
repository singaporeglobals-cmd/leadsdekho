import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/portal-leads/housing-accounts — ADMIN only.
 * Returns all Housing.com accounts. Encryption keys are masked.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "super_admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const accounts = await db.housingAccount.findMany({
    orderBy: { createdAt: "asc" },
  });

  const masked = accounts.map((a) => ({
    id: a.id,
    label: a.label,
    profileId: a.profileId,
    encryptionKeyMasked: a.encryptionKey
      ? a.encryptionKey.slice(0, 4) + "••••••••" + a.encryptionKey.slice(-4)
      : "",
    defaultProjectId: a.defaultProjectId || "",
    isActive: a.isActive,
    lastSyncAt: a.lastSyncAt,
    lastSyncStatus: a.lastSyncStatus,
    lastSyncMessage: a.lastSyncMessage,
    createdAt: a.createdAt,
  }));

  return NextResponse.json({ accounts: masked });
}

/**
 * POST /api/portal-leads/housing-accounts — ADMIN only.
 * Create a new Housing.com account.
 *
 * Body: {
 *   label: string,             // admin-friendly name (required)
 *   profileId: string,         // Housing Profile ID (required)
 *   encryptionKey: string,     // Housing Encryption Key (required)
 *   defaultProjectId?: string, // optional default project
 *   isActive?: boolean         // optional, default true
 * }
 */
export async function POST(req: NextRequest) {
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

  const label = typeof body.label === "string" ? body.label.trim() : "";
  const profileId = typeof body.profileId === "string" ? body.profileId.trim() : "";
  const encryptionKey = typeof body.encryptionKey === "string" ? body.encryptionKey.trim() : "";

  if (!label) return NextResponse.json({ error: "Label is required" }, { status: 400 });
  if (!profileId) return NextResponse.json({ error: "Profile ID is required" }, { status: 400 });
  if (!encryptionKey) return NextResponse.json({ error: "Encryption Key is required" }, { status: 400 });

  const defaultProjectId =
    typeof body.defaultProjectId === "string" && body.defaultProjectId
      ? body.defaultProjectId
      : null;
  const isActive = typeof body.isActive === "boolean" ? body.isActive : true;

  // Prevent duplicate profile IDs
  const existing = await db.housingAccount.findFirst({
    where: { profileId },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: `An account with Profile ID ${profileId} already exists` },
      { status: 409 }
    );
  }

  const created = await db.housingAccount.create({
    data: {
      label,
      profileId,
      encryptionKey,
      defaultProjectId,
      isActive,
    },
  });

  return NextResponse.json(
    {
      id: created.id,
      label: created.label,
      profileId: created.profileId,
      defaultProjectId: created.defaultProjectId || "",
      isActive: created.isActive,
    },
    { status: 201 }
  );
}
