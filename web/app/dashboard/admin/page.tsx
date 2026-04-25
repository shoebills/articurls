"use client";

import { useMemo, useState } from "react";
import {
  adminGetUserSummary,
  adminGetUsernameAudit,
  adminListPaymentWebhooks,
  adminListUsernameChangeRequests,
  adminOverrideUsername,
  adminRetryPaymentWebhook,
  adminReviewUsernameChangeRequest,
  adminSearchUsers,
  ApiError,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminPage() {
  const { token, user } = useAuth();
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<Array<{ user_id: number; name: string; user_name: string; email: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [summary, setSummary] = useState<{
    user: { user_id: number; user_name: string; email: string; username_change_count: number };
    transaction_count: number;
    pending_username_requests: number;
  } | null>(null);
  const [audit, setAudit] = useState<Array<{ old_username: string; new_username: string; reason: string | null; created_at: string | null }>>([]);
  const [requests, setRequests] = useState<Array<{ request_id: number; user_id: number; desired_username: string; status: "pending" | "approved" | "rejected"; reason: string | null }>>([]);
  const [webhooks, setWebhooks] = useState<Array<{ webhook_id: number; event_type: string; processed: boolean; created_at: string }>>([]);
  const [overrideUsername, setOverrideUsername] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = !!user?.is_admin;

  async function runSearch() {
    if (!token || !q.trim()) return;
    setErr(null);
    try {
      const rows = await adminSearchUsers(token, q.trim());
      setUsers(rows);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Search failed");
    }
  }

  async function loadUserPanel(userId: number) {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      const [sum, aud] = await Promise.all([adminGetUserSummary(token, userId), adminGetUsernameAudit(token, userId)]);
      setSummary(sum);
      setAudit(aud);
      setSelectedUserId(userId);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not load user summary");
    } finally {
      setBusy(false);
    }
  }

  async function loadQueues() {
    if (!token) return;
    setErr(null);
    try {
      const [reqs, whs] = await Promise.all([adminListUsernameChangeRequests(token, "pending"), adminListPaymentWebhooks(token, 25)]);
      setRequests(reqs);
      setWebhooks(whs);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not load admin queues");
    }
  }

  async function approveRequest(requestId: number) {
    if (!token) return;
    await adminReviewUsernameChangeRequest(token, requestId, { status: "approved", admin_note: "Approved by admin dashboard" });
    await loadQueues();
    if (selectedUserId) await loadUserPanel(selectedUserId);
  }

  async function rejectRequest(requestId: number) {
    if (!token) return;
    await adminReviewUsernameChangeRequest(token, requestId, { status: "rejected", admin_note: "Rejected by admin dashboard" });
    await loadQueues();
  }

  async function applyOverride() {
    if (!token || !selectedUserId || !overrideUsername.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await adminOverrideUsername(token, selectedUserId, { user_name: overrideUsername.trim().toLowerCase(), reason: overrideReason.trim() || "admin_override" });
      setOverrideUsername("");
      setOverrideReason("");
      await loadUserPanel(selectedUserId);
      await loadQueues();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Override failed");
    } finally {
      setBusy(false);
    }
  }

  async function retryWebhook(id: number) {
    if (!token) return;
    await adminRetryPaymentWebhook(token, id);
    await loadQueues();
  }

  const selectedLabel = useMemo(() => {
    if (!summary) return "";
    return `${summary.user.user_name} (${summary.user.email})`;
  }, [summary]);

  if (!isAdmin) {
    return <p className="text-sm text-muted-foreground">Admin access required.</p>;
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Admin</h1>

      <Card>
        <CardHeader>
          <CardTitle>User search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email / username / name" />
            <Button onClick={runSearch}>Search</Button>
          </div>
          {users.length > 0 ? (
            <ul className="space-y-1">
              {users.map((u) => (
                <li key={u.user_id}>
                  <button type="button" className="w-full rounded-md border border-border/70 px-3 py-2 text-left text-sm hover:bg-muted/30" onClick={() => loadUserPanel(u.user_id)}>
                    {u.name} - @{u.user_name} - {u.email}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Username requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" onClick={loadQueues}>
              Refresh queues
            </Button>
            {requests.length === 0 ? <p className="text-sm text-muted-foreground">No pending requests.</p> : null}
            {requests.map((r) => (
              <div key={r.request_id} className="rounded-md border border-border/70 p-3 text-sm">
                <p>
                  User #{r.user_id} wants <strong>@{r.desired_username}</strong>
                </p>
                {r.reason ? <p className="mt-1 text-muted-foreground">{r.reason}</p> : null}
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={() => approveRequest(r.request_id)}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => rejectRequest(r.request_id)}>
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Webhook ops</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {webhooks.length === 0 ? <p className="text-sm text-muted-foreground">Load queues to view webhooks.</p> : null}
            {webhooks.map((w) => (
              <div key={w.webhook_id} className="flex items-center justify-between rounded-md border border-border/70 p-2 text-xs">
                <div>
                  <p>{w.event_type}</p>
                  <p className="text-muted-foreground">#{w.webhook_id} - {w.processed ? "processed" : "pending"}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => retryWebhook(w.webhook_id)}>
                  Retry
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User panel {selectedLabel ? `- ${selectedLabel}` : ""}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!summary ? <p className="text-sm text-muted-foreground">Search and select a user to view details.</p> : null}
          {summary ? (
            <>
              <p className="text-sm text-muted-foreground">
                Username changes used: {summary.user.username_change_count} | Transactions: {summary.transaction_count} | Pending requests: {summary.pending_username_requests}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Override username</Label>
                  <Input value={overrideUsername} onChange={(e) => setOverrideUsername(e.target.value)} placeholder="new_username" />
                </div>
                <div>
                  <Label>Reason</Label>
                  <Input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="legal rename / safety / trademark" />
                </div>
              </div>
              <Button onClick={applyOverride} disabled={busy || !overrideUsername.trim()}>
                Apply override
              </Button>
              <div className="space-y-2">
                <p className="text-sm font-medium">Username audit</p>
                {audit.length === 0 ? <p className="text-sm text-muted-foreground">No audit rows yet.</p> : null}
                {audit.map((a, idx) => (
                  <p key={`${a.created_at}-${idx}`} className="text-xs text-muted-foreground">
                    {a.old_username} -&gt; {a.new_username} ({a.reason || "n/a"}) {a.created_at ? `at ${new Date(a.created_at).toLocaleString()}` : ""}
                  </p>
                ))}
              </div>
            </>
          ) : null}
          {err ? <p className="text-sm text-destructive">{err}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
