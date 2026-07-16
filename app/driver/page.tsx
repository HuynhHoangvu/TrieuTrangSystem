"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QrScanner from "@/components/QrScanner";
import CountdownTimer from "@/components/CountdownTimer";
import { updateClockOffsetFromResponse } from "@/lib/clockSync";

interface Trip {
  id: string;
  amount: number;
  status: string;
  paymentMethod: string | null;
  checkInTime: string;
  autoCheckoutAt: string | null;
  passengers: number | null;
  priceOption: { id: string; label: string; allowExtend: boolean } | null;
  vehicle: { code: string; type: { name: string } };
}

type PaymentMethod = "cash" | "transfer";

interface PassengerTier {
  id: string;
  label: string;
  passengers: number | null;
  price: number;
}

interface PassengerPrompt {
  qrToken: string;
  method: PaymentMethod;
  tiers: PassengerTier[];
}

function paymentLabel(method: string | null) {
  return method === "cash" ? "Tiền mặt" : method === "transfer" ? "Chuyển khoản" : "-";
}

function formatMoney(amount: number) {
  return amount.toLocaleString("vi-VN") + "đ";
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export default function DriverPage() {
  const router = useRouter();
  const [driverName, setDriverName] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [activeTrips, setActiveTrips] = useState<Trip[]>([]);
  const [todayTrips, setTodayTrips] = useState<Trip[]>([]);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [passengerCount, setPassengerCount] = useState<number | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [extendingTrip, setExtendingTrip] = useState<Trip | null>(null);
  const [extendLoading, setExtendLoading] = useState(false);
  const [passengerPrompt, setPassengerPrompt] = useState<PassengerPrompt | null>(null);
  const [extendMinutes, setExtendMinutes] = useState(10);

  const loadData = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [activeRes, todayRes] = await Promise.all([
      fetch("/api/trips/active"),
      fetch(`/api/trips?date=${today}`),
    ]);
    updateClockOffsetFromResponse(activeRes);
    if (activeRes.ok) setActiveTrips(await activeRes.json());
    if (todayRes.ok) setTodayTrips(await todayRes.json());
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setDriverName(data.name));
    fetch("/api/config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setExtendMinutes(data.extendMinutes ?? 10));
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  async function checkin(qrToken: string, method: PaymentMethod, passengers?: number | null) {
    if (!qrToken) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/trips/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken, paymentMethod: method, passengers }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.needPassengers) {
          setPassengerPrompt({ qrToken, method, tiers: data.tiers ?? [] });
          return;
        }
        setMessage({ type: "error", text: data.error ?? "Quét thất bại" });
        return;
      }
      setMessage(
        data.action === "checkout"
          ? { type: "success", text: `Đã trả xe ${data.vehicle.code} - ${formatMoney(data.amount)}` }
          : {
              type: "success",
              text: `Đã nhận xe ${data.vehicle.code} - ${formatMoney(data.amount)} (${paymentLabel(method)})`,
            }
      );
      setScanning(false);
      setManualToken("");
      setPassengerPrompt(null);
      await loadData();
    } catch {
      setMessage({ type: "error", text: "Có lỗi xảy ra, vui lòng thử lại" });
    } finally {
      setLoading(false);
    }
  }

  function selectPassengers(tier: PassengerTier) {
    if (!passengerPrompt) return;
    checkin(passengerPrompt.qrToken, passengerPrompt.method, tier.passengers);
  }

  // Nếu tài xế đã chọn sẵn hình thức thanh toán (chọn nhanh) thì check-in ngay
  // kèm số người đã chọn (nếu có). Không chọn số người = mặc định khách vãng
  // lai (giá cố định). Nếu chưa chọn thanh toán, mở modal bắt buộc chọn trước
  // khi hoàn tất. Nếu xe cần chọn rõ mức giá, server sẽ báo lại và modal chọn
  // giá sẽ tự hiện ra.
  function handleToken(qrToken: string) {
    if (!qrToken) return;
    if (paymentMethod) {
      checkin(qrToken, paymentMethod, passengerCount);
    } else {
      setPendingToken(qrToken);
    }
  }

  function confirmPendingPayment(method: PaymentMethod) {
    setPaymentMethod(method);
    if (pendingToken) {
      checkin(pendingToken, method, passengerCount);
    }
    setPendingToken(null);
  }

  async function confirmExtend(method?: PaymentMethod) {
    if (!extendingTrip) return;
    setExtendLoading(true);
    try {
      await fetch(`/api/trips/${extendingTrip.id}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes: extendMinutes, ...(method ? { paymentMethod: method } : {}) }),
      });
      setExtendingTrip(null);
      await loadData();
    } finally {
      setExtendLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const todayTotal = todayTrips.reduce((sum, t) => sum + t.amount, 0);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Xin chào, {driverName || "..."}</h1>
          <p className="text-sm text-foreground/60">Tài xế</p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-hover"
        >
          Đăng xuất
        </button>
      </header>

      <section className="rounded-lg border border-border bg-white p-4">
        <h2 className="mb-3 font-medium">Lấy xe</h2>

        <div className="mb-3">
          <p className="mb-1.5 text-sm text-foreground/60">
            Khách trả bằng (chọn trước cho nhanh, có thể bỏ qua):
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPaymentMethod(paymentMethod === "cash" ? null : "cash")}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
                paymentMethod === "cash"
                  ? "border-success bg-success text-white"
                  : "border-border hover:bg-hover"
              }`}
            >
              Tiền mặt
            </button>
            <button
              onClick={() => setPaymentMethod(paymentMethod === "transfer" ? null : "transfer")}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
                paymentMethod === "transfer"
                  ? "border-info bg-info text-white"
                  : "border-border hover:bg-hover"
              }`}
            >
              Chuyển khoản
            </button>
          </div>
        </div>

        <div className="mb-3">
          <p className="mb-1.5 text-sm text-foreground/60">
            Số người (chỉ áp dụng cho xe tính theo số người, VD ATV) — để trống nếu là khách vãng lai:
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPassengerCount(passengerCount === 1 ? null : 1)}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
                passengerCount === 1
                  ? "border-foreground bg-foreground text-white"
                  : "border-border hover:bg-hover"
              }`}
            >
              1 người
            </button>
            <button
              onClick={() => setPassengerCount(passengerCount === 2 ? null : 2)}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
                passengerCount === 2
                  ? "border-foreground bg-foreground text-white"
                  : "border-border hover:bg-hover"
              }`}
            >
              2 người
            </button>
          </div>
        </div>

        {!scanning ? (
          <button
            onClick={() => setScanning(true)}
            className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Quét QR xe
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <QrScanner active={scanning} onScan={handleToken} />
            <button
              onClick={() => setScanning(false)}
              className="w-full rounded-md border border-border px-4 py-2 text-sm hover:bg-hover"
            >
              Huỷ quét
            </button>
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <input
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            placeholder="Nhập mã xe (VD: VH-017)"
            className="flex-1 rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-info"
          />
          <button
            onClick={() => handleToken(manualToken)}
            disabled={loading}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-hover disabled:opacity-50"
          >
            Xác nhận
          </button>
        </div>

        {message && (
          <p className={`mt-3 text-sm ${message.type === "error" ? "text-red-600" : "text-success"}`}>
            {message.text}
          </p>
        )}
      </section>

      {activeTrips.length > 0 && (
        <section className="rounded-lg border border-border bg-white p-4">
          <h2 className="mb-3 font-medium">Đang chạy</h2>
          <ul className="flex flex-col gap-3">
            {activeTrips.map((trip) => (
              <li key={trip.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-hover px-3 py-2">
                <div>
                  <p className="font-medium">
                    Xe {trip.vehicle.code} · {trip.vehicle.type.name}
                  </p>
                  <p className="text-sm text-foreground/60">{formatMoney(trip.amount)}</p>
                </div>
                {trip.autoCheckoutAt ? (
                  <div className="flex items-center gap-2">
                    <CountdownTimer autoCheckoutAt={trip.autoCheckoutAt} onExpire={loadData} />
                    {(!trip.priceOption || trip.priceOption.allowExtend) && (
                      <button
                        onClick={() => setExtendingTrip(trip)}
                        className="rounded-md border border-border bg-white px-2 py-1 text-xs font-medium hover:bg-hover"
                      >
                        +{extendMinutes} phút
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-active">Thoải mái · quét lại để trả xe</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-lg border border-border bg-white p-4">
        <h2 className="mb-3 font-medium">Các lượt hôm nay</h2>
        {todayTrips.length === 0 ? (
          <p className="text-sm text-foreground/60">Chưa có lượt nào</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {todayTrips.map((trip, idx) => (
              <li key={trip.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">
                    {idx + 1}. Xe {trip.vehicle.code} | {formatTime(trip.checkInTime)}
                  </p>
                  <p className="text-sm text-foreground/60">
                    {formatMoney(trip.amount)} · {paymentLabel(trip.paymentMethod)}
                    {trip.priceOption ? ` · ${trip.priceOption.label}` : ""}
                  </p>
                </div>
                <span
                  className={
                    trip.status === "completed"
                      ? "text-sm text-success"
                      : trip.status === "cancelled"
                      ? "text-sm text-disabled"
                      : "text-sm text-active"
                  }
                >
                  {trip.status === "completed"
                    ? "✓ Hoàn thành"
                    : trip.status === "cancelled"
                    ? "Đã huỷ"
                    : "⏱ Đang chạy"}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 border-t border-border pt-3 text-right font-medium">
          Tổng hôm nay: {formatMoney(todayTotal)}
        </p>
      </section>

      {pendingToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xs rounded-lg bg-white p-6">
            <h3 className="mb-1 text-lg font-semibold">Khách trả bằng gì?</h3>
            <p className="mb-4 text-sm text-foreground/60">Chọn hình thức thanh toán để hoàn tất nhận xe.</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => confirmPendingPayment("cash")}
                className="rounded-md bg-success px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
              >
                Tiền mặt
              </button>
              <button
                onClick={() => confirmPendingPayment("transfer")}
                className="rounded-md bg-info px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
              >
                Chuyển khoản
              </button>
              <button
                onClick={() => setPendingToken(null)}
                className="mt-1 rounded-md border border-border px-4 py-2 text-sm hover:bg-hover"
              >
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}

      {passengerPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xs rounded-lg bg-white p-6">
            <h3 className="mb-1 text-lg font-semibold">Chọn mức giá</h3>
            <p className="mb-4 text-sm text-foreground/60">Chọn đúng mức giá áp dụng cho khách này.</p>
            <div className="flex flex-col gap-2">
              {passengerPrompt.tiers.length === 0 ? (
                <p className="text-sm text-red-600">Loại xe này chưa được thiết lập mức giá.</p>
              ) : (
                passengerPrompt.tiers.map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => selectPassengers(tier)}
                    disabled={loading}
                    className="flex items-center justify-between rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <span>{tier.label}</span>
                    <span>{formatMoney(tier.price)}</span>
                  </button>
                ))
              )}
              <button
                onClick={() => setPassengerPrompt(null)}
                disabled={loading}
                className="mt-1 rounded-md border border-border px-4 py-2 text-sm hover:bg-hover disabled:opacity-50"
              >
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}

      {extendingTrip && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !extendLoading && setExtendingTrip(null)}
        >
          <div className="w-full max-w-xs rounded-lg bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-lg font-semibold">Cộng thêm {extendMinutes} phút</h3>
            <p className="mb-4 text-sm text-foreground/60">
              Xe {extendingTrip.vehicle.code} — khách trả thêm tiền bằng gì?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => confirmExtend("cash")}
                disabled={extendLoading}
                className="rounded-md bg-success px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                Tiền mặt
              </button>
              <button
                onClick={() => confirmExtend("transfer")}
                disabled={extendLoading}
                className="rounded-md bg-info px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                Chuyển khoản
              </button>
              <button
                onClick={() => confirmExtend()}
                disabled={extendLoading}
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-hover disabled:opacity-50"
              >
                Giữ nguyên phương thức đã chọn
              </button>
              <button
                onClick={() => setExtendingTrip(null)}
                disabled={extendLoading}
                className="mt-1 text-sm text-foreground/60"
              >
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
