import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const pin = typeof body?.pin === "string" ? body.pin : "";

  if (!phone || !pin) {
    return NextResponse.json({ error: "Thiếu số điện thoại hoặc mã PIN" }, { status: 400 });
  }

  const driver = await prisma.driver.findUnique({ where: { phone } });

  if (!driver || driver.status !== "active") {
    return NextResponse.json({ error: "Tài khoản không tồn tại hoặc đã bị khoá" }, { status: 401 });
  }

  const valid = await bcrypt.compare(pin, driver.pinHash);
  if (!valid) {
    return NextResponse.json({ error: "Số điện thoại hoặc mã PIN không đúng" }, { status: 401 });
  }

  const session = await getSession();
  session.userId = driver.id;
  session.role = driver.role as "admin" | "driver" | "receptionist";
  session.name = driver.name;
  await session.save();

  return NextResponse.json({ id: driver.id, name: driver.name, role: driver.role });
}
