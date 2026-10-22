"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  adminListPayments,
  adminListUsers,
  ApiError,
} from "@/lib/api";
import type { AdminPaymentListItem, AdminUserListItem } from "@/lib/types";
import { InternalAdminShell, type AdminSection } from "@/components/internal-admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InternalAdminPage() {
  const { token } = useAuth();
  const [section, setSection] = useState<AdminSection>("users");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"latest" | "oldest">("latest");
  const [plan, setPlan] = useState<"all" | "inactive" | "pro">("all");
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [payments, setPayments] = useState<AdminPaymentListItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    const run = async () => {
      setLoading(true);
      setErr(null);
      try {
        if (section === "users") {
          const rows = await adminListUsers(token, { q: q.trim(), plan, sort, limit: 100 });
          setUsers(rows);
        } else {
          const rows = await adminListPayments(token, { q: q.trim(), sort, limit: 100 });
          setPayments(rows);
        }
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : "Failed to load admin data");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token, section, q, sort, plan]);

  return (
    <InternalAdminShell section={section} onSectionChange={setSection}>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Internal Admin</h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={section === "users" ? "Search by subdomain or email" : "Search"}
                className="sm:max-w-md"
              />
              {section === "users" ? (
                <Select value={plan} onValueChange={(v: "all" | "inactive" | "pro") => setPlan(v)}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
              <Select value={sort} onValueChange={(v: "latest" | "oldest") => setSort(v)}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Latest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {section === "users" ? (
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3">Name</th>
                      <th className="py-2 pr-3">Subdomain</th>
                      <th className="py-2 pr-3">Email</th>
                      <th className="py-2 pr-3">Plan</th>
                      <th className="py-2 pr-3">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.user_id} className="border-t border-border/60">
                        <td className="py-2 pr-3">{u.name}</td>
                        <td className="py-2 pr-3">@{u.subdomain}</td>
                        <td className="py-2 pr-3">{u.email}</td>
                        <td className="py-2 pr-3 uppercase">{u.plan}</td>
                        <td className="py-2 pr-3">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {section === "payments" ? (
          <Card>
            <CardHeader>
              <CardTitle>Latest payments done</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3">User</th>
                      <th className="py-2 pr-3">Email</th>
                      <th className="py-2 pr-3">Amount</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.transaction_id} className="border-t border-border/60">
                        <td className="py-2 pr-3">@{p.subdomain}</td>
                        <td className="py-2 pr-3">{p.email}</td>
                        <td className="py-2 pr-3">
                          {p.amount} {p.currency}
                        </td>
                        <td className="py-2 pr-3">{p.status}</td>
                        <td className="py-2 pr-3">{p.created_at ? new Date(p.created_at).toLocaleString() : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {err ? <p className="text-sm text-destructive">{err}</p> : null}
      </div>
    </InternalAdminShell>
  );
}
