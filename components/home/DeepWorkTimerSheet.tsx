"use client";

import { useState } from "react";
import { Play, Square, PlusCircle } from "lucide-react";
import { useDeepWorkTimer } from "@/lib/hooks/useDeepWorkTimer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
}

export function DeepWorkTimerSheet({ onClose }: Props) {
  const { isRunning, elapsed, todayMinutes, start, stop, addManual, formatTime, formatMinutes } = useDeepWorkTimer();
  const [manualHours, setManualHours] = useState("");
  const [showManual, setShowManual] = useState(false);

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const maxSecs = 3600 * 4; // 4h max visual
  const progress = Math.min(elapsed / maxSecs, 1);
  const dashOffset = circumference * (1 - progress);

  async function handleStop() {
    await stop();
    onClose();
  }

  async function handleManual() {
    const h = parseFloat(manualHours);
    if (isNaN(h) || h <= 0) return;
    await addManual(h);
    setManualHours("");
    setShowManual(false);
  }

  return (
    <div className="flex flex-col items-center py-4 gap-6">
      {/* Circle timer */}
      <div className="relative w-52 h-52 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" width="208" height="208">
          <circle
            cx="104" cy="104" r={radius}
            fill="none" stroke="#1a1a1a" strokeWidth="8"
          />
          <circle
            cx="104" cy="104" r={radius}
            fill="none" stroke="#00FF85" strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="text-center">
          <p className={cn("text-4xl font-black tabular-nums", isRunning ? "text-[#00FF85]" : "text-white")}>
            {formatTime(elapsed)}
          </p>
          {isRunning && (
            <span className="text-[#00FF85] text-xs animate-pulse">● live</span>
          )}
        </div>
        {isRunning && (
          <div className="absolute inset-0 rounded-full animate-timer-pulse" />
        )}
      </div>

      {/* Today total */}
      <div className="text-center">
        <p className="text-[#6b7280] text-xs">Сьогодні всього</p>
        <p className="text-white font-bold text-xl">
          ⚡ {formatMinutes(todayMinutes)}
        </p>
      </div>

      {/* Controls */}
      <div className="flex gap-3 w-full">
        {!isRunning ? (
          <Button
            onClick={start}
            className="flex-1 h-14 bg-[#00FF85] text-black font-bold text-base rounded-2xl hover:bg-[#00e876] gap-2"
          >
            <Play size={20} fill="black" />
            Старт
          </Button>
        ) : (
          <Button
            onClick={handleStop}
            className="flex-1 h-14 bg-[#ef4444] text-white font-bold text-base rounded-2xl hover:bg-red-600 gap-2"
          >
            <Square size={20} fill="white" />
            Стоп
          </Button>
        )}
        <button
          onClick={() => setShowManual((v) => !v)}
          className="w-14 h-14 rounded-2xl bg-[#1a1a1a] flex items-center justify-center text-[#6b7280]"
        >
          <PlusCircle size={22} />
        </button>
      </div>

      {/* Manual input */}
      {showManual && (
        <div className="w-full bg-[#1a1a1a] rounded-2xl p-4 space-y-3">
          <p className="text-white text-sm font-semibold">Ввести вручну (годин)</p>
          <div className="flex gap-2">
            <Input
              type="number"
              inputMode="decimal"
              value={manualHours}
              onChange={(e) => setManualHours(e.target.value)}
              placeholder="1.5"
              className="bg-[#111111] border-white/10 text-white h-12"
            />
            <Button
              onClick={handleManual}
              className="h-12 px-5 bg-[#00FF85] text-black font-bold rounded-xl"
            >
              ✓
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
