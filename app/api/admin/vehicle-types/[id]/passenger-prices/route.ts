import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  const price = Number(body?.price);
  const passengers =
    body?.passengers !== undefined && body?.passengers !== null && body.passengers !== ""
      ? Number(body.passengers)
      : null;
  const allowExtend = body?.allowExtend !== false;

  if (!label || !Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: "Tên tuỳ chọn hoặc giá không hợp lệ" }, { status: 400 });
  }

  const type = await prisma.vehicleType.findUnique({ where: { id } });
  if (!type) {
    return NextResponse.json({ error: "Không tìm thấy loại xe" }, { status: 404 });
  }

  const option = await prisma.passengerPrice.create({
    data: { typeId: id, label, passengers, price, allowExtend },
  });

  return NextResponse.json(option);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const tierId = typeof body?.tierId === "string" ? body.tierId : "";
  if (!tierId) {
    return NextResponse.json({ error: "Thiếu tierId" }, { status: 400 });
  }
  const data: Record<string, unknown> = {};
  if (typeof body?.label === "string" && body.label.trim()) data.label = body.label.trim();
  if (body?.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: "Giá không hợp lệ" }, { status: 400 });
    }
    data.price = price;
  }
  if (body?.passengers !== undefined) {
    data.passengers =
      body.passengers === null || body.passengers === "" ? null : Number(body.passengers);
  }
  if (typeof body?.allowExtend === "boolean") {
    data.allowExtend = body.allowExtend;
  }

  const option = await prisma.passengerPrice.update({ where: { id: tierId }, data });
  return NextResponse.json(option);
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
