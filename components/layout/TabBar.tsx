"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, Brain, Wallet, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

const TAB_DEFS = [
  { href: "/home",      icon: Home,     key: "nav_home"     },
  { href: "/body",      icon: Dumbbell, key: "nav_body"     },
  { href: "/focus",     icon: Brain,    key: "nav_focus"    },
  { href: "/finance",   icon: Wallet,   key: "nav_finance"  },
  { href: "/analytics", icon: BarChart3, key: "nav_analytics" },
] as const;

export function TabBar() {
  const pathname = usePathname();
  const t = useT();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#111111] border-t border-white/5 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex items-center justify-around px-2 h-[49px]">
        {TAB_DEFS.map(({ href, icon: Icon, key }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 h-full justify-center rounded-xl transition-colors min-w-[60px]",
                active ? "text-[#00FF85]" : "text-[#6b7280]"
              )}
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(5);
              }}
            >
              <Icon
                size={28}
                strokeWidth={active ? 2.5 : 1.8}
                className={active ? "drop-shadow-[0_0_6px_#00FF85]" : ""}
              />
              <span className="text-[10px] font-medium leading-none">{t[key]}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
