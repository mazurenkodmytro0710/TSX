"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Plus, Mic, MicOff, ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Note, Skill } from "@/lib/types";
import { awardXP, checkNoteAchievements } from "@/lib/achievements";
import { XP_REWARDS } from "@/lib/xp";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const NOTE_TYPES = [
  { value: "thought", label: "💭 Думка" },
  { value: "reflection", label: "📔 Рефлексія" },
  { value: "insight", label: "🎯 Інсайт" },
] as const;

type NoteType = "thought" | "reflection" | "insight";

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [filter, setFilter] = useState<NoteType | "all">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    type: "thought" as NoteType,
    content: "",
    linkedSkillId: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });
  const [isRecording, setIsRecording] = useState(false);
  const [notePhoto, setNotePhoto] = useState<{ file: File; preview: string } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: n }, { data: sk }] = await Promise.all([
      supabase.from("notes").select("*, skill:skills(*)").eq("user_id", user.id).order("date", { ascending: false }),
      supabase.from("skills").select("*").eq("user_id", user.id).eq("is_active", true),
    ]);

    setNotes(n ?? []);
    setSkills(sk ?? []);
  }

  function startRecording() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    recognition.lang = "uk-UA";
    recognition.continuous = true;
    recognition.interimResults = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      setForm((f) => ({ ...f, content: transcript }));
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
    if (navigator.vibrate) navigator.vibrate(10);
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
  }

  async function saveNote() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !form.content.trim()) return;

    let photoUrl: string | null = null;
    if (notePhoto?.file) {
      const ext = notePhoto.file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("note-photos").upload(path, notePhoto.file);
      if (!error) {
        photoUrl = supabase.storage.from("note-photos").getPublicUrl(path).data.publicUrl;
      }
    }

    await supabase.from("notes").insert({
      user_id: user.id,
      type: form.type,
      content: form.content.trim(),
      linked_skill_id: form.linkedSkillId || null,
      date: form.date,
      ...(photoUrl ? { photo_url: photoUrl } : {}),
    });

    await awardXP(user.id, XP_REWARDS.NOTE_ADDED, "Нотатка додана");
    await checkNoteAchievements(user.id, false);
    await load();
    setAddOpen(false);
    setNotePhoto(null);
    setForm({ type: "thought", content: "", linkedSkillId: "", date: format(new Date(), "yyyy-MM-dd") });
    if (navigator.vibrate) navigator.vibrate(10);
  }

  const filtered = filter === "all" ? notes : notes.filter((n) => n.type === filter);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-safe pb-4">
      <header className="px-4 pt-4 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">📝 Нотатки</h1>
        <button
          onClick={() => setAddOpen(true)}
          className="bg-[#00FF85] text-black w-9 h-9 rounded-full flex items-center justify-center"
        >
          <Plus size={20} strokeWidth={3} />
        </button>
      </header>

      {/* Filter */}
      <div className="px-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap",
            filter === "all" ? "bg-[#00FF85] text-black" : "bg-[#111111] text-[#6b7280]"
          )}
        >
          Всі
        </button>
        {NOTE_TYPES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap",
              filter === value ? "bg-[#00FF85] text-black" : "bg-[#111111] text-[#6b7280]"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 mt-3 space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#6b7280] text-sm">Поки немає нотаток</p>
            <p className="text-[#6b7280] text-xs mt-1">Натисни + щоб додати</p>
          </div>
        )}

        {filtered.map((note) => (
          <div key={note.id} className="bg-[#111111] rounded-2xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#1a1a1a] text-[#6b7280]">
                  {NOTE_TYPES.find((t) => t.value === note.type)?.label}
                </span>
                {note.skill && (
                  <span className="text-xs text-[#6b7280]">
                    {(note.skill as Skill).icon} {(note.skill as Skill).name}
                  </span>
                )}
              </div>
              <span className="text-[#6b7280] text-xs">{note.date.slice(5).replace("-", ".")}</span>
            </div>
            <p className="text-white text-sm leading-relaxed">{note.content}</p>
            {(note as Note & { photo_url?: string }).photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={(note as Note & { photo_url?: string }).photo_url!}
                alt=""
                className="w-full h-[140px] object-cover rounded-xl mt-2"
                onClick={() => window.open((note as Note & { photo_url?: string }).photo_url!, "_blank")}
              />
            )}
          </div>
        ))}
      </div>

      <BottomSheet open={addOpen} onClose={() => { setAddOpen(false); stopRecording(); setNotePhoto(null); }} title="Нова нотатка">
        <div className="space-y-4 pb-6">
          {/* Type selector */}
          <div className="flex gap-2">
            {NOTE_TYPES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setForm((f) => ({ ...f, type: value }))}
                className={cn(
                  "flex-1 py-2 rounded-xl text-xs font-semibold border transition-all",
                  form.type === value
                    ? "border-[#00FF85] bg-[#00FF85]/10 text-[#00FF85]"
                    : "border-white/10 text-[#6b7280]"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="relative">
            <Textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="Запиши думку, інсайт або рефлексію..."
              rows={5}
              className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/20 resize-none pr-12"
            />
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={cn(
                "absolute right-3 bottom-3 w-8 h-8 rounded-full flex items-center justify-center transition-all",
                isRecording ? "bg-[#ef4444] animate-pulse" : "bg-[#1a1a1a] text-[#6b7280]"
              )}
            >
              {isRecording ? <MicOff size={14} className="text-white" /> : <Mic size={14} />}
            </button>
          </div>

          {isRecording && (
            <p className="text-[#ef4444] text-xs text-center animate-pulse">🎤 Запис...</p>
          )}

          {/* Photo attachment */}
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setNotePhoto({ file, preview: URL.createObjectURL(file) });
            }}
          />
          {notePhoto ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={notePhoto.preview} alt="" className="w-full h-[160px] object-cover rounded-2xl" />
              <button
                onClick={() => setNotePhoto(null)}
                className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white text-xs"
              >✕</button>
            </div>
          ) : (
            <button
              onClick={() => photoInputRef.current?.click()}
              className="flex items-center gap-2 text-[#6b7280] text-sm py-1"
            >
              <ImageIcon size={16} />
              <span>Додати фото з галереї</span>
            </button>
          )}

          {/* Link to skill */}
          {skills.length > 0 && (
            <div>
              <p className="text-[#6b7280] text-xs mb-2">Зв&apos;язати зі скілом (необов&apos;язково)</p>
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setForm((f) => ({ ...f, linkedSkillId: f.linkedSkillId === s.id ? "" : s.id }))}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs border",
                      form.linkedSkillId === s.id
                        ? "border-[#00FF85] bg-[#00FF85]/10 text-[#00FF85]"
                        : "border-white/10 text-[#6b7280]"
                    )}
                  >
                    {s.icon} {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={saveNote}
            disabled={!form.content.trim()}
            className="w-full h-12 bg-[#00FF85] text-black font-bold rounded-2xl disabled:opacity-40"
          >
            Зберегти
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
