"use client";

// ============================================================
// Live Timer Component
// Shows elapsed time since clock-in, updating every second.
// ============================================================

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface LiveTimerProps {
  startTime: string | null;
  isActive: boolean;
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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

  if (!isActive || !startTime) {
    return (
      <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500">
        <Clock className="w-5 h-5" />
        <span className="text-2xl font-mono font-bold tracking-wider">
          00:00:00
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-brand-magenta dark:text-brand-magenta">
      <Clock className="w-5 h-5 animate-pulse" />
      <span className="text-2xl font-mono font-bold tracking-wider">
        {formatDuration(elapsed)}
      </span>
    </div>
  );
}
