"use client";

import { useEffect, useState } from "react";

export default function AdminConfigPage() {
  const [tripDurationMinutes, setTripDurationMinutes] = useState(20);
  const [allowEarlyRescan, setAllowEarlyRescan] = useState(true);
  const [extendMinutes, setExtendMinutes] = useState(10);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/config")
      .then((res) => res.json())
      .then((data) => {
        setTripDurationMinutes(data.tripDurationMinutes);
        setAllowEarlyRescan(data.allowEarlyRescan);
        setExtendMinutes(data.extendMinutes ?? 10);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripDurationMinutes, allowEarlyRescan, extendMinutes }),
    });
    setSaved(true);
  }

  if (loading) return <p className="text-sm text-foreground/60">Đang tải...</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Cấu hình hệ thống</h1>

      <form
        onSubmit={handleSubmit}
        className="max-w-md rounded-lg border border-border bg-white p-4"
      >
        <label className="mb-1 block text-sm font-medium">Thời lượng mỗi lượt (phút)</label>
        <input
          type="number"
          min={1}
          value={tripDurationMinutes}
          onChange={(e) => setTripDurationMinutes(Number(e.target.value))}
          className="mb-4 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-info"
        />

        <label className="mb-1 block text-sm font-medium">
          Số phút cộng thêm mỗi lần bấm &quot;+X phút&quot;
        </label>
        <input
          type="number"
          min={1}
          value={extendMinutes}
          onChange={(e) => setExtendMinutes(Number(e.target.value))}
          className="mb-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-info"
        />
        <p className="mb-4 text-xs text-foreground/60">
          Tiền cộng thêm tự tính theo tỉ lệ giá xe / thời lượng mỗi lượt, không cần cấu hình riêng.
        </p>

        <label className="mb-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allowEarlyRescan}
            onChange={(e) => setAllowEarlyRescan(e.target.checked)}
          />
          Cho phép quét lại xe khi lượt trước vẫn đang chạy (tạo lượt mới cộng dồn)
        </label>

        <button className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          Lưu cấu hình
        </button>

        {saved && <p className="mt-2 text-sm text-success">Đã lưu cấu hình</p>}
      </form>
    </div>
  );
}
