import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getSystemConfig } from "@/lib/trips";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const minutes = Number(body?.minutes);
  const paymentMethod =
    body?.paymentMethod === "cash" || body?.paymentMethod === "transfer" ? body.paymentMethod : undefined;

  if (!Number.isFinite(minutes) || minutes <= 0) {
    return NextResponse.json({ error: "Số phút không hợp lệ" }, { status: 400 });
  }

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: { vehicle: { include: { type: { include: { passengerPrices: true } } } } },
  });
  if (!trip) {
    return NextResponse.json({ error: "Không tìm thấy lượt chạy" }, { status: 404 });
  }
  if (session.role !== "admin" && trip.driverId !== session.userId) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }
  if (trip.status !== "active" || !trip.autoCheckoutAt) {
    return NextResponse.json(
      { error: "Chỉ có thể cộng thêm giờ cho lượt đang chạy theo giờ" },
      { status: 409 }
    );
  }

  const config = await getSystemConfig();

  // Xe tính giá theo số người (VD ATV): phải dùng đúng bậc giá theo số
  // người của lượt này (VD đi 1 người thì lấy giá 1 người), không phải
  // giá cơ bản/dự phòng chung của loại xe.
  let basePrice: number;
  if (trip.vehicle.type.pricingMode === "passengers" && trip.vehicle.priceOverride === null) {
    const tier = trip.vehicle.type.passengerPrices.find((t) => t.passengers === trip.passengers);
    if (!tier) {
      return NextResponse.json(
        { error: "Không xác định được giá theo số người cho lượt này" },
        { status: 409 }
      );
    }
    basePrice = tier.price;
  } else {
    basePrice = trip.vehicle.priceOverride ?? trip.vehicle.type.pricePerTrip;
  }

  const extraAmount = Math.round((basePrice / config.tripDurationMinutes) * minutes);
  const newAutoCheckoutAt = new Date(trip.autoCheckoutAt.getTime() + minutes * 60_000);

  const updated = await prisma.trip.update({
    where: { id },
    data: {
      autoCheckoutAt: newAutoCheckoutAt,
      amount: trip.amount + extraAmount,
      ...(paymentMethod ? { paymentMethod } : {}),
    },
    include: { vehicle: { include: { type: true } }, driver: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ ...updated, extraAmount });
}
