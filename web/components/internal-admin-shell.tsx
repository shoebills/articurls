"use client";

import { useState } from "react";
import { CreditCard, FileCode2, LogOut, Users, UserRoundPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const sections = [
  { key: "users", label: "Users", icon: Users },
  { key: "payments", label: "Payments", icon: CreditCard },
  { key: "username_requests", label: "Username requests", icon: UserRoundPen },
] as const;

export type AdminSection = (typeof sections)[number]["key"];

export function InternalAdminShell({
  section,
  onSectionChange,
  children,
}: {
  section: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { logout } = useAuth();

  return (
    <div className="flex min-h-dvh bg-[#f8fafc]">
      <aside className="hidden w-64 shrink-0 border-r border-border/70 bg-background p-4 md:block">
        <p className="mb-4 inline-flex items-center gap-2 text-lg font-semibold">
          <FileCode2 className="h-5 w-5" />
          Internal Admin
        </p>
        <nav className="space-y-1">
          {sections.map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              type="button"
              variant="ghost"
              className={cn("h-10 w-full justify-start gap-2", section === key && "bg-muted text-foreground")}
              onClick={() => onSectionChange(key)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </nav>
        <div className="mt-6 border-t border-border/70 pt-4">
          <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background px-4 py-3 md:hidden">
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen((v) => !v)}>
              Menu
            </Button>
            <Button type="button" variant="outline" className="gap-2" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </div>
          {open ? (
            <div className="mt-3 space-y-1">
              {sections.map(({ key, label, icon: Icon }) => (
                <Button
                  key={key}
                  type="button"
                  variant="ghost"
                  className={cn("h-10 w-full justify-start gap-2", section === key && "bg-muted text-foreground")}
                  onClick={() => {
                    onSectionChange(key);
                    setOpen(false);
                  }}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              ))}
            </div>
          ) : null}
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
