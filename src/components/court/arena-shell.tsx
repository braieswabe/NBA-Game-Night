import Link from "next/link";
import { Home, ListOrdered, PlusCircle, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

export function ArenaShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <main className={cn("relative min-h-dvh overflow-hidden bg-[#070707] text-white", className)}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.22),transparent_32%),radial-gradient(circle_at_12%_22%,rgba(239,68,68,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/10 to-transparent" />
      <div className="relative z-10">
        <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-xl">
          <div className="mx-auto flex min-h-16 w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 md:px-8">
            <Link href="/" className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-white">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-amber-300 text-zinc-950">
                <Home className="h-4 w-4" />
              </span>
              Court Legends
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <NavLink href="/" icon={Home} label="Home" />
              <NavLink href="/create-league" icon={PlusCircle} label="Create" />
              <NavLink href="/history" icon={ScrollText} label="Past Games" />
              <NavLink href="/leaderboard" icon={ListOrdered} label="Leaderboard" />
            </div>
          </div>
        </nav>
        {children}
      </div>
    </main>
  );
}

function NavLink({ href, icon: Icon, label }: { href: string; icon: typeof Home; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-xs font-semibold text-zinc-200 transition hover:bg-white/10 hover:text-white"
    >
      <Icon className="h-3.5 w-3.5 text-amber-200" />
      {label}
    </Link>
  );
}
