import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const typeId = typeof body?.typeId === "string" ? body.typeId : "";
  const prefix = typeof body?.prefix === "string" ? body.prefix.trim().toUpperCase() : "";
  const count = Number(body?.count);
  const startIndex = Number(body?.startIndex ?? 1);
  const padLength = Number(body?.padLength ?? 3);

  if (!typeId || !prefix || !Number.isInteger(count) || count <= 0 || count > 500) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const type = await prisma.vehicleType.findUnique({ where: { id: typeId } });
  if (!type) {
    return NextResponse.json({ error: "Không tìm thấy loại xe" }, { status: 404 });
  }

  const codes = Array.from({ length: count }, (_, i) => {
    const n = startIndex + i;
    return `${prefix}-${String(n).padStart(padLength, "0")}`;
  });

  const existing = await prisma.vehicle.findMany({
    where: { code: { in: codes } },
    select: { code: true },
  });
  const existingCodes = new Set(existing.map((v) => v.code));
  const toCreate = codes.filter((c) => !existingCodes.has(c));

  if (toCreate.length > 0) {
    await prisma.vehicle.createMany({
      data: toCreate.map((code) => ({ code, typeId, qrToken: code })),
    });
  }

  return NextResponse.json({
    created: toCreate.length,
    skipped: codes.length - toCreate.length,
    codes: toCreate,
  });
}
