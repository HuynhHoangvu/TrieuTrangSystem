"use client";

import { useEffect, useState } from "react";
import CountdownTimer from "@/components/CountdownTimer";
import { updateClockOffsetFromResponse } from "@/lib/clockSync";

interface Trip {
  id: string;
  amount: number;
  status: string;
  paymentMethod: string | null;
  checkInTime: string;
  checkOutTime: string | null;
  autoCheckoutAt: string | null;
  driver: { id: string; name: string };
  vehicle: { code: string; type: { name: string } };
}

interface Driver {
  id: string;
  name: string;
}

interface Vehicle {
  id: string;
  code: string;
}

type PaymentMethod = "cash" | "transfer";

function formatMoney(amount: number) {
  return amount.toLocaleString("vi-VN") + "đ";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN");
}

function formatTimeOnly(iso: string) {
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function paymentLabel(method: string | null) {
  return method === "cash" ? "Tiền mặt" : method === "transfer" ? "Chuyển khoản" : "-";
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  active: { text: "Đang chạy", className: "text-active" },
  completed: { text: "Hoàn thành", className: "text-success" },
  cancelled: { text: "Đã huỷ", className: "text-disabled" },
};

export default function AdminTripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [dateFrom, setDateFrom] = useState(todayStr);
  const [dateTo, setDateTo] = useState(todayStr);
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [extendingTrip, setExtendingTrip] = useState<Trip | null>(null);
  const [extendLoading, setExtendLoading] = useState(false);

  async function loadTrips() {
    const params = new URLSearchParams();
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    if (driverId) params.set("driverId", driverId);
    if (vehicleId) params.set("vehicleId", vehicleId);
    const res = await fetch(`/api/trips?${params.toString()}`);
    updateClockOffsetFromResponse(res);
    setTrips(await res.json());
  }

  useEffect(() => {
    fetch("/api/admin/drivers")
      .then((r) => r.json())
      .then(setDrivers);
    fetch("/api/admin/vehicles")
      .then((r) => r.json())
      .then(setVehicles);
  }, []);

  useEffect(() => {
    loadTrips();
    const interval = setInterval(loadTrips, 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, driverId, vehicleId]);

  function startEdit(trip: Trip) {
    setEditingId(trip.id);
    setEditAmount(String(trip.amount));
    setEditPaymentMethod(trip.paymentMethod ?? "");
  }

  async function saveEdit(id: string) {
    await fetch(`/api/trips/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(editAmount),
        paymentMethod: editPaymentMethod || null,
      }),
    });
    setEditingId(null);
    loadTrips();
  }

  async function cancelTrip(id: string) {
    if (!confirm("Huỷ lượt chạy này?")) return;
    await fetch(`/api/trips/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    loadTrips();
  }

  async function deleteTrip(id: string) {
    if (!confirm("Xoá vĩnh viễn lượt chạy này? Không thể hoàn tác.")) return;
    await fetch(`/api/trips/${id}`, { method: "DELETE" });
    loadTrips();
  }

  async function confirmExtend(method?: PaymentMethod) {
    if (!extendingTrip) return;
    setExtendLoading(true);
    try {
      await fetch(`/api/trips/${extendingTrip.id}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes: 10, ...(method ? { paymentMethod: method } : {}) }),
      });
      setExtendingTrip(null);
      await loadTrips();
    } finally {
      setExtendLoading(false);
    }
  }

  const total = trips
    .filter((t) => t.status !== "cancelled")
    .reduce((sum, t) => sum + t.amount, 0);

  function EditFields({ trip }: { trip: Trip }) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={editAmount}
          onChange={(e) => setEditAmount(e.target.value)}
          type="number"
          className="rounded-md border border-border px-2 py-1.5 text-sm sm:w-28"
        />
        <select
          value={editPaymentMethod}
          onChange={(e) => setEditPaymentMethod(e.target.value)}
          className="rounded-md border border-border px-2 py-1.5 text-sm"
        >
          <option value="">-</option>
          <option value="cash">Tiền mặt</option>
          <option value="transfer">Chuyển khoản</option>
        </select>
        <div className="flex gap-3">
          <button onClick={() => saveEdit(trip.id)} className="text-sm text-success">
            Lưu
          </button>
          <button onClick={() => setEditingId(null)} className="text-sm text-foreground/60">
            Huỷ
          </button>
        </div>
      </div>
    );
  }

  function EndTimeCell({ trip }: { trip: Trip }) {
    if (trip.status === "active") {
      if (!trip.autoCheckoutAt) {
        return <span className="text-sm text-active">Thoải mái</span>;
      }
      return (
        <div className="flex items-center gap-2">
          <CountdownTimer autoCheckoutAt={trip.autoCheckoutAt} onExpire={loadTrips} />
          <button
            onClick={() => setExtendingTrip(trip)}
            className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-hover"
          >
            +10 phút
          </button>
        </div>
      );
    }
    return <span>{trip.checkOutTime ? formatTimeOnly(trip.checkOutTime) : "-"}</span>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Lượt chạy</h1>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-foreground/60">Từ ngày</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-md border border-border px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-foreground/60">Đến ngày</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-md border border-border px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <select
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            className="rounded-md border border-border px-3 py-2 text-sm"
          >
            <option value="">Tất cả tài xế</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            className="rounded-md border border-border px-3 py-2 text-sm"
          >
            <option value="">Tất cả xe</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.code}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className="rounded-lg border border-border bg-white p-4">
        {/* Mobile: cards (ưu tiên chính) */}
        <div className="flex flex-col gap-3 md:hidden">
          {trips.map((t) => {
            const status = STATUS_LABEL[t.status] ?? STATUS_LABEL.active;
            const isEditing = editingId === t.id;
            return (
              <div key={t.id} className="rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {t.vehicle.code} <span className="text-foreground/60">({t.vehicle.type.name})</span>
                    </p>
                    <p className="text-sm text-foreground/60">{t.driver.name}</p>
                  </div>
                  <span className={`text-sm ${status.className}`}>{status.text}</span>
                </div>
                <p className="mt-1 text-sm text-foreground/60">{formatDate(t.checkInTime)}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="text-foreground/60">
                    Bắt đầu <span className="text-foreground">{formatTimeOnly(t.checkInTime)}</span>
                  </span>
                  <span className="flex items-center gap-1 text-foreground/60">
                    Kết thúc <EndTimeCell trip={t} />
                  </span>
                </div>

                {isEditing ? (
                  <div className="mt-2">
                    <EditFields trip={t} />
                  </div>
                ) : (
                  <>
                    <p className="mt-1 text-sm">
                      {formatMoney(t.amount)} · {paymentLabel(t.paymentMethod)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-4">
                      <button onClick={() => startEdit(t)} className="text-sm text-info">
                        Sửa
                      </button>
                      {t.status !== "cancelled" && (
                        <button onClick={() => cancelTrip(t.id)} className="text-sm text-red-600">
                          Huỷ lượt
                        </button>
                      )}
                      <button onClick={() => deleteTrip(t.id)} className="text-sm text-red-600">
                        Xoá
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
          {trips.length === 0 && (
            <p className="py-4 text-center text-sm text-foreground/60">Không có lượt chạy nào</p>
          )}
        </div>

        {/* Desktop: table */}
        <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-foreground/60">
              <th className="pb-2">Xe</th>
              <th className="pb-2">Tài xế</th>
              <th className="pb-2">Ngày</th>
              <th className="pb-2">Giờ bắt đầu</th>
              <th className="pb-2">Giờ kết thúc</th>
              <th className="pb-2">Giá</th>
              <th className="pb-2">Thanh toán</th>
              <th className="pb-2">Trạng thái</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {trips.map((t) => {
              const status = STATUS_LABEL[t.status] ?? STATUS_LABEL.active;
              const isEditing = editingId === t.id;
              return (
                <tr key={t.id} className="border-t border-border align-top">
                  <td className="py-2">
                    {t.vehicle.code} ({t.vehicle.type.name})
                  </td>
                  <td className="py-2">{t.driver.name}</td>
                  <td className="py-2">{formatDate(t.checkInTime)}</td>
                  <td className="py-2">{formatTimeOnly(t.checkInTime)}</td>
                  <td className="py-2">
                    <EndTimeCell trip={t} />
                  </td>
                  <td className="py-2">
                    {isEditing ? (
                      <input
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        type="number"
                        className="w-28 rounded-md border border-border px-2 py-1 text-sm"
                      />
                    ) : (
                      formatMoney(t.amount)
                    )}
                  </td>
                  <td className="py-2">
                    {isEditing ? (
                      <select
                        value={editPaymentMethod}
                        onChange={(e) => setEditPaymentMethod(e.target.value)}
                        className="rounded-md border border-border px-2 py-1 text-sm"
                      >
                        <option value="">-</option>
                        <option value="cash">Tiền mặt</option>
                        <option value="transfer">Chuyển khoản</option>
                      </select>
                    ) : (
                      paymentLabel(t.paymentMethod)
                    )}
                  </td>
                  <td className={`py-2 ${status.className}`}>{status.text}</td>
                  <td className="py-2 text-right">
                    {isEditing ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => saveEdit(t.id)}
                          className="text-sm text-success hover:underline"
                        >
                          Lưu
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-sm text-foreground/60 hover:underline"
                        >
                          Huỷ
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => startEdit(t)}
                          className="text-sm text-info hover:underline"
                        >
                          Sửa
                        </button>
                        {t.status !== "cancelled" && (
                          <button
                            onClick={() => cancelTrip(t.id)}
                            className="text-sm text-red-600 hover:underline"
                          >
                            Huỷ lượt
                          </button>
                        )}
                        <button
                          onClick={() => deleteTrip(t.id)}
                          className="text-sm text-red-600 hover:underline"
                        >
                          Xoá
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {trips.length === 0 && (
          <p className="py-4 text-center text-sm text-foreground/60">Không có lượt chạy nào</p>
        )}
        </div>
        <p className="mt-4 border-t border-border pt-3 text-right font-medium">
          Tổng: {formatMoney(total)}
        </p>
      </section>

      {extendingTrip && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !extendLoading && setExtendingTrip(null)}
        >
          <div
            className="w-full max-w-xs rounded-lg bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-1 text-lg font-semibold">Cộng thêm 10 phút</h3>
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
    </div>
  );
}
