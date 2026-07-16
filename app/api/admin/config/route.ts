import { NextRequest, NextResponse } from "next/server";
import { getSystemConfig } from "@/lib/trips";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const config = await getSystemConfig();
  return NextResponse.json(config);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};
  if (body?.tripDurationMinutes !== undefined) {
    const minutes = Number(body.tripDurationMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      return NextResponse.json({ error: "Thời lượng lượt không hợp lệ" }, { status: 400 });
    }
    data.tripDurationMinutes = minutes;
  }
  if (typeof body?.allowEarlyRescan === "boolean") {
    data.allowEarlyRescan = body.allowEarlyRescan;
  }
  if (body?.extendMinutes !== undefined) {
    const extendMinutes = Number(body.extendMinutes);
    if (!Number.isFinite(extendMinutes) || extendMinutes <= 0) {
      return NextResponse.json({ error: "Số phút cộng thêm không hợp lệ" }, { status: 400 });
    }
    data.extendMinutes = extendMinutes;
  }
  if (body?.bankId !== undefined) data.bankId = body.bankId || null;
  if (body?.bankAccountNumber !== undefined) data.bankAccountNumber = body.bankAccountNumber || null;
  if (body?.bankAccountName !== undefined) data.bankAccountName = body.bankAccountName || null;

  await getSystemConfig();
  const config = await prisma.systemConfig.update({ where: { id: "singleton" }, data });
  return NextResponse.json(config);
}
