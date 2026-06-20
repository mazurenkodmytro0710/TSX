"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { T6XLogo } from "@/components/T6XLogo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/home");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex justify-center mb-8">
          <T6XLogo size={64} />
        </div>

        <h1 className="text-2xl font-bold text-white text-center mb-1">
          З поверненням
        </h1>
        <p className="text-[#6b7280] text-center text-sm mb-8">
          6 місяців. Без виправдань.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-[#6b7280] text-sm">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="mt-1.5 bg-[#111111] border-white/10 text-white placeholder:text-white/20 h-12"
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-[#6b7280] text-sm">
              Пароль
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="mt-1.5 bg-[#111111] border-white/10 text-white placeholder:text-white/20 h-12"
            />
          </div>

          {error && (
            <p className="text-[#ef4444] text-sm text-center">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#00FF85] text-black font-bold text-base hover:bg-[#00e876] transition-colors"
          >
            {loading ? "Вхід..." : "Увійти"}
          </Button>
        </form>

        <p className="text-center text-[#6b7280] text-sm mt-6">
          Немає акаунту?{" "}
          <Link href="/signup" className="text-[#00FF85]">
            Зареєструватись
          </Link>
        </p>
      </div>
    </div>
  );
}
