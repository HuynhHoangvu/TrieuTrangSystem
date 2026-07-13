"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";

interface Vehicle {
  id: string;
  code: string;
  qrToken: string;
  status: string;
  type: { id: string; name: string };
}

interface VehicleType {
  id: string;
  name: string;
}

export default function PrintQrPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [types, setTypes] = useState<VehicleType[]>([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [qrImages, setQrImages] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/vehicles").then((r) => r.json()),
      fetch("/api/admin/vehicle-types").then((r) => r.json()),
    ]).then(([v, t]) => {
      setVehicles(v);
      setTypes(t);
    });
  }, []);

  const filtered = useMemo(
    () => (typeFilter ? vehicles.filter((v) => v.type.id === typeFilter) : vehicles),
    [vehicles, typeFilter]
  );

  useEffect(() => {
    let cancelled = false;
    async function generate() {
      const entries = await Promise.all(
        filtered.map(async (v) => {
          const dataUrl = await QRCode.toDataURL(v.qrToken, { width: 220, margin: 1 });
          return [v.id, dataUrl] as const;
        })
      );
      if (!cancelled) setQrImages(Object.fromEntries(entries));
    }
    if (filtered.length > 0) generate();
    return () => {
      cancelled = true;
    };
  }, [filtered]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-semibold">In mã QR xe</h1>
          <p className="text-sm text-foreground/60">
            Mỗi thẻ gồm mã QR + mã xe. Cắt rời và dán lên xe tương ứng.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-info"
          >
            <option value="">Tất cả loại xe</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <Link
            href="/admin/vehicles"
            className="rounded-md border border-border bg-white px-3 py-2 text-sm hover:bg-hover"
          >
            Quay lại
          </Link>
          <button
            onClick={() => window.print()}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            In
          </button>
        </div>
      </div>

      <p className="text-sm text-foreground/60 print:hidden">
        {filtered.length} xe sẽ được in.
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 print:grid-cols-4 print:gap-3">
        {filtered.map((v) => (
          <div
            key={v.id}
            className="flex flex-col items-center gap-2 rounded-lg border border-border bg-white p-4 text-center print:break-inside-avoid print:border-black"
          >
            {qrImages[v.id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrImages[v.id]} alt={v.code} className="h-32 w-32" />
            ) : (
              <div className="h-32 w-32 animate-pulse bg-hover" />
            )}
            <p className="text-base font-semibold">{v.code}</p>
            <p className="text-xs text-foreground/60">{v.type.name}</p>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-foreground/60">Không có xe nào để hiển thị.</p>
      )}
    </div>
  );
}
