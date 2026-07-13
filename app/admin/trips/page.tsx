"use client";

import { useEffect, useState } from "react";

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

function formatMoney(amount: number) {
  return amount.toLocaleString("vi-VN") + "đ";
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("vi-VN");
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
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");

  async function loadTrips() {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (driverId) params.set("driverId", driverId);
    if (vehicleId) params.set("vehicleId", vehicleId);
    const res = await fetch(`/api/trips?${params.toString()}`);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, driverId, vehicleId]);

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

  const total = trips
    .filter((t) => t.status !== "cancelled")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Lượt chạy</h1>

      <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-white p-4">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-border px-3 py-2 text-sm"
        />
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

      <section className="rounded-lg border border-border bg-white p-4">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-foreground/60">
              <th className="pb-2">Xe</th>
              <th className="pb-2">Tài xế</th>
              <th className="pb-2">Giờ vào</th>
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
                  <td className="py-2">{formatDateTime(t.checkInTime)}</td>
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
                    ) : t.paymentMethod === "cash" ? (
                      "Tiền mặt"
                    ) : t.paymentMethod === "transfer" ? (
                      "Chuyển khoản"
                    ) : (
                      "-"
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
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        {trips.length === 0 && (
          <p className="py-4 text-center text-sm text-foreground/60">Không có lượt chạy nào</p>
        )}
        <p className="mt-4 border-t border-border pt-3 text-right font-medium">
          Tổng: {formatMoney(total)}
        </p>
      </section>
    </div>
  );
}
