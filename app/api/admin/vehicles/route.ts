import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const vehicles = await prisma.vehicle.findMany({
    include: { type: true },
    orderBy: { code: "asc" },
  });
  return NextResponse.json(vehicles);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const typeId = typeof body?.typeId === "string" ? body.typeId : "";
  const priceOverride =
    body?.priceOverride !== undefined && body?.priceOverride !== null && body.priceOverride !== ""
      ? Number(body.priceOverride)
      : null;

  if (!code || !typeId) {
    return NextResponse.json({ error: "Thiếu mã xe hoặc loại xe" }, { status: 400 });
  }

  const existing = await prisma.vehicle.findUnique({ where: { code } });
  if (existing) {
    return NextResponse.json({ error: `Mã xe "${code}" đã tồn tại` }, { status: 409 });
  }

  const vehicle = await prisma.vehicle.create({
    data: { code, typeId, priceOverride, qrToken: code },
  });
  return NextResponse.json(vehicle);
}
