"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  MessageSquare,
  Plug,
  Workflow,
  Home,
  Menu,
  X,
  Circle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useViktor } from "@/lib/viktor/store";
import { ViktorWordmark } from "@/components/viktor-logo";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/dashboards", label: "Dashboards", icon: LayoutDashboard },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/automations", label: "Automations", icon: Workflow },
  { href: "/activity", label: "Activity", icon: Activity },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { connectedCount, automations } = useViktor();
  const activeAutomations = automations.filter((a) => a.enabled).length;

  const badgeFor = (href: string) => {
    if (href === "/integrations") return `${connectedCount}`;
    if (href === "/automations") return `${activeAutomations}`;
    return null;
  };

  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        const badge = badgeFor(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            data-active={active}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
            )}
          >
            <item.icon className="size-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {badge ? (
              <Badge
                variant="secondary"
                className="h-5 min-w-5 justify-center px-1.5 text-[11px] tabular-nums"
              >
                {badge}
              </Badge>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center justify-between px-1">
        <Link href="/" onClick={onNavigate}>
          <ViktorWordmark />
        </Link>
      </div>

      <NavLinks onNavigate={onNavigate} />

      <div className="mt-auto rounded-xl border bg-sidebar-accent/40 p-3">
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/70" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          Viktor is online
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Working in Slack &amp; Teams. $100 in credits remaining.
        </p>
        <Button asChild size="sm" className="mt-3 w-full">
          <Link href="/chat" onClick={onNavigate}>
            Assign a task
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen w-full">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r bg-sidebar lg:block">
        <SidebarContent />
      </aside>

      {/* mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 border-r bg-sidebar shadow-xl">
            <div className="flex justify-end p-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="size-4" />
              </Button>
            </div>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>
          <div className="lg:hidden">
            <ViktorWordmark />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Badge variant="outline" className="hidden gap-1.5 sm:flex">
              <Circle className="size-2 fill-emerald-500 text-emerald-500" />
              All systems operational
            </Badge>
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                You
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
