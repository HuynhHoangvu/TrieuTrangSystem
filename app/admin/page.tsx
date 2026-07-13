"use client";

import { useEffect, useState } from "react";

interface DashboardData {
  range: string;
  totalTrips: number;
  totalAmount: number;
  cashAmount: number;
  transferAmount: number;
  byDriver: { driverId: string; name: string; trips: number; amount: number }[];
  byVehicle: { vehicleId: string; code: string; type: string; trips: number; amount: number }[];
}

function formatMoney(amount: number) {
  return amount.toLocaleString("vi-VN") + "đ";
}

const RANGES = [
  { value: "day", label: "Hôm nay" },
  { value: "week", label: "7 ngày qua" },
  { value: "month", label: "Tháng này" },
];

export default function AdminDashboardPage() {
  const [range, setRange] = useState("day");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/dashboard?range=${range}`)
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [range]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Doanh thu</h1>
        <div className="flex gap-1 rounded-md border border-border bg-white p-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`rounded px-3 py-1.5 text-sm ${
                range === r.value ? "bg-foreground text-white" : "hover:bg-hover"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading || !data ? (
        <p className="text-sm text-foreground/60">Đang tải...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Tổng lượt" value={String(data.totalTrips)} />
            <StatCard label="Tổng tiền" value={formatMoney(data.totalAmount)} />
            <StatCard label="Tiền mặt" value={formatMoney(data.cashAmount)} color="text-success" />
            <StatCard label="Chuyển khoản" value={formatMoney(data.transferAmount)} color="text-info" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-lg border border-border bg-white p-4">
              <h2 className="mb-3 font-medium">Theo tài xế</h2>
              {data.byDriver.length === 0 ? (
                <p className="text-sm text-foreground/60">Chưa có dữ liệu</p>
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  {data.byDriver.map((d) => (
                    <div key={d.driverId} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <span className="truncate">{d.name}</span>
                      <span className="shrink-0 text-foreground/60">{d.trips} lượt</span>
                      <span className="shrink-0 font-medium">{formatMoney(d.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-lg border border-border bg-white p-4">
              <h2 className="mb-3 font-medium">Theo xe</h2>
              {data.byVehicle.length === 0 ? (
                <p className="text-sm text-foreground/60">Chưa có dữ liệu</p>
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  {data.byVehicle.map((v) => (
                    <div key={v.vehicleId} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <span className="truncate">
                        {v.code} ({v.type})
                      </span>
                      <span className="shrink-0 text-foreground/60">{v.trips} lượt</span>
                      <span className="shrink-0 font-medium">{formatMoney(v.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <p className="text-sm text-foreground/60">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${color ?? ""}`}>{value}</p>
    </div>
  );
}
