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
  if (body?.pricePerTrip !== undefined) {
    const price = Number(body.pricePerTrip);
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: "Giá không hợp lệ" }, { status: 400 });
    }
    data.pricePerTrip = price;
  }
  if (body?.durationMode === "manual" || body?.durationMode === "timed") {
    data.durationMode = body.durationMode;
  }
  if (body?.pricingMode === "passengers" || body?.pricingMode === "flat") {
    data.pricingMode = body.pricingMode;
  }

  const type = await prisma.vehicleType.update({
    where: { id },
    data,
    include: { passengerPrices: { orderBy: { passengers: "asc" } } },
  });
  return NextResponse.json(type);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const vehicleCount = await prisma.vehicle.count({ where: { typeId: id } });
  if (vehicleCount > 0) {
    return NextResponse.json(
      { error: "Không thể xoá loại xe đang có xe sử dụng" },
      { status: 409 }
    );
  }
  await prisma.vehicleType.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
