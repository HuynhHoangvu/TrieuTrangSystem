import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};
  if (typeof body?.code === "string") data.code = body.code.trim();
  if (typeof body?.typeId === "string") data.typeId = body.typeId;
  if (typeof body?.status === "string") data.status = body.status;
  if (body?.priceOverride !== undefined) {
    data.priceOverride =
      body.priceOverride === null || body.priceOverride === ""
        ? null
        : Number(body.priceOverride);
  }

  const vehicle = await prisma.vehicle.update({ where: { id }, data });
  return NextResponse.json(vehicle);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tripCount = await prisma.trip.count({ where: { vehicleId: id } });
  if (tripCount > 0) {
    return NextResponse.json(
      { error: "Không thể xoá xe đã có lịch sử lượt chạy. Hãy chuyển sang trạng thái bảo trì." },
      { status: 409 }
    );
  }
  await prisma.vehicle.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
