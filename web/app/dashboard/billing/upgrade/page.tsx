"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  createCheckout,
  getSubscription,
  getAccountUsage,
  ApiError,
  isProSubscription,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { SubscriptionOut, AccountUsage } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  ChevronLeft,
  Sparkles,
  Mail,
} from "lucide-react";
import { FloatingErrorToast } from "@/components/floating-error-toast";

const VIEW_TIERS = [
  { id: "10k", label: "Up to 10k views", price: 9, views: 10_000 },
  { id: "50k", label: "Up to 50k views", price: 29, views: 50_000 },
  { id: "100k", label: "Up to 100k views", price: 49, views: 100_000, popular: true },
  { id: "250k", label: "Up to 250k views", price: 79, views: 250_000 },
  { id: "500k", label: "Up to 500k views", price: 99, views: 500_000 },
  { id: "1m", label: "Up to 1M views", price: 149, views: 1_000_000 },
  { id: "custom", label: "1M+ views (Custom)", price: null, views: null },
];

export default function UpgradePlanPage() {
  const { token } = useAuth();
  const [sub, setSub] = useState<SubscriptionOut | null>(null);
  const [usage, setUsage] = useState<AccountUsage | null>(null);
  const [selectedTierIndex, setSelectedTierIndex] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    try {
      const [s, u] = await Promise.all([
        getSubscription(token).catch(() => null),
        getAccountUsage(token).catch(() => null),
      ]);
      setSub(s);
      setUsage(u);

      if (u) {
        const matchingIdx = VIEW_TIERS.findIndex((tier) => tier.views === u.tier_limit);
        if (matchingIdx !== -1) {
          setSelectedTierIndex(matchingIdx);
        }
      }
    } catch {
      setErr("Failed to load subscription info");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpgrade(planId = "pro") {
    if (!token) return;
    setBusyPlan(planId);
    try {
      const { checkout_url } = await createCheckout(token, "monthly");
      window.location.href = checkout_url;
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to start checkout");
      setBusyPlan(null);
    }
  }

  const pro = isProSubscription(sub);
  const selectedTier = VIEW_TIERS[selectedTierIndex] || VIEW_TIERS[0];
  const isCustomTier = selectedTier.id === "custom";
  const isCurrentActiveTier = pro && usage && usage.tier_limit === selectedTier.views;

  return (
    <div className="mx-auto max-w-[800px] space-y-6 sm:space-y-8">
      {/* Back link & Header */}
      <div>
        <Link
          href="/dashboard/billing"
          className="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" />
          Back to Billing
        </Link>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Select Subscription Plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All platform features are included on every tier. Choose the monthly traffic volume that matches your growth.
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : (
        <Card className="relative overflow-hidden border-2 border-primary/40 bg-gradient-to-b from-card to-muted/10 shadow-sm rounded-2xl">
          <div className="absolute top-0 right-0 bg-primary/10 text-primary px-4 py-1.5 rounded-bl-xl text-xs font-semibold flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Simple, Traffic-Based Pricing
          </div>

          <CardContent className="p-6 sm:p-8 space-y-8">
            {/* Views Selector Header */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Select Traffic Volume
              </label>
              <Select
                value={String(selectedTierIndex)}
                onValueChange={(val) => setSelectedTierIndex(Number(val))}
              >
                <SelectTrigger className="w-full h-12 bg-background border-border/80 text-foreground">
                  <SelectValue placeholder="Choose monthly traffic volume" />
                </SelectTrigger>
                <SelectContent>
                  {VIEW_TIERS.map((tier, idx) => (
                    <SelectItem key={tier.id} value={String(idx)} className="py-2.5 cursor-pointer">
                      <div className="flex items-center justify-between gap-4 w-full">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm">{tier.label}</span>
                          {tier.popular ? (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                              Popular
                            </span>
                          ) : null}
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">
                          {tier.price !== null ? `$${tier.price}/mo` : "Custom"}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price Display */}
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 p-5 rounded-2xl bg-muted/40 border border-border/70">
              <div>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-1">
                  {isCustomTier ? "Enterprise Volume" : `Tier: ${selectedTier.label}`}
                </span>
                <div className="flex items-baseline gap-1.5">
                  {isCustomTier ? (
                    <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                      Custom Pricing
                    </span>
                  ) : (
                    <>
                      <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                        ${selectedTier.price}
                      </span>
                      <span className="text-sm text-muted-foreground font-medium">/ month</span>
                    </>
                  )}
                </div>
              </div>

              {isCustomTier ? (
                <Button asChild className="h-11 px-6 gap-2">
                  <Link href="/dashboard/support">
                    <Mail className="h-4 w-4" />
                    Contact Us for Enterprise
                  </Link>
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="h-11 px-8 text-sm font-semibold"
                  variant={isCurrentActiveTier ? "outline" : "default"}
                  disabled={isCurrentActiveTier || busyPlan === selectedTier.id}
                  onClick={() => handleUpgrade(selectedTier.id)}
                >
                  {isCurrentActiveTier
                    ? "Current Active Tier"
                    : busyPlan === selectedTier.id
                      ? "Redirecting..."
                      : `Select Plan ($${selectedTier.price}/mo)`}
                </Button>
              )}
            </div>

            {/* Included Features Grid */}
            <div className="space-y-3 pt-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Everything Included In Every Plan
              </p>
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span>{isCustomTier ? "1,000,000+ monthly views" : `${selectedTier.views?.toLocaleString()} monthly pageviews`}</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span>Unlimited sites & publications</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span>Custom domains + Cloudflare Subfolder</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span>Privacy-friendly Umami Analytics</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span>Automated SEO Engine & RSS / Atom feeds</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span>Custom CSS & HTML code injection</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {err ? <FloatingErrorToast message={err} onDismiss={() => setErr(null)} /> : null}
    </div>
  );
}
