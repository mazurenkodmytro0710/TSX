"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BodyMeasurement } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { showToast } from "@/components/ui/Toaster";
import { awardXP, checkMeasurementAchievements } from "@/lib/achievements";
import { XP_REWARDS } from "@/lib/xp";
import { format, differenceInDays } from "date-fns";

const FIELDS: { key: keyof BodyMeasurement; label: string; unit: string }[] = [
  { key: "weight_kg", label: "Вага", unit: "кг" },
  { key: "waist_cm", label: "Талія", unit: "см" },
  { key: "chest_cm", label: "Груди", unit: "см" },
  { key: "shoulders_cm", label: "Плечі", unit: "см" },
  { key: "bicep_cm", label: "Біцепс", unit: "см" },
  { key: "legs_cm", label: "Ноги", unit: "см" },
];

function MeasRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#1a1a1a] rounded-xl p-2 text-center">
      <p className="text-white font-bold text-sm">{value}</p>
      <p className="text-[#6b7280] text-xs">{label}</p>
    </div>
  );
}

export function MeasurementsSection() {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("body_measurements")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });
    setMeasurements(data ?? []);
  }

  async function checkCanAdd(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const { data } = await supabase
      .from("body_measurements")
      .select("id, date")
      .eq("user_id", user.id)
      .gte("date", oneWeekAgo.toISOString().split("T")[0])
      .order("date", { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      const daysAgo = differenceInDays(new Date(), new Date(data[0].date));
      const daysLeft = 7 - daysAgo;
      showToast(`Наступні заміри через ${daysLeft} дн.`, "error");
      return false;
    }
    return true;
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    e.target.value = "";
  }

  function startTimerPhoto() {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(interval); cameraInputRef.current?.click(); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function clearPhoto() { setPhotoFile(null); setPhotoPreview(null); }

  async function openSheet() {
    const ok = await checkCanAdd();
    if (ok) { setSheetOpen(true); }
  }

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let photoUrl: string | null = null;
    if (photoFile) {
      const ext = photoFile.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("measurement-photos")
        .upload(path, photoFile, { upsert: false });
      if (!uploadErr) {
        const { data: urlData } = supabase.storage
          .from("measurement-photos")
          .getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }
    }

    await supabase.from("body_measurements").insert({
      user_id: user.id,
      date: format(new Date(), "yyyy-MM-dd"),
      weight_kg: parseFloat(form.weight_kg) || null,
      waist_cm: parseFloat(form.waist_cm) || null,
      chest_cm: parseFloat(form.chest_cm) || null,
      shoulders_cm: parseFloat(form.shoulders_cm) || null,
      bicep_cm: parseFloat(form.bicep_cm) || null,
      legs_cm: parseFloat(form.legs_cm) || null,
      photo_url: photoUrl,
    });

    await awardXP(user.id, XP_REWARDS.MEASUREMENTS_LOGGED, "Заміри внесено");
    await checkMeasurementAchievements(user.id);
    await load();
    setSheetOpen(false);
    setForm({});
    clearPhoto();
    setSaving(false);
    showToast("Виміри збережено ✓");
  }

  async function deleteMeasurement(id: string) {
    if (!confirm("Видалити цей запис?")) return;
    await supabase.from("body_measurements").delete().eq("id", id);
    await load();
  }

  return (
    <div className="space-y-4 pb-6">
      <Button
        onClick={openSheet}
        className="w-full h-12 bg-[#00FF85] text-black font-bold rounded-2xl"
      >
        + Внести заміри
      </Button>

      {/* History list — newest first */}
      {measurements.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📏</p>
          <p className="text-[#6b7280] text-sm">Ще немає замірів</p>
        </div>
      ) : (
        <div className="space-y-3">
          {measurements.map((m) => (
            <div key={m.id} className="bg-[#111111] rounded-2xl p-4">
              <div className="flex justify-between items-center mb-3">
                <p className="text-white font-semibold text-sm">
                  {new Date(m.date).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })}
                </p>
                <button onClick={() => deleteMeasurement(m.id)} className="text-[#6b7280] active:text-[#ef4444] p-1">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {m.weight_kg && <MeasRow label="Вага" value={`${m.weight_kg} кг`} />}
                {m.waist_cm && <MeasRow label="Талія" value={`${m.waist_cm} см`} />}
                {m.chest_cm && <MeasRow label="Груди" value={`${m.chest_cm} см`} />}
                {m.bicep_cm && <MeasRow label="Біцепс" value={`${m.bicep_cm} см`} />}
                {m.shoulders_cm && <MeasRow label="Плечі" value={`${m.shoulders_cm} см`} />}
                {m.legs_cm && <MeasRow label="Ноги" value={`${m.legs_cm} см`} />}
              </div>
              {m.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.photo_url} alt="progress" className="w-full h-[160px] object-cover rounded-xl mt-3" />
              )}
            </div>
          ))}
        </div>
      )}

      <BottomSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); clearPhoto(); }}
        title="Внести заміри"
      >
        <div className="space-y-3 pb-6">
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map(({ key, label, unit }) => (
              <div key={key as string}>
                <Label className="text-[#6b7280] text-xs">{label} ({unit})</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={form[key as string] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [key as string]: e.target.value }))}
                  placeholder="0"
                  className="mt-1 bg-[#1a1a1a] border-white/10 text-white h-11"
                />
              </div>
            ))}
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />

          {!photoPreview ? (
            <div className="mt-2">
              <p className="text-sm text-[#6b7280] mb-3">Фото прогресу</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => fileInputRef.current?.click()}
                  className="h-[80px] bg-[#1a1a1a] rounded-2xl flex flex-col items-center justify-center gap-1 border border-white/5">
                  <span className="text-2xl">🖼️</span>
                  <span className="text-xs text-[#6b7280]">З галереї</span>
                </button>
                <button onClick={startTimerPhoto} disabled={countdown > 0}
                  className="h-[80px] bg-[#1a1a1a] rounded-2xl flex flex-col items-center justify-center gap-1 border border-white/5">
                  {countdown > 0 ? (
                    <span className="text-3xl font-bold text-[#00FF85]">{countdown}</span>
                  ) : (
                    <><span className="text-2xl">📸</span><span className="text-xs text-[#6b7280]">Таймер 3с</span></>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="relative mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPreview} alt="preview" className="w-full h-[180px] object-cover rounded-2xl" />
              <button onClick={clearPhoto}
                className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white text-sm">
                ✕
              </button>
            </div>
          )}

          <Button onClick={save} disabled={saving} className="w-full h-12 bg-[#00FF85] text-black font-bold rounded-2xl mt-2">
            {saving ? "Збереження..." : "Зберегти"}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
