"use client";

import { useState, useEffect, useRef } from "react";
import { format, differenceInDays } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { BodyMeasurement } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { showToast } from "@/components/ui/Toaster";
import { Camera } from "lucide-react";

const FIELDS: { key: keyof BodyMeasurement; label: string; unit: string }[] = [
  { key: "weight_kg", label: "Вага", unit: "кг" },
  { key: "waist_cm", label: "Талія", unit: "см" },
  { key: "chest_cm", label: "Груди", unit: "см" },
  { key: "shoulders_cm", label: "Плечі", unit: "см" },
  { key: "bicep_cm", label: "Біцепс", unit: "см" },
  { key: "legs_cm", label: "Ноги", unit: "см" },
];

export function MeasurementsSection() {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("body_measurements")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(30);
    setMeasurements(data ?? []);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
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

    await load();
    setSheetOpen(false);
    setForm({});
    setPhotoFile(null);
    setPhotoPreview(null);
    setSaving(false);
    showToast("Виміри збережено ✓");
  }

  const latest = measurements[0];
  const daysSince = latest
    ? differenceInDays(new Date(), new Date(latest.date))
    : null;

  const chartData = [...measurements].reverse().slice(-20).map((m) => ({
    date: m.date.slice(5),
    weight: m.weight_kg,
  }));

  return (
    <div className="space-y-4 pb-6">
      {/* Last measurement */}
      <div className="bg-[#111111] rounded-2xl p-4">
        {latest ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-semibold">Останні заміри</p>
              <span className="text-[#6b7280] text-xs">
                {daysSince === 0 ? "сьогодні" : `${daysSince} дн тому`}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {FIELDS.map(({ key, label, unit }) => {
                const val = latest[key];
                if (!val) return null;
                return (
                  <div key={key} className="bg-[#1a1a1a] rounded-xl p-2 text-center">
                    <p className="text-white font-bold text-sm">{val as number}{unit}</p>
                    <p className="text-[#6b7280] text-xs">{label}</p>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-[#6b7280] text-sm text-center py-2">
            Ще немає замірів
          </p>
        )}

        {daysSince !== null && daysSince >= 7 && (
          <div className="mt-3 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-xl px-3 py-2">
            <p className="text-[#f59e0b] text-xs">⚠️ Час зробити тижневі заміри!</p>
          </div>
        )}
      </div>

      <Button
        onClick={() => setSheetOpen(true)}
        className="w-full h-12 bg-[#00FF85] text-black font-bold rounded-2xl"
      >
        Внести заміри
      </Button>

      {/* Weight chart */}
      {chartData.length > 1 && (
        <div className="bg-[#111111] rounded-2xl p-4">
          <p className="text-white font-semibold mb-3">Вага (кг)</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ background: "#1a1a1a", border: "none", borderRadius: "12px", color: "white", fontSize: 12 }}
              />
              <Line type="monotone" dataKey="weight" stroke="#00FF85" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <BottomSheet open={sheetOpen} onClose={() => { setSheetOpen(false); setPhotoFile(null); setPhotoPreview(null); }} title="Внести заміри">
        <div className="space-y-3 pb-6">
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map(({ key, label, unit }) => (
              <div key={key as string}>
                <Label className="text-[#6b7280] text-xs">{label} ({unit})</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={form[key as string] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [key as string]: e.target.value }))}
                  placeholder="0"
                  className="mt-1 bg-[#1a1a1a] border-white/10 text-white h-11"
                />
              </div>
            ))}
          </div>

          {/* Photo */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoChange}
          />
          {photoPreview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPreview} alt="preview" className="w-full h-40 object-cover rounded-xl" />
              <button
                onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-14 border border-dashed border-white/15 rounded-xl flex items-center justify-center gap-2 text-[#6b7280] text-sm"
            >
              <Camera size={16} /> Додати фото
            </button>
          )}

          <Button
            onClick={save}
            disabled={saving}
            className="w-full h-12 bg-[#00FF85] text-black font-bold rounded-2xl mt-2"
          >
            {saving ? "Збереження..." : "Зберегти"}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
