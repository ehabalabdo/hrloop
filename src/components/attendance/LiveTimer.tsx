"use client";

// ============================================================
// Live Timer — Hero-sized elapsed time since clock-in
// ============================================================

import { useEffect, useState } from "react";

interface LiveTimerProps {
  startTime: string | null;
  isActive: boolean;
}

function formatDuration(seconds: number): { hrs: string; mins: string; secs: string } {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return {
    hrs: hrs.toString().padStart(2, "0"),
    mins: mins.toString().padStart(2, "0"),
    secs: secs.toString().padStart(2, "0"),
  };
}

export default function LiveTimer({ startTime, isActive }: LiveTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime || !isActive) {
      setElapsed(0);
      return;
    }

    const start = new Date(startTime).getTime();

    const updateElapsed = () => {
      const now = Date.now();
      setElapsed(Math.floor((now - start) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [startTime, isActive]);

  const time = formatDuration(elapsed);
  const active = isActive && !!startTime;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Label */}
      <span className="text-xs font-medium text-white/60 tracking-wider uppercase">
        مدة الوردية
      </span>

      {/* Big timer display */}
      <div className="flex items-baseline gap-1 tabular-nums" dir="ltr">
        <span className={`text-5xl sm:text-6xl font-bold tracking-tight font-mono ${active ? "text-white" : "text-white/30"}`}>
          {time.hrs}
        </span>
        <span className={`text-4xl sm:text-5xl font-light ${active ? "text-white/70 animate-pulse" : "text-white/20"}`}>:</span>
        <span className={`text-5xl sm:text-6xl font-bold tracking-tight font-mono ${active ? "text-white" : "text-white/30"}`}>
          {time.mins}
        </span>
        <span className={`text-4xl sm:text-5xl font-light ${active ? "text-white/70 animate-pulse" : "text-white/20"}`}>:</span>
        <span className={`text-5xl sm:text-6xl font-bold tracking-tight font-mono ${active ? "text-brand-orange" : "text-white/30"}`}>
          {time.secs}
        </span>
      </div>
    </div>
  );
}
