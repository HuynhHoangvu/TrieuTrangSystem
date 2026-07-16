"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";

interface PassengerPrice {
  id: string;
  passengers: number;
  price: number;
}

interface VehicleType {
  id: string;
  name: string;
  pricePerTrip: number;
  durationMode: string;
  pricingMode: string;
  passengerPrices: PassengerPrice[];
  _count: { vehicles: number };
}

interface Vehicle {
  id: string;
  code: string;
  typeId: string;
  priceOverride: number | null;
  status: string;
  qrToken: string;
  type: { id: string; name: string; pricePerTrip: number; durationMode: string };
}

function formatMoney(amount: number) {
  return amount.toLocaleString("vi-VN") + "đ";
}

function durationModeLabel(mode: string) {
  return mode === "manual" ? "Thoải mái (quét lại để trả xe)" : "Tính giờ (tự chốt lượt)";
}

function tiersSummary(tiers: PassengerPrice[]) {
  if (tiers.length === 0) return "Chưa có bậc giá";
  return tiers
    .slice()
    .sort((a, b) => a.passengers - b.passengers)
    .map((t) => `${t.passengers} người: ${formatMoney(t.price)}`)
    .join(" · ");
}

export default function AdminVehiclesPage() {
  const [types, setTypes] = useState<VehicleType[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypePrice, setNewTypePrice] = useState("");
  const [newTypeDurationMode, setNewTypeDurationMode] = useState("timed");
  const [newTypePricingMode, setNewTypePricingMode] = useState("flat");
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editTypePrice, setEditTypePrice] = useState("");
  const [editTypeDurationMode, setEditTypeDurationMode] = useState("timed");
  const [editTypePricingMode, setEditTypePricingMode] = useState("flat");
  const [tierTypeId, setTierTypeId] = useState("");
  const [tierPassengers, setTierPassengers] = useState("");
  const [tierPrice, setTierPrice] = useState("");
  const [newVehicleCode, setNewVehicleCode] = useState("");
  const [newVehicleTypeId, setNewVehicleTypeId] = useState("");
  const [newVehiclePrice, setNewVehiclePrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [bulkTypeId, setBulkTypeId] = useState("");
  const [bulkPrefix, setBulkPrefix] = useState("");
  const [bulkCount, setBulkCount] = useState("");
  const [bulkStartIndex, setBulkStartIndex] = useState("1");
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("");
  const [qrSearch, setQrSearch] = useState("");
  const [qrTypeFilter, setQrTypeFilter] = useState("");
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [viewingQr, setViewingQr] = useState<Vehicle | null>(null);

  async function loadAll() {
    const [typesRes, vehiclesRes] = await Promise.all([
      fetch("/api/admin/vehicle-types"),
      fetch("/api/admin/vehicles"),
    ]);
    setTypes(await typesRes.json());
    setVehicles(await vehiclesRes.json());
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function addType(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/vehicle-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newTypeName,
        pricePerTrip: Number(newTypePrice),
        durationMode: newTypeDurationMode,
        pricingMode: newTypePricingMode,
      }),
    });
    if (!res.ok) {
      setError((await res.json()).error);
      return;
    }
    setNewTypeName("");
    setNewTypePrice("");
    setNewTypeDurationMode("timed");
    setNewTypePricingMode("flat");
    loadAll();
  }

  function startEditType(t: VehicleType) {
    setEditingTypeId(t.id);
    setEditTypePrice(String(t.pricePerTrip));
    setEditTypeDurationMode(t.durationMode);
    setEditTypePricingMode(t.pricingMode);
  }

  async function saveEditType(id: string) {
    setError(null);
    const res = await fetch(`/api/admin/vehicle-types/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pricePerTrip: Number(editTypePrice),
        durationMode: editTypeDurationMode,
        pricingMode: editTypePricingMode,
      }),
    });
    if (!res.ok) {
      setError((await res.json()).error);
      return;
    }
    setEditingTypeId(null);
    loadAll();
  }

  async function addTier(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!tierTypeId) return;
    const res = await fetch(`/api/admin/vehicle-types/${tierTypeId}/passenger-prices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passengers: Number(tierPassengers), price: Number(tierPrice) }),
    });
    if (!res.ok) {
      setError((await res.json()).error);
      return;
    }
    setTierPassengers("");
    setTierPrice("");
    loadAll();
  }

  async function deleteTier(typeId: string, tierId: string) {
    if (!confirm("Xoá bậc giá này?")) return;
    await fetch(`/api/admin/vehicle-types/${typeId}/passenger-prices?tierId=${tierId}`, {
      method: "DELETE",
    });
    loadAll();
  }

  async function deleteType(id: string) {
    if (!confirm("Xoá loại xe này?")) return;
    const res = await fetch(`/api/admin/vehicle-types/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError((await res.json()).error);
      return;
    }
    loadAll();
  }

  async function addVehicle(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: newVehicleCode,
        typeId: newVehicleTypeId,
        priceOverride: newVehiclePrice || null,
      }),
    });
    if (!res.ok) {
      setError((await res.json()).error);
      return;
    }
    setNewVehicleCode("");
    setNewVehiclePrice("");
    loadAll();
  }

  async function toggleMaintenance(vehicle: Vehicle) {
    const status = vehicle.status === "available" ? "maintenance" : "available";
    await fetch(`/api/admin/vehicles/${vehicle.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadAll();
  }

  async function deleteVehicle(id: string) {
    if (!confirm("Xoá xe này?")) return;
    const res = await fetch(`/api/admin/vehicles/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError((await res.json()).error);
      return;
    }
    loadAll();
  }

  async function bulkCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBulkResult(null);
    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin/vehicles/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typeId: bulkTypeId,
          prefix: bulkPrefix,
          count: Number(bulkCount),
          startIndex: Number(bulkStartIndex) || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setBulkResult(`Đã tạo ${data.created} xe mới${data.skipped ? `, bỏ qua ${data.skipped} mã đã tồn tại` : ""}.`);
      loadAll();
    } finally {
      setBulkLoading(false);
    }
  }

  const vehicleFiltered = useMemo(() => {
    const search = vehicleSearch.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (vehicleTypeFilter && v.type.id !== vehicleTypeFilter) return false;
      if (search && !v.code.toLowerCase().includes(search)) return false;
      return true;
    });
  }, [vehicles, vehicleSearch, vehicleTypeFilter]);

  const qrFiltered = useMemo(() => {
    const search = qrSearch.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (qrTypeFilter && v.type.id !== qrTypeFilter) return false;
      if (search && !v.code.toLowerCase().includes(search)) return false;
      return true;
    });
  }, [vehicles, qrSearch, qrTypeFilter]);

  useEffect(() => {
    let cancelled = false;
    async function generate() {
      const missing = qrFiltered.filter((v) => !qrImages[v.id]);
      if (missing.length === 0) return;
      const entries = await Promise.all(
        missing.map(async (v) => [v.id, await QRCode.toDataURL(v.qrToken, { width: 200, margin: 1 })] as const)
      );
      if (!cancelled) setQrImages((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    }
    generate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrFiltered]);

  useEffect(() => {
    if (!viewingQr || qrImages[viewingQr.id]) return;
    QRCode.toDataURL(viewingQr.qrToken, { width: 200, margin: 1 }).then((dataUrl) => {
      setQrImages((prev) => ({ ...prev, [viewingQr.id]: dataUrl }));
    });
  }, [viewingQr, qrImages]);

  function downloadQr(vehicle: Vehicle) {
    const dataUrl = qrImages[vehicle.id];
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${vehicle.code}.png`;
    a.click();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Xe & loại xe</h1>
        <Link
          href="/admin/vehicles/print"
          className="rounded-md border border-border bg-white px-3 py-1.5 text-sm hover:bg-hover"
        >
          In mã QR
        </Link>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Loại xe */}
      <section className="rounded-lg border border-border bg-white p-4">
        <h2 className="mb-3 font-medium">Loại xe</h2>

        {/* Mobile: cards */}
        <div className="mb-4 flex flex-col gap-3 md:hidden">
          {types.map((t) => {
            const isEditing = editingTypeId === t.id;
            return (
              <div key={t.id} className="rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{t.name}</p>
                  <span className="shrink-0 text-xs text-foreground/60">{t._count.vehicles} xe</span>
                </div>
                {isEditing ? (
                  <div className="mt-2 flex flex-col gap-2">
                    <input
                      value={editTypePrice}
                      onChange={(e) => setEditTypePrice(e.target.value)}
                      type="number"
                      placeholder="Giá cơ bản/dự phòng"
                      className="rounded-md border border-border px-2 py-1.5 text-sm"
                    />
                    <select
                      value={editTypeDurationMode}
                      onChange={(e) => setEditTypeDurationMode(e.target.value)}
                      className="rounded-md border border-border px-2 py-1.5 text-sm"
                    >
                      <option value="timed">Tính giờ (tự chốt lượt)</option>
                      <option value="manual">Thoải mái (quét lại để trả xe)</option>
                    </select>
                    <select
                      value={editTypePricingMode}
                      onChange={(e) => setEditTypePricingMode(e.target.value)}
                      className="rounded-md border border-border px-2 py-1.5 text-sm"
                    >
                      <option value="flat">Giá cố định</option>
                      <option value="passengers">Giá theo số người</option>
                    </select>
                    <div className="flex gap-3">
                      <button onClick={() => saveEditType(t.id)} className="text-sm text-success">
                        Lưu
                      </button>
                      <button onClick={() => setEditingTypeId(null)} className="text-sm text-foreground/60">
                        Huỷ
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mt-1 text-sm text-foreground/70">
                      {t.pricingMode === "passengers"
                        ? tiersSummary(t.passengerPrices)
                        : formatMoney(t.pricePerTrip)}{" "}
                      · {durationModeLabel(t.durationMode)}
                    </p>
                    <div className="mt-2 flex gap-4">
                      <button onClick={() => startEditType(t)} className="text-sm text-info">
                        Sửa
                      </button>
                      <button onClick={() => deleteType(t.id)} className="text-sm text-red-600">
                        Xoá
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop: table */}
        <div className="mb-4 hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-foreground/60">
                <th className="pb-2">Tên</th>
                <th className="pb-2">Giá</th>
                <th className="pb-2">Chế độ thời gian</th>
                <th className="pb-2">Chế độ giá</th>
                <th className="pb-2">Số xe</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {types.map((t) => {
                const isEditing = editingTypeId === t.id;
                return (
                  <tr key={t.id} className="border-t border-border align-top">
                    <td className="py-2">{t.name}</td>
                    <td className="py-2">
                      {isEditing ? (
                        <input
                          value={editTypePrice}
                          onChange={(e) => setEditTypePrice(e.target.value)}
                          type="number"
                          className="w-28 rounded-md border border-border px-2 py-1 text-sm"
                        />
                      ) : t.pricingMode === "passengers" ? (
                        tiersSummary(t.passengerPrices)
                      ) : (
                        formatMoney(t.pricePerTrip)
                      )}
                    </td>
                    <td className="py-2">
                      {isEditing ? (
                        <select
                          value={editTypeDurationMode}
                          onChange={(e) => setEditTypeDurationMode(e.target.value)}
                          className="rounded-md border border-border px-2 py-1 text-sm"
                        >
                          <option value="timed">Tính giờ (tự chốt lượt)</option>
                          <option value="manual">Thoải mái (quét lại để trả xe)</option>
                        </select>
                      ) : (
                        durationModeLabel(t.durationMode)
                      )}
                    </td>
                    <td className="py-2">
                      {isEditing ? (
                        <select
                          value={editTypePricingMode}
                          onChange={(e) => setEditTypePricingMode(e.target.value)}
                          className="rounded-md border border-border px-2 py-1 text-sm"
                        >
                          <option value="flat">Giá cố định</option>
                          <option value="passengers">Giá theo số người</option>
                        </select>
                      ) : t.pricingMode === "passengers" ? (
                        "Theo số người"
                      ) : (
                        "Cố định"
                      )}
                    </td>
                    <td className="py-2">{t._count.vehicles}</td>
                    <td className="py-2 text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => saveEditType(t.id)}
                            className="text-sm text-success hover:underline"
                          >
                            Lưu
                          </button>
                          <button
                            onClick={() => setEditingTypeId(null)}
                            className="text-sm text-foreground/60 hover:underline"
                          >
                            Huỷ
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => startEditType(t)}
                            className="text-sm text-info hover:underline"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => deleteType(t.id)}
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
        </div>

        <form onSubmit={addType} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <input
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            placeholder="Tên loại xe (VD: ATV)"
            className="flex-1 rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-info"
            required
          />
          <input
            value={newTypePrice}
            onChange={(e) => setNewTypePrice(e.target.value)}
            type="number"
            placeholder="Giá cơ bản/dự phòng"
            className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-info sm:w-40"
            required
          />
          <select
            value={newTypeDurationMode}
            onChange={(e) => setNewTypeDurationMode(e.target.value)}
            className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-info"
          >
            <option value="timed">Tính giờ (tự chốt lượt)</option>
            <option value="manual">Thoải mái (quét lại để trả xe)</option>
          </select>
          <select
            value={newTypePricingMode}
            onChange={(e) => setNewTypePricingMode(e.target.value)}
            className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-info"
          >
            <option value="flat">Giá cố định</option>
            <option value="passengers">Giá theo số người</option>
          </select>
          <button className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Thêm
          </button>
        </form>
        <p className="mt-2 text-xs text-foreground/60">
          Chọn &quot;Giá theo số người&quot; thì cấu hình bậc giá cụ thể ở mục &quot;Giá theo số người&quot; bên dưới.
        </p>
      </section>

      {/* Giá theo số người */}
      <section className="rounded-lg border border-border bg-white p-4">
        <h2 className="mb-1 font-medium">Giá theo số người</h2>
        <p className="mb-3 text-sm text-foreground/60">
          Áp dụng cho loại xe có &quot;Chế độ giá” = &quot;Giá theo số người&quot;, VD ATV: 1 người 400.000đ, 2 người 600.000đ.
        </p>

        <div className="mb-3 flex flex-col gap-3">
          {types
            .filter((t) => t.pricingMode === "passengers")
            .map((t) => (
              <div key={t.id} className="rounded-md border border-border p-3">
                <p className="mb-2 font-medium">{t.name}</p>
                {t.passengerPrices.length === 0 ? (
                  <p className="text-sm text-foreground/60">Chưa có bậc giá nào.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-border">
                    {t.passengerPrices
                      .slice()
                      .sort((a, b) => a.passengers - b.passengers)
                      .map((tier) => (
                        <li key={tier.id} className="flex items-center justify-between py-1.5 text-sm">
                          <span>
                            {tier.passengers} người — {formatMoney(tier.price)}
                          </span>
                          <button
                            onClick={() => deleteTier(t.id, tier.id)}
                            className="text-red-600 hover:underline"
                          >
                            Xoá
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            ))}
          {types.filter((t) => t.pricingMode === "passengers").length === 0 && (
            <p className="text-sm text-foreground/60">
              Chưa có loại xe nào dùng chế độ giá theo số người.
            </p>
          )}
        </div>

        <form onSubmit={addTier} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <select
            value={tierTypeId}
            onChange={(e) => setTierTypeId(e.target.value)}
            className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-info"
            required
          >
            <option value="">Chọn loại xe</option>
            {types
              .filter((t) => t.pricingMode === "passengers")
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
          <input
            value={tierPassengers}
            onChange={(e) => setTierPassengers(e.target.value)}
            type="number"
            min={1}
            placeholder="Số người (VD: 1)"
            className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-info sm:w-36"
            required
          />
          <input
            value={tierPrice}
            onChange={(e) => setTierPrice(e.target.value)}
            type="number"
            placeholder="Giá (VD: 400000)"
            className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-info sm:w-36"
            required
          />
          <button className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Thêm/Cập nhật bậc giá
          </button>
        </form>
      </section>

      {/* Xe */}
      <section className="rounded-lg border border-border bg-white p-4">
        <h2 className="mb-3 font-medium">Xe</h2>

        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={vehicleSearch}
            onChange={(e) => setVehicleSearch(e.target.value)}
            placeholder="Tìm theo mã xe..."
            className="flex-1 rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-info"
          />
          <select
            value={vehicleTypeFilter}
            onChange={(e) => setVehicleTypeFilter(e.target.value)}
            className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-info"
          >
            <option value="">Tất cả loại xe</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <p className="mb-3 text-sm text-foreground/60">{vehicleFiltered.length} xe</p>

        {/* Mobile: cards */}
        <div className="mb-4 flex max-h-112 flex-col gap-3 overflow-y-auto md:hidden">
          {vehicleFiltered.map((v) => (
            <div key={v.id} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{v.code}</p>
                <span
                  className={`text-sm ${v.status === "available" ? "text-success" : "text-disabled"}`}
                >
                  {v.status === "available" ? "Sẵn sàng" : "Bảo trì"}
                </span>
              </div>
              <p className="text-sm text-foreground/60">
                {v.type.name}
                {v.priceOverride ? ` · ${formatMoney(v.priceOverride)}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-4">
                <button onClick={() => setViewingQr(v)} className="text-sm text-info">
                  Xem QR
                </button>
                <button onClick={() => toggleMaintenance(v)} className="text-sm text-info">
                  {v.status === "available" ? "Đặt bảo trì" : "Kích hoạt lại"}
                </button>
                <button onClick={() => deleteVehicle(v.id)} className="text-sm text-red-600">
                  Xoá
                </button>
              </div>
            </div>
          ))}
          {vehicleFiltered.length === 0 && (
            <p className="text-sm text-foreground/60">Không tìm thấy xe phù hợp.</p>
          )}
        </div>

        {/* Desktop: table */}
        <div className="mb-4 hidden max-h-128 overflow-y-auto overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="sticky top-0 bg-white text-left text-foreground/60">
                <th className="pb-2">Mã xe</th>
                <th className="pb-2">Loại</th>
                <th className="pb-2">Giá riêng</th>
                <th className="pb-2">Trạng thái</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {vehicleFiltered.map((v) => (
                <tr key={v.id} className="border-t border-border">
                  <td className="py-2 font-medium">{v.code}</td>
                  <td className="py-2">{v.type.name}</td>
                  <td className="py-2">{v.priceOverride ? formatMoney(v.priceOverride) : "-"}</td>
                  <td className="py-2">
                    <span
                      className={
                        v.status === "available" ? "text-success" : "text-disabled"
                      }
                    >
                      {v.status === "available" ? "Sẵn sàng" : "Bảo trì"}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setViewingQr(v)}
                        className="text-sm text-info hover:underline"
                      >
                        Xem QR
                      </button>
                      <button
                        onClick={() => toggleMaintenance(v)}
                        className="text-sm text-info hover:underline"
                      >
                        {v.status === "available" ? "Đặt bảo trì" : "Kích hoạt lại"}
                      </button>
                      <button
                        onClick={() => deleteVehicle(v.id)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Xoá
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {vehicleFiltered.length === 0 && (
            <p className="py-4 text-center text-sm text-foreground/60">Không tìm thấy xe phù hợp.</p>
          )}
        </div>

        <form onSubmit={addVehicle} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <input
            value={newVehicleCode}
            onChange={(e) => setNewVehicleCode(e.target.value)}
            placeholder="Mã xe (VD: VH-020)"
            className="flex-1 rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-info"
            required
          />
          <select
            value={newVehicleTypeId}
            onChange={(e) => setNewVehicleTypeId(e.target.value)}
            className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-info"
            required
          >
            <option value="">Chọn loại xe</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input
            value={newVehiclePrice}
            onChange={(e) => setNewVehiclePrice(e.target.value)}
            type="number"
            placeholder="Giá riêng (tuỳ chọn)"
            className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-info sm:w-40"
          />
          <button className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Thêm xe
          </button>
        </form>
      </section>

      {/* Tạo hàng loạt */}
      <section className="rounded-lg border border-border bg-white p-4">
        <h2 className="mb-1 font-medium">Tạo hàng loạt xe</h2>
        <p className="mb-3 text-sm text-foreground/60">
          Tạo nhiều xe cùng lúc theo mẫu mã, VD prefix &quot;ATV&quot; + số lượng 50 → ATV-001..ATV-050.
        </p>
        <form onSubmit={bulkCreate} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex flex-col">
            <label className="mb-1 block text-xs text-foreground/60">Loại xe</label>
            <select
              value={bulkTypeId}
              onChange={(e) => setBulkTypeId(e.target.value)}
              className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-info"
              required
            >
              <option value="">Chọn loại xe</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="mb-1 block text-xs text-foreground/60">Tiền tố mã</label>
            <input
              value={bulkPrefix}
              onChange={(e) => setBulkPrefix(e.target.value)}
              placeholder="VD: ATV"
              className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-info sm:w-28"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 block text-xs text-foreground/60">Số lượng</label>
            <input
              value={bulkCount}
              onChange={(e) => setBulkCount(e.target.value)}
              type="number"
              min={1}
              placeholder="VD: 50"
              className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-info sm:w-24"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 block text-xs text-foreground/60">Bắt đầu từ số</label>
            <input
              value={bulkStartIndex}
              onChange={(e) => setBulkStartIndex(e.target.value)}
              type="number"
              min={1}
              className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-info sm:w-24"
            />
          </div>
          <button
            disabled={bulkLoading}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {bulkLoading ? "Đang tạo..." : "Tạo hàng loạt"}
          </button>
        </form>
        {bulkResult && <p className="mt-3 text-sm text-success">{bulkResult}</p>}
      </section>

      {/* Quản lý mã QR */}
      <section className="rounded-lg border border-border bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium">Quản lý mã QR</h2>
            <p className="text-sm text-foreground/60">
              Xem, tải hoặc in mã QR từng xe để dán lên xe tương ứng.
            </p>
          </div>
          <Link
            href="/admin/vehicles/print"
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-hover"
          >
            In hàng loạt
          </Link>
        </div>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={qrSearch}
            onChange={(e) => setQrSearch(e.target.value)}
            placeholder="Tìm theo mã xe..."
            className="flex-1 rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-info"
          />
          <select
            value={qrTypeFilter}
            onChange={(e) => setQrTypeFilter(e.target.value)}
            className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-info"
          >
            <option value="">Tất cả loại xe</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <p className="mb-3 text-sm text-foreground/60">{qrFiltered.length} xe</p>

        <div className="grid max-h-144 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-4 md:grid-cols-6">
          {qrFiltered.map((v) => (
            <div
              key={v.id}
              className="flex flex-col items-center gap-2 rounded-md border border-border p-3 text-center"
            >
              {qrImages[v.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrImages[v.id]}
                  alt={v.code}
                  className="h-20 w-20 cursor-pointer"
                  onClick={() => setViewingQr(v)}
                />
              ) : (
                <div className="h-20 w-20 animate-pulse bg-hover" />
              )}
              <p className="text-sm font-medium">{v.code}</p>
              <button
                onClick={() => downloadQr(v)}
                className="text-xs text-info hover:underline"
              >
                Tải PNG
              </button>
            </div>
          ))}
        </div>

        {qrFiltered.length === 0 && (
          <p className="text-sm text-foreground/60">Không tìm thấy xe phù hợp.</p>
        )}
      </section>

      {viewingQr && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setViewingQr(null)}
        >
          <div
            className="flex w-full max-w-xs flex-col items-center gap-3 rounded-lg bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {qrImages[viewingQr.id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrImages[viewingQr.id]} alt={viewingQr.code} className="h-56 w-56" />
            ) : (
              <div className="h-56 w-56 animate-pulse bg-hover" />
            )}
            <p className="text-lg font-semibold">{viewingQr.code}</p>
            <p className="text-sm text-foreground/60">{viewingQr.type.name}</p>
            <div className="flex gap-2">
              <button
                onClick={() => downloadQr(viewingQr)}
                className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Tải PNG
              </button>
              <button
                onClick={() => setViewingQr(null)}
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-hover"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
