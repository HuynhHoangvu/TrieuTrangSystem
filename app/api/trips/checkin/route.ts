import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { closeExpiredTrips, getSystemConfig } from "@/lib/trips";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const qrToken = typeof body?.qrToken === "string" ? body.qrToken.trim() : "";
  if (!qrToken) {
    return NextResponse.json({ error: "Thiếu mã QR xe" }, { status: 400 });
  }

  await closeExpiredTrips();

  const vehicle = await prisma.vehicle.findUnique({
    where: { qrToken },
    include: { type: true },
  });

  if (!vehicle) {
    return NextResponse.json({ error: "Không tìm thấy xe với mã QR này" }, { status: 404 });
  }
  if (vehicle.status !== "available") {
    return NextResponse.json({ error: "Xe hiện đang bảo trì, không thể nhận lượt" }, { status: 409 });
  }

  const activeTripOnVehicle = await prisma.trip.findFirst({
    where: { vehicleId: vehicle.id, status: "active" },
    orderBy: { checkInTime: "desc" },
  });

  // Loại xe "manual" (VD ô tô/Land Cruiser): không tính giờ, quét lần 2 trên
  // cùng xe nghĩa là khách trả xe -> chốt lượt đang chạy thay vì tạo lượt mới.
  if (vehicle.type.durationMode === "manual") {
    if (activeTripOnVehicle) {
      const returned = await prisma.trip.update({
        where: { id: activeTripOnVehicle.id },
        data: { status: "completed", checkOutTime: new Date() },
        include: { vehicle: { include: { type: true } } },
      });
      return NextResponse.json({ ...returned, action: "checkout" });
    }

    const amount = vehicle.priceOverride ?? vehicle.type.pricePerTrip;
    const trip = await prisma.trip.create({
      data: {
        vehicleId: vehicle.id,
        driverId: session.userId,
        checkInTime: new Date(),
        autoCheckoutAt: null,
        amount,
        status: "active",
      },
      include: { vehicle: { include: { type: true } } },
    });
    return NextResponse.json({ ...trip, action: "checkin" });
  }

  const config = await getSystemConfig();

  if (activeTripOnVehicle && !config.allowEarlyRescan) {
    return NextResponse.json(
      { error: "Xe đang trong một lượt chạy, chưa thể quét lại" },
      { status: 409 }
    );
  }

  const amount = vehicle.priceOverride ?? vehicle.type.pricePerTrip;
  const checkInTime = new Date();
  const autoCheckoutAt = new Date(checkInTime.getTime() + config.tripDurationMinutes * 60_000);

  const trip = await prisma.trip.create({
    data: {
      vehicleId: vehicle.id,
      driverId: session.userId,
      checkInTime,
      autoCheckoutAt,
      amount,
      status: "active",
    },
    include: { vehicle: { include: { type: true } } },
  });

  return NextResponse.json({ ...trip, action: "checkin" });
}
