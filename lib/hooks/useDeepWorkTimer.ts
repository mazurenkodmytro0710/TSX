"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

export function useDeepWorkTimer() {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [todayMinutes, setTodayMinutes] = useState(0);
  const startRef = useRef<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadToday();
  }, []);

  async function loadToday() {
    const today = format(new Date(), "yyyy-MM-dd");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("deep_work_sessions")
      .select("duration_minutes")
      .eq("user_id", user.id)
      .eq("date", today);

    const total = (data ?? []).reduce((s: number, r: { duration_minutes: number }) => s + r.duration_minutes, 0);
    setTodayMinutes(total);
  }

  useEffect(() => {
    if (isRunning) {
      startRef.current = new Date();
      intervalRef.current = setInterval(() => {
        if (startRef.current) {
          setElapsed(Math.floor((Date.now() - startRef.current.getTime()) / 1000));
        }
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setElapsed(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const start = useCallback(() => {
    setIsRunning(true);
    if (navigator.vibrate) navigator.vibrate(10);
  }, []);

  const stop = useCallback(async () => {
    setIsRunning(false);
    if (!startRef.current || elapsed < 60) return;

    const durationMinutes = Math.floor(elapsed / 60);
    const today = format(new Date(), "yyyy-MM-dd");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("deep_work_sessions").insert({
      user_id: user.id,
      date: today,
      started_at: startRef.current.toISOString(),
      ended_at: new Date().toISOString(),
      duration_minutes: durationMinutes,
    });

    setTodayMinutes((m) => m + durationMinutes);
    if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
  }, [elapsed, supabase]);

  const addManual = useCallback(async (hours: number) => {
    const durationMinutes = Math.round(hours * 60);
    const today = format(new Date(), "yyyy-MM-dd");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("deep_work_sessions").insert({
      user_id: user.id,
      date: today,
      duration_minutes: durationMinutes,
      note: "Введено вручну",
    });

    setTodayMinutes((m) => m + durationMinutes);
  }, [supabase]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}год ${m}хв`;
    if (h > 0) return `${h}год`;
    return `${m}хв`;
  };

  return {
    isRunning,
    elapsed,
    todayMinutes,
    start,
    stop,
    addManual,
    formatTime,
    formatMinutes,
    reload: loadToday,
  };
}
