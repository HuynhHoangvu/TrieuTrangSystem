"use client";

import { useEffect, useRef, useState } from "react";

export default function QrScanner({
  onScan,
  active,
}: {
  onScan: (text: string) => void;
  active: boolean;
}) {
  const containerId = "qr-reader";
  const instanceRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const startedRef = useRef(false);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const [status, setStatus] = useState<"starting" | "running" | "error">("starting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setStatus("starting");
    setErrorMessage(null);

    import("html5-qrcode").then(async ({ Html5Qrcode }) => {
      if (cancelled) return;
      const instance = new Html5Qrcode(containerId, { verbose: false });
      instanceRef.current = instance;

      const config = {
        fps: 10,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.7);
          return { width: size, height: size };
        },
      };

      const onSuccess = (decodedText: string) => {
        try {
          instance.pause(true);
        } catch {
          // ignore
        }
        onScanRef.current(decodedText);
        setTimeout(() => {
          try {
            instance.resume();
          } catch {
            // component may already be unmounted
          }
        }, 1500);
      };

      try {
        await instance.start({ facingMode: "environment" }, config, onSuccess, () => {});
        if (cancelled) return;
        startedRef.current = true;
        setStatus("running");
      } catch {
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cancelled) return;
          if (cameras.length === 0) throw new Error("no-camera");
          await instance.start(cameras[0].id, config, onSuccess, () => {});
          if (cancelled) return;
          startedRef.current = true;
          setStatus("running");
        } catch {
          if (!cancelled) {
            setStatus("error");
            setErrorMessage(
              "Không thể mở camera. Hãy cho phép trình duyệt truy cập camera rồi thử lại."
            );
          }
        }
      }
    });

    return () => {
      cancelled = true;
      const instance = instanceRef.current;
      if (instance && startedRef.current) {
        instance
          .stop()
          .then(() => instance.clear())
          .catch(() => {});
      }
      startedRef.current = false;
      instanceRef.current = null;
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative w-full overflow-hidden rounded-lg bg-black">
        <div id={containerId} className="[&>video]:w-full! [&>video]:h-auto!" />
        {status === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-white">
            Đang mở camera...
          </div>
        )}
      </div>
      {status === "running" && (
        <p className="text-center text-sm text-foreground/60">Đưa mã QR trên xe vào giữa khung hình</p>
      )}
      {status === "error" && errorMessage && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}
    </div>
  );
}
