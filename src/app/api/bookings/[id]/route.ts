import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/bookings/[id] - Get a single booking (with full image data URLs)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, role: true } },
      project: { select: { id: true, name: true } },
      lead: { select: { id: true, name: true, phone: true, email: true } },
    },
  });

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  // Access control: non-admins can only view their own bookings
  if ((user.role === "sales" || user.role === "telecalling") && booking.userId !== user.id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return NextResponse.json(booking);
}

// PUT /api/bookings/[id] - Update a booking (admin or owner)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const booking = await db.booking.findUnique({ where: { id } });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  // Only admin or the original creator can edit
  if (
    user.role !== "admin" &&
    user.role !== "super_admin" &&
    booking.userId !== user.id
  ) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const body = await req.json();
  const {
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
    leadId,
  } = body;

  const updateData: Record<string, unknown> = {};
  if (customerName !== undefined) updateData.customerName = customerName;
  if (customerPhone !== undefined) updateData.customerPhone = customerPhone;
  if (customerEmail !== undefined) updateData.customerEmail = customerEmail || null;
  if (projectId !== undefined) updateData.projectId = projectId || null;
  if (propertyName !== undefined) updateData.propertyName = propertyName || null;
  if (unitNumber !== undefined) updateData.unitNumber = unitNumber || null;
  if (bookingAmount !== undefined) updateData.bookingAmount = bookingAmount ? Number(bookingAmount) : null;
  if (totalValue !== undefined) updateData.totalValue = totalValue ? Number(totalValue) : null;
  if (paymentMode !== undefined) updateData.paymentMode = paymentMode || null;
  if (bookingDate !== undefined) updateData.bookingDate = bookingDate ? new Date(bookingDate) : undefined;
  if (notes !== undefined) updateData.notes = notes || null;
  if (status !== undefined) updateData.status = status;
  if (leadId !== undefined) updateData.leadId = leadId || null;

  // Only update images if provided (so we don't accidentally wipe existing images)
  if (Array.isArray(images)) {
    updateData.images = images
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

  const updated = await db.booking.update({
    where: { id },
    data: updateData,
    include: {
      user: { select: { id: true, name: true, role: true } },
      project: { select: { id: true, name: true } },
      lead: { select: { id: true, name: true, phone: true } },
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/bookings/[id] - Delete a booking (admin or owner)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const booking = await db.booking.findUnique({ where: { id } });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  if (
    user.role !== "admin" &&
    user.role !== "super_admin" &&
    booking.userId !== user.id
  ) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  await db.booking.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
