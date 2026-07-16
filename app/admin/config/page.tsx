"use client";

import { useEffect, useState } from "react";

const COMMON_BANKS = [
  { code: "MB", name: "MB Bank" },
  { code: "VCB", name: "Vietcombank" },
  { code: "TCB", name: "Techcombank" },
  { code: "ACB", name: "ACB" },
  { code: "VPB", name: "VPBank" },
  { code: "BIDV", name: "BIDV" },
  { code: "ICB", name: "VietinBank" },
  { code: "STB", name: "Sacombank" },
  { code: "TPB", name: "TPBank" },
  { code: "VIB", name: "VIB" },
];

export default function AdminConfigPage() {
  const [tripDurationMinutes, setTripDurationMinutes] = useState(20);
  const [allowEarlyRescan, setAllowEarlyRescan] = useState(true);
  const [extendMinutes, setExtendMinutes] = useState(10);
  const [bankId, setBankId] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/config")
      .then((res) => res.json())
      .then((data) => {
        setTripDurationMinutes(data.tripDurationMinutes);
        setAllowEarlyRescan(data.allowEarlyRescan);
        setExtendMinutes(data.extendMinutes ?? 10);
        setBankId(data.bankId ?? "");
        setBankAccountNumber(data.bankAccountNumber ?? "");
        setBankAccountName(data.bankAccountName ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function saveConfig() {
    setSaved(false);
    await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tripDurationMinutes,
        allowEarlyRescan,
        extendMinutes,
        bankId,
        bankAccountNumber,
        bankAccountName,
      }),
    });
    setSaved(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveConfig();
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

      <div className="max-w-md rounded-lg border border-border bg-white p-4">
        <h2 className="mb-1 font-medium">Tài khoản ngân hàng nhận chuyển khoản</h2>
        <p className="mb-4 text-sm text-foreground/60">
          Dùng để tự sinh mã VietQR đúng số tiền cho khách khi tài xế chọn &quot;Chuyển khoản&quot;.
        </p>

        <label className="mb-1 block text-sm font-medium">Ngân hàng</label>
        <select
          value={bankId}
          onChange={(e) => setBankId(e.target.value)}
          className="mb-4 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-info"
        >
          <option value="">-- Chọn ngân hàng --</option>
          {COMMON_BANKS.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-sm font-medium">Số tài khoản</label>
        <input
          value={bankAccountNumber}
          onChange={(e) => setBankAccountNumber(e.target.value)}
          placeholder="VD: 0973233237"
          className="mb-4 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-info"
        />

        <label className="mb-1 block text-sm font-medium">Tên chủ tài khoản</label>
        <input
          value={bankAccountName}
          onChange={(e) => setBankAccountName(e.target.value)}
          placeholder="VD: NGUYEN VAN A"
          className="mb-4 w-full rounded-md border border-border px-3 py-2 text-sm uppercase outline-none focus:border-info"
        />

        <button
          type="button"
          onClick={saveConfig}
          className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Lưu thông tin ngân hàng
        </button>
      </div>
    </div>
  );
}
