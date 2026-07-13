import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { closeExpiredTrips } from "@/lib/trips";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  await closeExpiredTrips();

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const driverIdParam = searchParams.get("driverId");
  const vehicleId = searchParams.get("vehicleId");

  const where: Record<string, unknown> = {};

  // Non-admin roles only ever see their own trips.
  if (session.role === "admin" && driverIdParam) {
    where.driverId = driverIdParam;
  } else if (session.role !== "admin") {
    where.driverId = session.userId;
  }

  if (vehicleId) where.vehicleId = vehicleId;

  if (date) {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59.999`);
    where.checkInTime = { gte: start, lte: end };
  }

  const trips = await prisma.trip.findMany({
    where,
    include: {
      vehicle: { include: { type: true } },
      driver: { select: { id: true, name: true } },
    },
    orderBy: { checkInTime: "desc" },
  });

  return NextResponse.json(trips);
}
