import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const types = await prisma.vehicleType.findMany({
    include: {
      _count: { select: { vehicles: true } },
      priceOptions: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(types);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const pricePerTrip = Number(body?.pricePerTrip);
  const durationMode = body?.durationMode === "manual" ? "manual" : "timed";
  const pricingMode = body?.pricingMode === "passengers" ? "passengers" : "flat";

  if (!name || !Number.isFinite(pricePerTrip) || pricePerTrip <= 0) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const existing = await prisma.vehicleType.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: `Loại xe "${name}" đã tồn tại` }, { status: 409 });
  }

  const type = await prisma.vehicleType.create({
    data: { name, pricePerTrip, durationMode, pricingMode },
  });
  return NextResponse.json(type);
}
