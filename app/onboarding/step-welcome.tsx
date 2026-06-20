"use client";

import { T6XLogo } from "@/components/T6XLogo";
import { Button } from "@/components/ui/button";

interface Props {
  onNext: () => void;
}

export function StepWelcome({ onNext }: Props) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-8 animate-fade-in">
      <T6XLogo size={100} className="mb-8" />

      <h1 className="text-4xl font-black text-white text-center mb-3 tracking-tight">
        T6X
      </h1>
      <p className="text-[#00FF85] text-xl font-semibold text-center mb-6">
        6 місяців. Без виправдань.
      </p>

      <p className="text-[#6b7280] text-center text-sm leading-relaxed mb-12 max-w-xs">
        Monk Mode — це 6 місяців абсолютного фокусу. Тіло, гроші, навички.
        Жодних відволікань. Тільки дії.
      </p>

      <div className="space-y-3 w-full max-w-xs mb-8">
        {[
          { icon: "💪", text: "Щоденне відстеження тіла" },
          { icon: "🧠", text: "Deep work і навички" },
          { icon: "💰", text: "Фінанси під контролем" },
          { icon: "📊", text: "AI-аналіз щотижня" },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-3">
            <span className="text-lg">{icon}</span>
            <span className="text-white/70 text-sm">{text}</span>
          </div>
        ))}
      </div>

      <Button
        onClick={onNext}
        className="w-full max-w-xs h-14 bg-[#00FF85] text-black font-bold text-lg rounded-2xl hover:bg-[#00e876] transition-all active:scale-95"
      >
        Почати
      </Button>
    </div>
  );
}
