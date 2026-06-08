import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import bcrypt from "bcryptjs";

// GET /api/users
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Admin gets full user list with counts
  // Non-admin gets limited list for assign dropdown
  if (user.role === "admin") {
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            currentLeads: true,
            primaryLeads: true,
            callLogs: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
  } else {
    // Non-admin: return active users for assign dropdown (limited info)
    const users = await db.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
  }
}

// POST /api/users
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { name, email, password, role } = await req.json();

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await db.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json(newUser, { status: 201 });
}
