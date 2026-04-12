"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SubscriptionOut, UserSettings } from "@/lib/types";
import { getMe, getSubscription, isProSubscription, login as apiLogin } from "@/lib/api";

const TOKEN_KEY = "articurls_token";

type AuthContextValue = {
  token: string | null;
  user: UserSettings | null;
  subscription: SubscriptionOut | null;
  isPro: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserSettings | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionOut | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const t = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (!t) {
      setUser(null);
      setSubscription(null);
      return;
    }
    try {
      const [me, sub] = await Promise.all([getMe(t), getSubscription(t)]);
      setUser(me);
      setSubscription(sub);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
      setSubscription(null);
    }
  }, []);

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    setToken(t);
    if (!t) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [me, sub] = await Promise.all([getMe(t), getSubscription(t)]);
        setUser(me);
        setSubscription(sub);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiLogin(email, password);
      localStorage.setItem(TOKEN_KEY, res.access_token);
      setToken(res.access_token);
      await refreshUser();
      router.push("/dashboard");
    },
    [refreshUser, router]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setSubscription(null);
    router.push("/login");
  }, [router]);

  const isPro = isProSubscription(subscription);

  const value = useMemo(
    () => ({
      token,
      user,
      subscription,
      isPro,
      loading,
      login,
      logout,
      refreshUser,
    }),
    [token, user, subscription, isPro, loading, login, logout, refreshUser]
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
