"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { T6XLogo } from "@/components/T6XLogo";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Пароль має бути мінімум 6 символів");
      return;
    }
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/onboarding");
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
          Почати 6 місяців
        </h1>
        <p className="text-[#6b7280] text-center text-sm mb-8">
          Без виправдань. Без компромісів.
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
              placeholder="мін. 6 символів"
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
            {loading ? "Реєстрація..." : "Зареєструватись"}
          </Button>
        </form>

        <p className="text-center text-[#6b7280] text-sm mt-6">
          Вже є акаунт?{" "}
          <Link href="/login" className="text-[#00FF85]">
            Увійти
          </Link>
        </p>
      </div>
    </div>
  );
}
