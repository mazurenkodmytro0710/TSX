"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StepWelcome } from "./step-welcome";
import { StepPointA } from "./step-point-a";
import { StepPointB } from "./step-point-b";
import { StepPlan } from "./step-plan";
import { StepSetup } from "./step-setup";
import { ProgressDots } from "@/components/onboarding/ProgressDots";

export interface OnboardingData {
  pointA: { body: string; money: string; social: string; skills: string };
  pointB: { body: string; money: string; social: string; skills: string };
  monthOnePlan: string;
  name: string;
  calorieGoal: number;
  proteinGoal: number;
  sleepTime: string;
  reminderTime: string;
}

const INITIAL: OnboardingData = {
  pointA: { body: "", money: "", social: "", skills: "" },
  pointB: { body: "", money: "", social: "", skills: "" },
  monthOnePlan: "",
  name: "",
  calorieGoal: 2800,
  proteinGoal: 180,
  sleepTime: "23:00",
  reminderTime: "20:00",
};

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(INITIAL);
  const router = useRouter();

  function next() {
    setStep((s) => Math.min(s + 1, 4));
  }

  function update(partial: Partial<OnboardingData>) {
    setData((d) => ({ ...d, ...partial }));
  }

  function onComplete() {
    router.push("/home");
  }

  const steps = [
    <StepWelcome key="welcome" onNext={next} />,
    <StepPointA key="point-a" data={data} onChange={update} onNext={next} />,
    <StepPointB key="point-b" data={data} onChange={update} onNext={next} />,
    <StepPlan key="plan" data={data} onChange={update} onNext={next} />,
    <StepSetup key="setup" data={data} onChange={update} onComplete={onComplete} />,
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <div className="flex-1 overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-in-out h-full"
          style={{ transform: `translateX(-${step * 100}%)` }}
        >
          {steps.map((s, i) => (
            <div key={i} className="min-w-full h-full">
              {s}
            </div>
          ))}
        </div>
      </div>

      {step > 0 && (
        <div className="pb-8 flex justify-center">
          <ProgressDots total={5} current={step} />
        </div>
      )}
    </div>
  );
}
