import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, goal_start_date")
    .eq("id", user.id)
    .single();

  if (!profile?.name || !profile?.goal_start_date) redirect("/onboarding");

  redirect("/home");
}
