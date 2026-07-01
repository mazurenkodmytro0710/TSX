"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/Toaster";
import { cn } from "@/lib/utils";

const COLUMNS = [
  { id: "backlog" as const, label: "Беклог", icon: "📋", color: "#6b7280" },
  { id: "in_progress" as const, label: "В роботі", icon: "⚡", color: "#f59e0b" },
  { id: "done" as const, label: "Зроблено", icon: "✅", color: "#00FF85" },
  { id: "blocked" as const, label: "Заблоковано", icon: "🚫", color: "#ef4444" },
];

type ColId = typeof COLUMNS[number]["id"];

function TaskCard({
  task,
  onMove,
  onDelete,
}: {
  task: Task;
  onMove: (id: string, status: ColId) => void;
  onDelete: (id: string) => void;
}) {
  const otherCols = COLUMNS.filter((c) => c.id !== task.status);
  return (
    <div className="bg-[#111111] rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <button
          onClick={() => onMove(task.id, task.status === "done" ? "backlog" : "done")}
          className={cn(
            "w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 transition-all",
            task.status === "done" ? "bg-[#00FF85] border-[#00FF85]" : "border-white/30"
          )}
        />
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium", task.status === "done" ? "text-[#6b7280] line-through" : "text-white")}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-[#6b7280] text-xs mt-1 line-clamp-2">{task.description}</p>
          )}
          {task.due_date && (
            <p className="text-[#f59e0b] text-xs mt-1">
              📅 {new Date(task.due_date).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-3 pt-3 border-t border-white/5 flex-wrap">
        {otherCols.map((col) => (
          <button
            key={col.id}
            onClick={() => onMove(task.id, col.id)}
            className="text-[10px] text-[#6b7280] flex items-center gap-1 px-2 py-1 bg-[#1a1a1a] rounded-lg"
          >
            {col.icon} {col.label}
          </button>
        ))}
        <button onClick={() => onDelete(task.id)} className="ml-auto text-[#6b7280] active:text-[#ef4444]">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export default function FocusPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeColumn, setActiveColumn] = useState<ColId>("backlog");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", due_date: "", status: "backlog" as ColId });
  const supabase = createClient();

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("priority", { ascending: false });
    setTasks(data ?? []);
  }

  async function saveTask() {
    if (!form.title.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("tasks").insert({
      user_id: user.id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status,
      due_date: form.due_date || null,
      priority: 0,
    });
    setAddOpen(false);
    setForm({ title: "", description: "", due_date: "", status: activeColumn });
    await load();
    showToast("Завдання додано ✓");
  }

  async function moveTask(id: string, status: ColId) {
    await supabase.from("tasks").update({ status }).eq("id", id);
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
  }

  async function deleteTask(id: string) {
    await supabase.from("tasks").delete().eq("id", id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  const columnTasks = tasks.filter((t) => t.status === activeColumn);

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] pt-safe overflow-hidden">
      <header className="shrink-0 px-4 pt-4 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">⚡ Завдання</h1>
        <button
          onClick={() => { setForm((f) => ({ ...f, status: activeColumn })); setAddOpen(true); }}
          className="w-9 h-9 bg-[#00FF85] rounded-full flex items-center justify-center"
        >
          <Plus size={20} className="text-black" strokeWidth={3} />
        </button>
      </header>

      {/* Column tabs */}
      <div className="shrink-0 flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
        {COLUMNS.map((col) => {
          const count = tasks.filter((t) => t.status === col.id).length;
          const active = activeColumn === col.id;
          return (
            <button
              key={col.id}
              onClick={() => setActiveColumn(col.id)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
              style={active ? { backgroundColor: col.color, color: col.id === "done" ? "#000" : "#fff" } : { backgroundColor: "#1a1a1a", color: "#6b7280" }}
            >
              <span>{col.icon}</span>
              <span>{col.label}</span>
              {count > 0 && (
                <span className={cn("text-xs px-1.5 py-0.5 rounded-full", active ? "bg-black/20" : "bg-white/10 text-white")}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tasks list */}
      <div className="flex-1 overflow-y-auto px-4 pb-28">
        {columnTasks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">{COLUMNS.find((c) => c.id === activeColumn)?.icon}</p>
            <p className="text-[#6b7280] text-sm">Немає завдань</p>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {columnTasks
              .sort((a, b) => b.priority - a.priority)
              .map((task) => (
                <TaskCard key={task.id} task={task} onMove={moveTask} onDelete={deleteTask} />
              ))}
          </div>
        )}
      </div>

      {/* Add task sheet */}
      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="Нове завдання">
        <div className="space-y-4 pb-6">
          <div>
            <Label className="text-[#6b7280] text-xs">Назва *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Що потрібно зробити?"
              autoFocus
              className="mt-1 bg-[#1a1a1a] border-white/10 text-white h-12"
            />
          </div>
          <div>
            <Label className="text-[#6b7280] text-xs">Опис</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Деталі..."
              className="mt-1 bg-[#1a1a1a] border-white/10 text-white h-12"
            />
          </div>
          <div>
            <Label className="text-[#6b7280] text-xs">Дедлайн</Label>
            <Input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              className="mt-1 bg-[#1a1a1a] border-white/10 text-white h-12"
            />
          </div>
          <div>
            <Label className="text-[#6b7280] text-xs mb-2 block">Колонка</Label>
            <div className="grid grid-cols-2 gap-2">
              {COLUMNS.map((col) => (
                <button
                  key={col.id}
                  onClick={() => setForm((f) => ({ ...f, status: col.id }))}
                  className={cn("py-2 rounded-xl text-sm font-medium transition-all border", form.status === col.id ? "border-current" : "border-white/10 text-[#6b7280]")}
                  style={form.status === col.id ? { borderColor: col.color, color: col.color } : {}}
                >
                  {col.icon} {col.label}
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={saveTask}
            disabled={!form.title.trim()}
            className="w-full h-12 bg-[#00FF85] text-black font-bold rounded-2xl"
          >
            Додати завдання
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
