import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/bookings - List bookings
// Query params:
//   - userId: filter by user (admin only)
//   - projectId: filter by project
//   - status: filter by status
//   - from: YYYY-MM-DD
//   - to: YYYY-MM-DD
//   - search: customer name / phone
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filterUserId = searchParams.get("userId");
  const projectId = searchParams.get("projectId");
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};

  // Role-based filtering
  // - sales / telecalling: only see bookings they created
  // - admin / super_admin: see all bookings (optionally filtered by userId)
  if (user.role === "sales" || user.role === "telecalling") {
    where.userId = user.id;
  } else if (filterUserId && filterUserId !== "all") {
    where.userId = filterUserId;
  }

  if (projectId && projectId !== "all") where.projectId = projectId;
  if (status && status !== "all") where.status = status;

  if (from || to) {
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (from) dateFilter.gte = new Date(from + "T00:00:00.000Z");
    if (to) dateFilter.lte = new Date(to + "T23:59:59.999Z");
    where.bookingDate = dateFilter;
  }

  if (search) {
    where.OR = [
      { customerName: { contains: search, mode: "insensitive" } },
      { customerPhone: { contains: search } },
      { customerEmail: { contains: search, mode: "insensitive" } },
      { propertyName: { contains: search, mode: "insensitive" } },
      { unitNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  const bookings = await db.booking.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      customerName: true,
      customerPhone: true,
      customerEmail: true,
      propertyName: true,
      unitNumber: true,
      bookingAmount: true,
      totalValue: true,
      paymentMode: true,
      bookingDate: true,
      status: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      leadId: true,
      // Only return image metadata for list view (not full data URLs)
      // to keep the payload small. Full images are fetched in detail view.
      images: true,
      user: { select: { id: true, name: true, role: true } },
      project: { select: { id: true, name: true } },
      lead: { select: { id: true, name: true, phone: true } },
    },
  });

  // Trim images to metadata only for list view
  const trimmed = bookings.map((b) => {
    const imgs = Array.isArray(b.images) ? b.images : [];
    return {
      ...b,
      images: imgs.map((img: { name?: string; type?: string; size?: number }) => ({
        name: img.name,
        type: img.type,
        size: img.size,
      })),
      imageCount: imgs.length,
    };
  });

  return NextResponse.json({ bookings: trimmed });
}

// POST /api/bookings - Create a new booking (manual entry)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    leadId,
    customerName,
    customerPhone,
    customerEmail,
    projectId,
    propertyName,
    unitNumber,
    bookingAmount,
    totalValue,
    paymentMode,
    bookingDate,
    notes,
    status,
    images,
  } = body;

  if (!customerName || !customerPhone) {
    return NextResponse.json(
      { error: "Customer name and phone are required" },
      { status: 400 }
    );
  }

  // Validate images array (must be array of {name, dataUrl, type, size})
  let imagesData: unknown[] = [];
  if (Array.isArray(images)) {
    imagesData = images
      .filter(
        (img) =>
          img &&
          typeof img === "object" &&
          typeof img.dataUrl === "string" &&
          typeof img.name === "string"
      )
      .map((img) => ({
        name: img.name,
        dataUrl: img.dataUrl,
        type: img.type || "image/jpeg",
        size: img.size || 0,
      }));
  }

  const booking = await db.booking.create({
    data: {
      leadId: leadId || null,
      userId: user.id,
      customerName,
      customerPhone,
      customerEmail: customerEmail || null,
      projectId: projectId || null,
      propertyName: propertyName || null,
      unitNumber: unitNumber || null,
      bookingAmount: bookingAmount ? Number(bookingAmount) : null,
      totalValue: totalValue ? Number(totalValue) : null,
      paymentMode: paymentMode || null,
      bookingDate: bookingDate ? new Date(bookingDate) : new Date(),
      notes: notes || null,
      status: status || "Confirmed",
      images: imagesData,
    },
    include: {
      user: { select: { id: true, name: true, role: true } },
      project: { select: { id: true, name: true } },
      lead: { select: { id: true, name: true, phone: true } },
    },
  });

  // If a lead is linked, mark its leadStatus as "Booked" and add a timeline event
  if (leadId) {
    try {
      await db.lead.update({
        where: { id: leadId },
        data: {
          leadStatus: "Booked",
          pipelineStatus: "Won",
        },
      });
      await db.timelineEvent.create({
        data: {
          leadId,
          userId: user.id,
          eventType: "BookingCreated",
          description: `Booking created by ${user.name} for ${customerName}`,
        },
      });
    } catch {
      // Lead update is best-effort - don't fail the booking creation
    }
  }

  return NextResponse.json(booking, { status: 201 });
}
