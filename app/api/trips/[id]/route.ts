import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.amount === "number") data.amount = body.amount;
  if (typeof body.paymentMethod === "string") data.paymentMethod = body.paymentMethod;
  if (typeof body.status === "string") data.status = body.status;
  if (typeof body.note === "string") data.note = body.note;
  if (typeof body.checkInTime === "string") data.checkInTime = new Date(body.checkInTime);
  if (typeof body.checkOutTime === "string") data.checkOutTime = new Date(body.checkOutTime);

  const trip = await prisma.trip.update({ where: { id }, data });
  return NextResponse.json(trip);
}
