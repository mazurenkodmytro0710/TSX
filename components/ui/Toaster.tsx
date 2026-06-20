"use client";

import { useEffect, useState } from "react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

let _id = 0;

export function showToast(message: string, type: "success" | "error" = "success") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("t6x:toast", { detail: { message, type } }));
  }
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    function onToast(e: Event) {
      const { message, type } = (e as CustomEvent<{ message: string; type: "success" | "error" }>).detail;
      const id = ++_id;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2400);
    }
    window.addEventListener("t6x:toast", onToast);
    return () => window.removeEventListener("t6x:toast", onToast);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed top-14 left-0 right-0 z-[200] flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-5 py-3 rounded-2xl text-sm font-bold shadow-lg animate-fade-in ${
            t.type === "success" ? "bg-[#00FF85] text-black" : "bg-[#ef4444] text-white"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
