import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { closeExpiredTrips } from "@/lib/trips";

function getRangeStart(range: string) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (range === "week") {
    start.setDate(start.getDate() - 6);
  } else if (range === "month") {
    start.setDate(1);
  }
  return start;
}

export async function GET(req: NextRequest) {
  await closeExpiredTrips();

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "day";
  const start = getRangeStart(range);

  const trips = await prisma.trip.findMany({
    where: {
      checkInTime: { gte: start },
      status: { in: ["completed", "active"] },
    },
    include: {
      driver: { select: { id: true, name: true } },
      vehicle: { select: { id: true, code: true, type: { select: { name: true } } } },
    },
  });

  const totalTrips = trips.length;
  const totalAmount = trips.reduce((sum, t) => sum + t.amount, 0);
  const cashAmount = trips
    .filter((t) => t.paymentMethod === "cash")
    .reduce((sum, t) => sum + t.amount, 0);
  const transferAmount = trips
    .filter((t) => t.paymentMethod === "transfer")
    .reduce((sum, t) => sum + t.amount, 0);

  const byDriverMap = new Map<string, { driverId: string; name: string; trips: number; amount: number }>();
  const byVehicleMap = new Map<
    string,
    { vehicleId: string; code: string; type: string; trips: number; amount: number }
  >();

  for (const t of trips) {
    const d = byDriverMap.get(t.driver.id) ?? {
      driverId: t.driver.id,
      name: t.driver.name,
      trips: 0,
      amount: 0,
    };
    d.trips += 1;
    d.amount += t.amount;
    byDriverMap.set(t.driver.id, d);

    const v = byVehicleMap.get(t.vehicle.id) ?? {
      vehicleId: t.vehicle.id,
      code: t.vehicle.code,
      type: t.vehicle.type.name,
      trips: 0,
      amount: 0,
    };
    v.trips += 1;
    v.amount += t.amount;
    byVehicleMap.set(t.vehicle.id, v);
  }

  return NextResponse.json({
    range,
    totalTrips,
    totalAmount,
    cashAmount,
    transferAmount,
    byDriver: [...byDriverMap.values()].sort((a, b) => b.amount - a.amount),
    byVehicle: [...byVehicleMap.values()].sort((a, b) => b.amount - a.amount),
  });
}
