"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  ApiError,
  apiCacheHas,
  getCachedApiData,
  getDesignSettings,
  patchDesignSettings,
} from "@/lib/api";
import type { DesignSettings } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { NavBuilder } from "@/components/themes/nav-builder";

export default function NavigationSettingsPage() {
  const { token, refreshUser } = useAuth();

  const [design, setDesign] = useState<DesignSettings | null>(() => {
    if (typeof window === "undefined") return null;
    const t = localStorage.getItem("articurls_token");
    return t ? getCachedApiData<DesignSettings>("/user/design", t) : null;
  });

  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    const t = localStorage.getItem("articurls_token");
    if (!t) return true;
    return !apiCacheHas("/user/design", t);
  });

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getDesignSettings(token)
      .then((d) => {
        setDesign(d);
      })
      .catch((e) => {
        if (e instanceof ApiError) {
          setErr(e.message);
        } else {
          setErr("Failed to load navigation settings.");
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleUpdate = (updates: Partial<DesignSettings>) => {
    setDesign((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const handleSave = async () => {
    if (!token || !design) return;
    setSaving(true);
    setErr(null);
    setSuccess(null);
    try {
      const updated = await patchDesignSettings(token, design);
      setDesign(updated);
      await refreshUser();
      setSuccess("Navigation settings saved successfully.");
    } catch (e) {
      if (e instanceof ApiError) {
        setErr(e.message);
      } else {
        setErr("Failed to save navigation settings.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 sm:space-y-8">
      {/* Top navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors font-medium"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Settings
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Navigation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure brand name, header style, custom links, and CTA buttons.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || loading || !design}
          size="sm"
          className="gap-1.5 self-start sm:self-auto"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Save Changes
        </Button>
      </div>

      <Card className="border-border/70 shadow-xs">
        <CardContent className="pt-6">
          {loading || !design ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : (
            <NavBuilder settings={design} onChange={handleUpdate} />
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          disabled={saving || loading || !design}
          size="sm"
          className="gap-1.5"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Save Changes
        </Button>
      </div>

      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} variant="error" />
      <FloatingErrorToast
        message={success}
        onDismiss={() => setSuccess(null)}
        variant="success"
        autoDismissMs={3000}
      />
    </div>
  );
}
