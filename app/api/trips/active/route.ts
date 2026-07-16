import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { closeExpiredTrips } from "@/lib/trips";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  await closeExpiredTrips();

  const trips = await prisma.trip.findMany({
    where: { driverId: session.userId, status: "active" },
    include: {
      vehicle: { include: { type: true } },
      priceOption: { select: { id: true, label: true, allowExtend: true } },
    },
    orderBy: { checkInTime: "desc" },
  });

  return NextResponse.json(trips);
}
