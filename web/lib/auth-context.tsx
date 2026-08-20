"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SubscriptionOut, UserSettings, SiteSummary } from "@/lib/types";
import { getMe, getSubscription, isProSubscription, login as apiLogin, apiLogout, listSites, clearApiCache } from "@/lib/api";

const TOKEN_KEY = "articurls_token";
const SITE_KEY = "articurls_site_id";

type AuthContextValue = {
  token: string | null;
  user: UserSettings | null;
  sites: SiteSummary[];
  activeSite: SiteSummary | null;
  subscription: SubscriptionOut | null;
  isPro: boolean;
  wasPro: boolean;
  isTrial: boolean;
  daysRemaining: number | null;
  loading: boolean;
  login: (email: string, password: string, redirectTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshSites: () => Promise<void>;
  switchSite: (siteId: number) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getDaysRemaining(sub: SubscriptionOut | null): number | null {
  if (!sub || !sub.current_period_end) return null;
  if (sub.plan_type === "lifetime") return null;
  const end = new Date(sub.current_period_end);
  const now = new Date();
  const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 0;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserSettings | null>(null);
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [activeSite, setActiveSite] = useState<SiteSummary | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionOut | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSites = useCallback(async () => {
    const t = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (!t) {
      setSites([]);
      setActiveSite(null);
      return;
    }
    try {
      const siteList = await listSites(t);
      setSites(siteList);
      const storedSiteId = localStorage.getItem(SITE_KEY);
      const current = siteList.find((s) => String(s.site_id) === storedSiteId) || siteList[0] || null;
      if (current) {
        localStorage.setItem(SITE_KEY, String(current.site_id));
        setActiveSite(current);
      }
    } catch {
      // Ignore
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const t = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (!t) {
      setUser(null);
      setSubscription(null);
      setSites([]);
      setActiveSite(null);
      return;
    }
    try {
      const [me, sub, siteList] = await Promise.all([
        getMe(t),
        getSubscription(t),
        listSites(t).catch(() => [] as SiteSummary[]),
      ]);
      setUser(me);
      setSubscription(sub);
      setSites(siteList);

      const storedSiteId = localStorage.getItem(SITE_KEY);
      const current = siteList.find((s) => String(s.site_id) === storedSiteId) || siteList[0] || null;
      if (current) {
        localStorage.setItem(SITE_KEY, String(current.site_id));
        setActiveSite(current);
      }
    } catch (err: unknown) {
      const status = (err as { status?: number; response?: { status?: number } })?.status || (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(SITE_KEY);
        setToken(null);
        setUser(null);
        setSubscription(null);
        setSites([]);
        setActiveSite(null);
      }
    }
  }, []);

  const switchSite = useCallback(async (siteId: number) => {
    localStorage.setItem(SITE_KEY, String(siteId));
    clearApiCache();
    const target = sites.find((s) => s.site_id === siteId) || null;
    if (target) setActiveSite(target);
    await refreshUser();
    
    // If currently on a site-specific edit/create subroute, redirect to the list view; otherwise reload current view
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path.includes("/edit") || path.includes("/new")) {
        window.location.href = "/dashboard/posts";
      } else {
        window.location.reload();
      }
    }
  }, [sites, refreshUser]);

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    setToken(t);
    if (!t) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [me, sub, siteList] = await Promise.all([
          getMe(t),
          getSubscription(t),
          listSites(t).catch(() => [] as SiteSummary[]),
        ]);
        setUser(me);
        setSubscription(sub);
        setSites(siteList);

        const storedSiteId = localStorage.getItem(SITE_KEY);
        const current = siteList.find((s) => String(s.site_id) === storedSiteId) || siteList[0] || null;
        if (current) {
          localStorage.setItem(SITE_KEY, String(current.site_id));
          setActiveSite(current);
        }
      } catch (err: unknown) {
        const status = (err as { status?: number; response?: { status?: number } })?.status || (err as { response?: { status?: number } })?.response?.status;
        if (status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(SITE_KEY);
          setToken(null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(
    async (email: string, password: string, redirectTo = "/dashboard") => {
      const res = await apiLogin(email, password);
      localStorage.setItem(TOKEN_KEY, res.access_token);
      setToken(res.access_token);
      await refreshUser();
      if (redirectTo === "/dashboard") {
        const plan = localStorage.getItem("pendingPlan");
        localStorage.removeItem("pendingPlan");
        if (plan === "pro" || plan === "lifetime") {
          router.push(`/dashboard/billing?plan=${plan}`);
          return;
        }
      }
      router.push(redirectTo);
    },
    [refreshUser, router]
  );

  const logout = useCallback(async () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setSubscription(null);
    await apiLogout();
    router.push("/login");
  }, [router]);

  const isPro = isProSubscription(subscription);
  const wasPro = !!(subscription && ["trial", "pro", "lifetime"].includes(subscription.plan_type));
  const isTrial = subscription?.plan_type === "trial";
  const daysRemaining = getDaysRemaining(subscription);

  const value = useMemo(
    () => ({
      token,
      user,
      sites,
      activeSite,
      subscription,
      isPro,
      wasPro,
      isTrial,
      daysRemaining,
      loading,
      login,
      logout,
      refreshUser,
      refreshSites,
      switchSite,
    }),
    [token, user, sites, activeSite, subscription, isPro, wasPro, isTrial, daysRemaining, loading, login, logout, refreshUser, refreshSites, switchSite]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
