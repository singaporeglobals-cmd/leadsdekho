import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

/**
 * EMERGENCY DIAGNOSTIC + RECOVERY endpoint.
 *
 * This is a TEMPORARY endpoint that should be removed after the issue is
 * resolved. It allows us to:
 *   1. Check if the User table has any rows (without requiring auth)
 *   2. List user emails + roles + active status (NOT passwords)
 *   3. Reset a user's password via a secret token (emergency recovery)
 *
 * Security: All write actions require a `token` query param matching
 * EMERGENCY_RECOVERY_TOKEN env var. Read-only diagnostics are open
 * (they only reveal emails + roles, not passwords).
 *
 * Usage:
 *   GET  /api/diagnostics                         — basic info (user count, emails)
 *   POST /api/diagnostics?action=reset_password&token=XXX
 *        body: { email, newPassword }             — reset a user's password
 *   POST /api/diagnostics?action=ensure_admin&token=XXX
 *        body: { email, name, password }          — create or reactivate admin
 */
export async function GET() {
  try {
    const userCount = await db.user.count();
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      database: "reachable",
      userCount,
      users: users.map((u) => ({
        email: u.email,
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
      })),
      // Do NOT expose passwords or password hashes
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        timestamp: new Date().toISOString(),
        database: "error",
        error: err instanceof Error ? err.message : "Unknown DB error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Auth check — requires emergency token
  const expectedToken = process.env.EMERGENCY_RECOVERY_TOKEN;
  if (!expectedToken) {
    return NextResponse.json(
      { error: "EMERGENCY_RECOVERY_TOKEN env var is not set. Cannot perform recovery action." },
      { status: 500 }
    );
  }
  const { searchParams } = new URL(req.url);
  const providedToken = searchParams.get("token");
  if (providedToken !== expectedToken) {
    return NextResponse.json({ error: "Invalid or missing token" }, { status: 401 });
  }

  const action = searchParams.get("action");
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // body optional for some actions
  }

  // === Reset password ===
  if (action === "reset_password") {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    if (!email || !newPassword || newPassword.length < 4) {
      return NextResponse.json(
        { error: "email and newPassword (min 4 chars) are required" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: `No user found with email ${email}` }, { status: 404 });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.user.update({
      where: { id: user.id },
      data: { password: hashed, isActive: true },
    });

    return NextResponse.json({
      ok: true,
      message: `Password for ${email} has been reset and account activated. You can now log in.`,
      user: { email: user.email, name: user.name, role: user.role },
    });
  }

  // === Ensure admin (create or reactivate) ===
  if (action === "ensure_admin") {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "Admin";
    const password = typeof body.password === "string" ? body.password : "";
    const role = typeof body.role === "string" ? body.role : "super_admin";

    if (!email || !password || password.length < 4) {
      return NextResponse.json(
        { error: "email and password (min 4 chars) are required" },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(password, 10);
    const existing = await db.user.findUnique({ where: { email } });

    if (existing) {
      await db.user.update({
        where: { id: existing.id },
        data: { password: hashed, isActive: true, role, name },
      });
      return NextResponse.json({
        ok: true,
        message: `Existing user ${email} updated. Password reset, role=${role}, activated.`,
        user: { email, name, role },
      });
    }

    const created = await db.user.create({
      data: { email, name, password: hashed, role, isActive: true },
    });
    return NextResponse.json({
      ok: true,
      message: `New ${role} user ${email} created. You can now log in.`,
      user: { email: created.email, name: created.name, role: created.role },
    });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
