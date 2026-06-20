import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { buildGrokPrompt, aggregateWeeklyData } from "@/lib/utils/aggregator";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const weekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
  const startStr = format(weekStart, "yyyy-MM-dd");
  const endStr = format(weekEnd, "yyyy-MM-dd");

  // Get all users with Grok API key
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, point_b, grok_api_key")
    .not("grok_api_key", "is", null);

  if (!profiles?.length) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  let processed = 0;

  for (const profile of profiles) {
    try {
      const userId = profile.id;

      const [{ data: skills }, { data: logs }, { data: sessions }, { data: workouts }, { data: nutrition }, { data: measurements }, { data: transactions }, { data: notes }] = await Promise.all([
        supabase.from("skills").select("*, habits(*)").eq("user_id", userId).eq("is_active", true),
        supabase.from("daily_logs").select("*").eq("user_id", userId).gte("date", startStr).lte("date", endStr),
        supabase.from("deep_work_sessions").select("*").eq("user_id", userId).gte("date", startStr).lte("date", endStr),
        supabase.from("workout_sessions").select("*").eq("user_id", userId).gte("date", startStr).lte("date", endStr),
        supabase.from("nutrition_logs").select("*").eq("user_id", userId).gte("date", startStr).lte("date", endStr),
        supabase.from("body_measurements").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(2),
        supabase.from("transactions").select("*").eq("user_id", userId).gte("date", startStr).lte("date", endStr),
        supabase.from("notes").select("*").eq("user_id", userId).gte("date", startStr).lte("date", endStr),
      ]);

      const weeklyData = aggregateWeeklyData(
        sessions ?? [],
        skills ?? [],
        logs ?? [],
        workouts ?? [],
        nutrition ?? [],
        measurements ?? [],
        transactions ?? [],
        notes ?? [],
        weekStart,
        weekEnd
      );

      const pointB = profile.point_b ?? {};
      const prompt = buildGrokPrompt(weeklyData, pointB);

      const grokRes = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${profile.grok_api_key}`,
        },
        body: JSON.stringify({
          model: "grok-3-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 800,
        }),
      });

      if (!grokRes.ok) continue;

      const grokData = await grokRes.json();
      const raw: string = grokData.choices?.[0]?.message?.content ?? "";

      // Parse the 3-section response
      const good: string[] = [];
      const improve: string[] = [];
      let focus = "";

      const lines = raw.split("\n");
      let section = "";
      for (const line of lines) {
        if (line.includes("ЩО ДОБРЕ")) section = "good";
        else if (line.includes("ЩО ПОКРАЩИТИ")) section = "improve";
        else if (line.includes("ФОКУС")) section = "focus";
        else if (line.startsWith("•") || line.startsWith("-")) {
          const text = line.replace(/^[•\-]\s*/, "").trim();
          if (section === "good" && text) good.push(text);
          if (section === "improve" && text) improve.push(text);
        } else if (section === "focus" && line.trim()) {
          focus += line.trim() + " ";
        }
      }

      await supabase.from("ai_reports").upsert({
        user_id: userId,
        week_start: startStr,
        week_end: endStr,
        report_json: { good, improve, focus: focus.trim(), raw },
        generated_at: new Date().toISOString(),
      }, { onConflict: "user_id,week_start" });

      // Send push notification
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({
          userId,
          title: "T6X 📊",
          body: "Твій тижневий звіт готовий!",
        }),
      });

      processed++;
    } catch {
      // Continue with next user
    }
  }

  return NextResponse.json({ ok: true, processed });
}
