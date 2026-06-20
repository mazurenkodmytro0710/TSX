"use client";

import type { OnboardingData } from "./page";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  data: OnboardingData;
  onChange: (partial: Partial<OnboardingData>) => void;
  onNext: () => void;
}

const fields: { key: keyof OnboardingData["pointA"]; icon: string; label: string; placeholder: string }[] = [
  {
    key: "body",
    icon: "💪",
    label: "Тіло",
    placeholder: "Вага, форма, самопочуття. Що зараз не так? Будь чесним з собою.",
  },
  {
    key: "money",
    icon: "💰",
    label: "Гроші",
    placeholder: "Скільки є? Скільки витрачаю? Де текуть гроші? Борги?",
  },
  {
    key: "social",
    icon: "🗣️",
    label: "Соціум",
    placeholder: "Відносини, кар'єра, репутація. Що тисне і не дає спокою?",
  },
  {
    key: "skills",
    icon: "🧠",
    label: "Навички",
    placeholder: "Що вмію зараз? Де застряг? Що соромно не вміти?",
  },
];

export function StepPointA({ data, onChange, onNext }: Props) {
  function update(key: keyof OnboardingData["pointA"], value: string) {
    onChange({ pointA: { ...data.pointA, [key]: value } });
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col px-6 pt-12 pb-8">
      <div className="mb-8">
        <p className="text-[#00FF85] text-sm font-semibold mb-2 uppercase tracking-wider">
          Крок 1 — Точка А
        </p>
        <h1 className="text-3xl font-black text-white mb-3 leading-tight">
          Де ти зараз насправді?
        </h1>
        <p className="text-[#6b7280] text-sm leading-relaxed">
          Чесно. Без прикрас. Все що давить і не дає спокою.
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
              value={data.pointA[key]}
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
