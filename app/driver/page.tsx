"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QrScanner from "@/components/QrScanner";
import CountdownTimer from "@/components/CountdownTimer";

interface Trip {
  id: string;
  amount: number;
  status: string;
  paymentMethod: string | null;
  checkInTime: string;
  autoCheckoutAt: string | null;
  vehicle: { code: string; type: { name: string } };
}

type PaymentMethod = "cash" | "transfer";

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
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [activeRes, todayRes] = await Promise.all([
      fetch("/api/trips/active"),
      fetch(`/api/trips?date=${today}`),
    ]);
    if (activeRes.ok) setActiveTrips(await activeRes.json());
    if (todayRes.ok) setTodayTrips(await todayRes.json());
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setDriverName(data.name));
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  async function checkin(qrToken: string, method: PaymentMethod) {
    if (!qrToken) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/trips/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken, paymentMethod: method }),
      });
      const data = await res.json();
      if (!res.ok) {
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
      await loadData();
    } catch {
      setMessage({ type: "error", text: "Có lỗi xảy ra, vui lòng thử lại" });
    } finally {
      setLoading(false);
    }
  }

  // Nếu tài xế đã chọn sẵn hình thức thanh toán (chọn nhanh) thì check-in ngay.
  // Nếu chưa chọn, mở modal bắt buộc chọn trước khi hoàn tất.
  function handleToken(qrToken: string) {
    if (!qrToken) return;
    if (paymentMethod) {
      checkin(qrToken, paymentMethod);
    } else {
      setPendingToken(qrToken);
    }
  }

  function confirmPendingPayment(method: PaymentMethod) {
    setPaymentMethod(method);
    if (pendingToken) {
      checkin(pendingToken, method);
    }
    setPendingToken(null);
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
              <li key={trip.id} className="flex items-center justify-between rounded-md bg-hover px-3 py-2">
                <div>
                  <p className="font-medium">
                    Xe {trip.vehicle.code} · {trip.vehicle.type.name}
                  </p>
                  <p className="text-sm text-foreground/60">{formatMoney(trip.amount)}</p>
                </div>
                {trip.autoCheckoutAt ? (
                  <CountdownTimer autoCheckoutAt={trip.autoCheckoutAt} onExpire={loadData} />
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
    </main>
  );
}
