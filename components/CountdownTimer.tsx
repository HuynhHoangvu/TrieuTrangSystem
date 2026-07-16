"use client";

import { useEffect, useState } from "react";
import { correctedNow } from "@/lib/clockSync";

function formatRemaining(ms: number) {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function CountdownTimer({
  autoCheckoutAt,
  onExpire,
}: {
  autoCheckoutAt: string;
  onExpire?: () => void;
}) {
  const [remainingMs, setRemainingMs] = useState(() => new Date(autoCheckoutAt).getTime() - correctedNow());
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const target = new Date(autoCheckoutAt).getTime();
    const tick = () => {
      const diff = target - correctedNow();
      setRemainingMs(diff);
      if (diff <= 0 && !expired) {
        setExpired(true);
        onExpire?.();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCheckoutAt]);

  const isDone = remainingMs <= 0;

  return (
    <span className={isDone ? "font-mono text-success" : "font-mono text-active"}>
      {isDone ? "Hoàn thành" : formatRemaining(remainingMs)}
    </span>
  );
}
