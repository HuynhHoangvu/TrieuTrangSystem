"use client";

import { useEffect, useRef, useState } from "react";

interface TripLite {
  id: string;
  status: string;
  autoCheckoutAt: string | null;
  vehicle: { code: string };
}

interface Toast {
  id: string;
  text: string;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminTripNotifier() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevActiveIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const today = todayStr();
        const res = await fetch(`/api/trips?from=${today}&to=${today}`);
        if (!res.ok || cancelled) return;
        const trips: TripLite[] = await res.json();

        if (initializedRef.current) {
          for (const t of trips) {
            // Chỉ thông báo lượt xe tính giờ vừa tự động hoàn thành (hết giờ),
            // không thông báo cho xe "thoải mái" (quét lại để trả) hay lượt bị huỷ.
            if (t.status === "completed" && t.autoCheckoutAt && prevActiveIdsRef.current.has(t.id)) {
              const toastId = `${t.id}-${Date.now()}`;
              setToasts((prev) => [...prev, { id: toastId, text: `Xe ${t.vehicle.code} đã chạy hết lượt` }]);
              setTimeout(() => {
                setToasts((prev) => prev.filter((x) => x.id !== toastId));
              }, 7000);
            }
          }
        } else {
          initializedRef.current = true;
        }

        prevActiveIdsRef.current = new Set(trips.filter((t) => t.status === "active").map((t) => t.id));
      } catch {
        // bỏ qua lỗi mạng tạm thời, lần poll sau thử lại
      }
    }

    poll();
    const interval = setInterval(poll, 12000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className="cursor-pointer rounded-md bg-foreground px-4 py-3 text-sm text-white shadow-lg"
        >
          ⏱ {t.text}
        </div>
      ))}
    </div>
  );
}
