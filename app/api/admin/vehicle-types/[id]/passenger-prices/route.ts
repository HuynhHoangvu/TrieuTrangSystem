import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const passengers = Number(body?.passengers);
  const price = Number(body?.price);

  if (!Number.isInteger(passengers) || passengers <= 0 || !Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: "Số người hoặc giá không hợp lệ" }, { status: 400 });
  }

  const type = await prisma.vehicleType.findUnique({ where: { id } });
  if (!type) {
    return NextResponse.json({ error: "Không tìm thấy loại xe" }, { status: 404 });
  }

  const tier = await prisma.passengerPrice.upsert({
    where: { typeId_passengers: { typeId: id, passengers } },
    update: { price },
    create: { typeId: id, passengers, price },
  });

  return NextResponse.json(tier);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tierId = searchParams.get("tierId");
  if (!tierId) {
    return NextResponse.json({ error: "Thiếu tierId" }, { status: 400 });
  }
  await prisma.passengerPrice.delete({ where: { id: tierId } });
  return NextResponse.json({ ok: true });
}
