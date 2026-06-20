"use client";

import type { OnboardingData } from "./page";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  data: OnboardingData;
  onChange: (partial: Partial<OnboardingData>) => void;
  onNext: () => void;
}

const fields: { key: keyof OnboardingData["pointB"]; icon: string; label: string; placeholder: string }[] = [
  {
    key: "body",
    icon: "💪",
    label: "Тіло",
    placeholder: "Жму 100кг. Важу 80кг. Талія 82см. Конкретні цифри.",
  },
  {
    key: "money",
    icon: "💰",
    label: "Гроші",
    placeholder: "€5000 на рахунку. Дохід €3000/міс. Без боргів.",
  },
  {
    key: "social",
    icon: "🗣️",
    label: "Соціум",
    placeholder: "Нова позиція. 3 ключових знайомства. Вільно говорю англійською.",
  },
  {
    key: "skills",
    icon: "🧠",
    label: "Навички",
    placeholder: "Запустив продукт. Читаю по 20 стор/день. Рівень B2 англійська.",
  },
];

export function StepPointB({ data, onChange, onNext }: Props) {
  function update(key: keyof OnboardingData["pointB"], value: string) {
    onChange({ pointB: { ...data.pointB, [key]: value } });
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col px-6 pt-12 pb-8">
      <div className="mb-8">
        <p className="text-[#00FF85] text-sm font-semibold mb-2 uppercase tracking-wider">
          Крок 2 — Точка Б
        </p>
        <h1 className="text-3xl font-black text-white mb-3 leading-tight">
          Де ти будеш через 6 місяців?
        </h1>
        <p className="text-[#6b7280] text-sm leading-relaxed">
          Конкретні цифри. Факти. Не &apos;краще&apos; — а скільки кг, скільки €, що вмієш.
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto">
        {fields.map(({ key, icon, label, placeholder }) => (
          <div key={key}>
            <div className="flex items-center gap-2 mb-1.5">
              <span>{icon}</span>
              <span className="text-white font-semibold text-sm">{label}</span>
            </div>
            <Textarea
              value={data.pointB[key]}
              onChange={(e) => update(key, e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="bg-[#111111] border-white/10 text-white placeholder:text-white/20 resize-none text-sm"
            />
          </div>
        ))}
      </div>

      <Button
        onClick={onNext}
        className="mt-6 w-full h-14 bg-[#00FF85] text-black font-bold text-base rounded-2xl hover:bg-[#00e876] active:scale-95 transition-all"
      >
        Далі →
      </Button>
    </div>
  );
}
