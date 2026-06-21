"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n";

export default function GoalsPage() {
  const router = useRouter();
  const supabase = createClient();
  const t = useT();

  const [goals, setGoals] = useState({ body: "", money: "", skills: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: prof } = await supabase.from("profiles").select("point_b").eq("id", user.id).single();
      if (prof?.point_b) {
        const pb = prof.point_b as Record<string, string>;
        setGoals({ body: pb.body ?? "", money: pb.money ?? "", skills: pb.skills ?? "" });
      }
    }
    load();
  }, []);

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({
      point_b: { body: goals.body, money: goals.money, social: "", skills: goals.skills },
    }).eq("id", user.id);
    setSaving(false);
  }

  async function onBlur() {
    await save();
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-safe">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => router.back()} className="text-[#6b7280] p-1 -ml-1">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black text-white">{t.goals_title}</h1>
      </header>

      <div className="px-4 pb-24 space-y-5">
        <div>
          <p className="text-white font-semibold text-sm mb-2">{t.goals_body}</p>
          <Textarea
            value={goals.body}
            onChange={(e) => setGoals((g) => ({ ...g, body: e.target.value }))}
            onBlur={onBlur}
            placeholder="Яку фізичну форму хочу мати через 6 місяців?"
            rows={4}
            className="bg-[#111111] border-white/10 text-white placeholder:text-white/20 resize-none"
          />
        </div>

        <div>
          <p className="text-white font-semibold text-sm mb-2">{t.goals_finance}</p>
          <Textarea
            value={goals.money}
            onChange={(e) => setGoals((g) => ({ ...g, money: e.target.value }))}
            onBlur={onBlur}
            placeholder="Яку фінансову ціль хочу досягти?"
            rows={4}
            className="bg-[#111111] border-white/10 text-white placeholder:text-white/20 resize-none"
          />
        </div>

        <div>
          <p className="text-white font-semibold text-sm mb-2">{t.goals_skills}</p>
          <Textarea
            value={goals.skills}
            onChange={(e) => setGoals((g) => ({ ...g, skills: e.target.value }))}
            onBlur={onBlur}
            placeholder="Яких навичок і знань хочу набути?"
            rows={4}
            className="bg-[#111111] border-white/10 text-white placeholder:text-white/20 resize-none"
          />
        </div>

        <div className="bg-[#111111]/60 rounded-2xl px-4 py-3">
          <p className="text-[#6b7280] text-xs leading-relaxed">{t.goals_ai_note}</p>
          {saving && <p className="text-[#00FF85] text-xs mt-1">Збереження...</p>}
        </div>
      </div>
    </div>
  );
}
