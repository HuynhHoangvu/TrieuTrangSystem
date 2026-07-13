import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id } = await params;
  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip) {
    return NextResponse.json({ error: "Không tìm thấy lượt chạy" }, { status: 404 });
  }
  if (session.role !== "admin" && trip.driverId !== session.userId) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }
  if (trip.status !== "active") {
    return NextResponse.json({ error: "Lượt chạy đã kết thúc" }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const paymentMethod = typeof body?.paymentMethod === "string" ? body.paymentMethod : undefined;

  const updated = await prisma.trip.update({
    where: { id },
    data: {
      status: "completed",
      checkOutTime: new Date(),
      ...(paymentMethod ? { paymentMethod } : {}),
    },
  });

  return NextResponse.json(updated);
}
