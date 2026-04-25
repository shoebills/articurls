"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  adminListPayments,
  adminListUsers,
  adminListUsernameChangeRequests,
  adminReviewUsernameChangeRequest,
  ApiError,
} from "@/lib/api";
import type { AdminPaymentListItem, AdminUserListItem, AdminUsernameRequestListItem } from "@/lib/types";
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
  const [plan, setPlan] = useState<"all" | "free" | "pro">("all");
  const [requestStatus, setRequestStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [payments, setPayments] = useState<AdminPaymentListItem[]>([]);
  const [requests, setRequests] = useState<AdminUsernameRequestListItem[]>([]);
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
        } else if (section === "payments") {
          const rows = await adminListPayments(token, { q: q.trim(), sort, limit: 100 });
          setPayments(rows);
        } else {
          const rows = await adminListUsernameChangeRequests(token, { q: q.trim(), sort, status: requestStatus, limit: 100 });
          setRequests(rows);
        }
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : "Failed to load admin data");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token, section, q, sort, plan, requestStatus]);

  async function reviewRequest(requestId: number, status: "approved" | "rejected") {
    if (!token) return;
    try {
      await adminReviewUsernameChangeRequest(token, requestId, { status, admin_note: `Reviewed from internal admin: ${status}` });
      const rows = await adminListUsernameChangeRequests(token, { q: q.trim(), sort, status: requestStatus, limit: 100 });
      setRequests(rows);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Review action failed");
    }
  }

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
                placeholder={section === "users" ? "Search by username or email" : "Search"}
                className="sm:max-w-md"
              />
              {section === "users" ? (
                <Select value={plan} onValueChange={(v: "all" | "free" | "pro") => setPlan(v)}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
              {section === "username_requests" ? (
                <Select value={requestStatus} onValueChange={(v: "pending" | "approved" | "rejected") => setRequestStatus(v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Request status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
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
                      <th className="py-2 pr-3">Username</th>
                      <th className="py-2 pr-3">Email</th>
                      <th className="py-2 pr-3">Plan</th>
                      <th className="py-2 pr-3">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.user_id} className="border-t border-border/60">
                        <td className="py-2 pr-3">{u.name}</td>
                        <td className="py-2 pr-3">@{u.user_name}</td>
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
                        <td className="py-2 pr-3">@{p.user_name}</td>
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

        {section === "username_requests" ? (
          <Card>
            <CardHeader>
              <CardTitle>Username requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {requests.map((r) => (
                <div key={r.request_id} className="rounded-lg border border-border/70 p-3 text-sm">
                  <p>
                    <strong>@{r.user_name}</strong> ({r.email}) requested <strong>@{r.desired_username}</strong>
                  </p>
                  {r.reason ? <p className="mt-1 text-muted-foreground">{r.reason}</p> : null}
                  <p className="mt-1 text-xs text-muted-foreground">Status: {r.status}</p>
                  {r.status === "pending" ? (
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" onClick={() => reviewRequest(r.request_id, "approved")}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => reviewRequest(r.request_id, "rejected")}>
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
        {err ? <p className="text-sm text-destructive">{err}</p> : null}
      </div>
    </InternalAdminShell>
  );
}
