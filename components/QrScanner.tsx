"use client";

import { useEffect, useRef } from "react";

export default function QrScanner({
  onScan,
  active,
}: {
  onScan: (text: string) => void;
  active: boolean;
}) {
  const containerId = "qr-reader";
  const scannerRef = useRef<import("html5-qrcode").Html5QrcodeScanner | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    import("html5-qrcode").then(({ Html5QrcodeScanner }) => {
      if (cancelled) return;
      const scanner = new Html5QrcodeScanner(
        containerId,
        { fps: 10, qrbox: 250 },
        false
      );
      scanner.render(
        (decodedText) => onScanRef.current(decodedText),
        () => {}
      );
      scannerRef.current = scanner;
    });

    return () => {
      cancelled = true;
      scannerRef.current?.clear().catch(() => {});
      scannerRef.current = null;
    };
  }, [active]);

  if (!active) return null;

  return <div id={containerId} className="w-full overflow-hidden rounded-md" />;
}
