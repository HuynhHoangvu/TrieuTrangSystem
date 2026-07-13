import { prisma } from "@/lib/prisma";

export async function closeExpiredTrips() {
  const now = new Date();
  await prisma.trip.updateMany({
    where: { status: "active", autoCheckoutAt: { lte: now } },
    data: { status: "completed", checkOutTime: now },
  });
}

export async function getVehiclePrice(vehicleId: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { type: true },
  });
  if (!vehicle) return null;
  return vehicle.priceOverride ?? vehicle.type.pricePerTrip;
}

export async function getSystemConfig() {
  const config = await prisma.systemConfig.findUnique({ where: { id: "singleton" } });
  if (config) return config;
  return prisma.systemConfig.create({
    data: { id: "singleton", tripDurationMinutes: 20, allowEarlyRescan: true },
  });
}
