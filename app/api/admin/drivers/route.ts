import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
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
  const role = typeof body?.role === "string" ? body.role : "driver";

  if (!name || !phone) {
    return NextResponse.json({ error: "Thiếu tên hoặc số điện thoại" }, { status: 400 });
  }

  const existing = await prisma.driver.findUnique({ where: { phone } });
  if (existing) {
    return NextResponse.json({ error: `Số điện thoại "${phone}" đã được đăng ký` }, { status: 409 });
  }

  // Đăng nhập chỉ dùng số điện thoại, không cần PIN — lưu một giá trị ngẫu
  // nhiên vì cột pinHash trong schema vẫn yêu cầu NOT NULL.
  const pinHash = await bcrypt.hash(crypto.randomUUID(), 10);
  const driver = await prisma.driver.create({
    data: { name, phone, pinHash, role },
    select: { id: true, name: true, phone: true, role: true, status: true },
  });
  return NextResponse.json(driver);
}
