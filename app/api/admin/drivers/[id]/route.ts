import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};
  if (typeof body?.name === "string") data.name = body.name.trim();
  if (typeof body?.phone === "string") data.phone = body.phone.trim();
  if (typeof body?.role === "string") data.role = body.role;
  if (typeof body?.status === "string") data.status = body.status;

  const driver = await prisma.driver.update({
    where: { id },
    data,
    select: { id: true, name: true, phone: true, role: true, status: true },
  });
  return NextResponse.json(driver);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tripCount = await prisma.trip.count({ where: { driverId: id } });
  if (tripCount > 0) {
    return NextResponse.json(
      { error: "Không thể xoá tài xế đã có lịch sử lượt chạy. Hãy vô hiệu hoá tài khoản." },
      { status: 409 }
    );
  }
  await prisma.driver.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
