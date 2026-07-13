import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const drivers = await prisma.driver.findMany({
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(drivers);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const pin = typeof body?.pin === "string" ? body.pin : "";
  const role = typeof body?.role === "string" ? body.role : "driver";

  if (!name || !phone || pin.length < 4) {
    return NextResponse.json(
      { error: "Thiếu tên, số điện thoại hoặc mã PIN (tối thiểu 4 số)" },
      { status: 400 }
    );
  }

  const pinHash = await bcrypt.hash(pin, 10);
  const driver = await prisma.driver.create({
    data: { name, phone, pinHash, role },
    select: { id: true, name: true, phone: true, role: true, status: true },
  });
  return NextResponse.json(driver);
}
