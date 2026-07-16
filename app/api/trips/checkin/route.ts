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
  const paymentMethod =
    body?.paymentMethod === "cash" || body?.paymentMethod === "transfer" ? body.paymentMethod : null;
  const passengers =
    body?.passengers !== undefined && body?.passengers !== null && body.passengers !== ""
      ? Number(body.passengers)
      : null;

  await closeExpiredTrips();

  const vehicle = await prisma.vehicle.findUnique({
    where: { qrToken },
    include: { type: { include: { priceOptions: true } } },
  });

  if (!vehicle) {
    return NextResponse.json({ error: "Không tìm thấy xe với mã QR này" }, { status: 404 });
  }
  if (vehicle.status !== "available") {
    return NextResponse.json({ error: "Xe hiện đang bảo trì, không thể nhận lượt" }, { status: 409 });
  }

  // Xe nhiều mức giá tuỳ chọn (VD ATV): nếu tài xế không chọn số người thì
  // mặc định dùng mức "khách vãng lai" (mức không gắn số người cụ thể).
  // Nếu chọn 1/2 người thì dùng đúng mức giá khách quen tương ứng.
  let amount: number;
  let priceOptionId: string | null = null;
  if (vehicle.type.pricingMode === "passengers" && vehicle.priceOverride === null) {
    const option =
      passengers !== null
        ? vehicle.type.priceOptions.find((o) => o.passengers === passengers)
        : vehicle.type.priceOptions.find((o) => o.passengers === null);

    if (!option) {
      return NextResponse.json(
        {
          error:
            passengers !== null
              ? "Số người không hợp lệ cho loại xe này"
              : "Chưa cấu hình mức giá khách vãng lai cho loại xe này",
          needPassengers: true,
          tiers: vehicle.type.priceOptions
            .slice()
            .sort((a, b) => (a.passengers ?? -1) - (b.passengers ?? -1))
            .map((t) => ({ id: t.id, label: t.label, passengers: t.passengers, price: t.price })),
        },
        { status: 422 }
      );
    }
    amount = option.price;
    priceOptionId = option.id;
  } else {
    amount = vehicle.priceOverride ?? vehicle.type.pricePerTrip;
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

    const trip = await prisma.trip.create({
      data: {
        vehicleId: vehicle.id,
        driverId: session.userId,
        checkInTime: new Date(),
        autoCheckoutAt: null,
        amount,
        status: "active",
        paymentMethod,
        passengers,
        priceOptionId,
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
      paymentMethod,
      passengers,
      priceOptionId,
    },
    include: { vehicle: { include: { type: true } } },
  });

  return NextResponse.json({ ...trip, action: "checkin" });
}
