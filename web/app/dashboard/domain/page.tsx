"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Copy, Check, AlertCircle, Loader2, Globe } from "lucide-react";
import {
  addCustomDomain,
  getCustomDomain,
  verifyCustomDomain,
  deleteCustomDomain,
  getSubscription,
  isProSubscription,
  ApiError,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { CustomDomain, DNSRecord } from "@/lib/types";

export default function DomainSettingsPage() {
  const router = useRouter();
  const { token } = useAuth();

  const [domain, setDomain] = useState<CustomDomain | null | undefined>(undefined); // undefined = not loaded yet
  const [dnsInstructions, setDnsInstructions] = useState<DNSRecord[]>([]);
  const [hostname, setHostname] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isPro, setIsPro] = useState<boolean | null>(null); // null = not checked yet

  const loadDomain = useCallback(async (tok: string) => {
    try {
      const data = await getCustomDomain(tok);
      setDomain(data); // null means no domain configured
    } catch {
      setDomain(null);
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    getSubscription(token)
      .then((sub) => {
        const pro = isProSubscription(sub);
        setIsPro(pro);
        if (pro) loadDomain(token);
        else setDomain(null);
      })
      .catch(() => {
        setIsPro(false);
        setDomain(null);
      });
  }, [token, loadDomain]);

  async function handleAddDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!hostname.trim()) { setError("Please enter a domain"); return; }
    if (!token) { router.push("/login"); return; }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await addCustomDomain(token, hostname);
      // Store DNS instructions from the add response
      setDnsInstructions(result.dns_instructions ?? []);
      setHostname("");
      // Reload from server to get canonical state
      await loadDomain(token);
      setSuccess("Domain added. Configure your DNS records below, then click Verify.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add domain");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyDomain() {
    if (!token) { router.push("/login"); return; }
    setVerifying(true);
    setError("");
    setSuccess("");

    try {
      const result = await verifyCustomDomain(token);

      if (result.verification_status === "verified" || result.verification_status === "already_verified") {
        await loadDomain(token);
        setDnsInstructions([]);
        setSuccess("Domain verified! Your custom domain is now active.");
      } else {
        setError("DNS records not detected yet. Please double-check your records and try again in a few minutes.");
        if (result.dns_instructions) setDnsInstructions(result.dns_instructions);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError("Please wait a few seconds before verifying again.");
      } else {
        setError(err instanceof ApiError ? err.message : "Failed to verify domain");
      }
    } finally {
      setVerifying(false);
    }
  }

  async function handleDeleteDomain() {
    if (!token) { router.push("/login"); return; }

    setDeleting(true);
    setError("");
    setSuccess("");
    setConfirmDelete(false);

    try {
      await deleteCustomDomain(token);
      setDomain(null);
      setDnsInstructions([]);
      setSuccess("Domain removed.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove domain");
    } finally {
      setDeleting(false);
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(key);
      setTimeout(() => setCopiedField(null), 2000);
    });
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isPro === null || domain === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Upgrade prompt ─────────────────────────────────────────────────────────
  if (!isPro) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <PageHeader />
        <Card className="p-8 text-center">
          <div className="mx-auto max-w-sm space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Globe className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Pro plan required</h2>
            <p className="text-sm text-muted-foreground">
              Custom domains are available on the Pro plan. Upgrade to connect your own domain to your blog.
            </p>
            <Button onClick={() => router.push("/dashboard/billing")} className="mt-2">
              Upgrade to Pro
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <PageHeader />

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* No domain configured */}
      {!domain?.hostname && (
        <Card className="p-6">
          <h2 className="text-base font-semibold">Add Custom Domain</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Subdomains only — e.g. <span className="font-mono">blog.example.com</span>. Root domains are not supported.
          </p>
          {hostname.trim().toLowerCase().startsWith("www.") && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2.5 text-sm text-yellow-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
              <p>
                <strong>www subdomains may not work</strong> if your domain is on Cloudflare and has a proxied www record.
                To fix this, go to your Cloudflare DNS and set the www record to <strong>DNS-only</strong> (grey cloud) before adding it here.
                Alternatively, use a different subdomain like <span className="font-mono">blog.example.com</span>.
              </p>
            </div>
          )}
          <form onSubmit={handleAddDomain} className="mt-5 flex gap-3">
            <Input
              type="text"
              placeholder="blog.example.com"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              disabled={loading}
              className="font-mono"
            />
            <Button type="submit" disabled={loading} className="shrink-0">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Domain
            </Button>
          </form>
        </Card>
      )}

      {/* Domain configured */}
      {domain?.hostname && (
        <Card className="divide-y divide-border/70">
          {/* Header row */}
          <div className="flex items-center justify-between p-5">
            <div className="space-y-1.5">
              <p className="font-mono text-base font-semibold">{domain.hostname}</p>
              <StatusBadge status={domain.domain_status} />
            </div>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Remove domain?</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteDomain}
                  disabled={deleting}
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, remove"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
              >
                Remove
              </Button>
            )}
          </div>

          {/* Active state */}
          {domain.domain_status === "active" && (
            <div className="p-5">
              <p className="text-sm text-muted-foreground">
                Your blog is live at{" "}
                <a
                  href={`https://${domain.hostname}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  https://{domain.hostname}
                </a>
              </p>
              {domain.verified_at && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Verified {new Date(domain.verified_at).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* Pending state — DNS instructions */}
          {domain.domain_status === "pending" && dnsInstructions.length > 0 && (
            <div className="space-y-5 p-5">
              <div>
                <p className="text-sm font-medium">Configure DNS records</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Add these records at your domain registrar, then click Verify.
                </p>
              </div>

              <div className="space-y-3">
                {dnsInstructions.map((record, idx) => (
                  <DnsRecordCard
                    key={idx}
                    record={record}
                    idx={idx}
                    copiedField={copiedField}
                    onCopy={copy}
                  />
                ))}
              </div>

              <p className="rounded-lg bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
                DNS changes typically propagate within minutes, but can take up to 48 hours.
                {domain.hostname?.startsWith("www.") && (
                  <> If your domain is on Cloudflare, make sure the <strong>www</strong> record is set to <strong>DNS-only</strong> (grey cloud), not proxied.</>
                )}
              </p>

              <Button onClick={handleVerifyDomain} disabled={verifying} className="w-full">
                {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify Domain
              </Button>
            </div>
          )}

          {/* Pending but no DNS instructions yet (just added, page refreshed) */}
          {domain.domain_status === "pending" && dnsInstructions.length === 0 && (
            <div className="space-y-4 p-5">
              <p className="text-sm text-muted-foreground">
                DNS records are required to verify this domain. Click below to load them.
              </p>
              <Button onClick={handleVerifyDomain} disabled={verifying} variant="outline" className="w-full">
                {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Check Verification Status
              </Button>
            </div>
          )}

          {/* Grace period */}
          {domain.domain_status === "grace" && (
            <div className="p-5">
              <p className="text-sm text-muted-foreground">
                Your Pro subscription has lapsed. Your custom domain is still active during the grace period.{" "}
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/billing")}
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  Renew now
                </button>{" "}
                to keep it.
              </p>
              {domain.grace_expires_at && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Grace period ends {new Date(domain.grace_expires_at).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* Expired */}
          {domain.domain_status === "expired" && (
            <div className="p-5">
              <p className="text-sm text-muted-foreground">
                This domain has expired and is no longer serving your blog.{" "}
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/billing")}
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  Upgrade to Pro
                </button>{" "}
                to reactivate it.
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function PageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Custom Domain</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Connect your own domain to your blog
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    active:  { label: "Active",              className: "bg-green-100 text-green-800" },
    pending: { label: "Pending verification", className: "bg-yellow-100 text-yellow-800" },
    grace:   { label: "Grace period",         className: "bg-orange-100 text-orange-800" },
    expired: { label: "Expired",              className: "bg-red-100 text-red-800" },
  };
  const s = map[status];
  if (!s) return null;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}

function DnsRecordCard({
  record,
  idx,
  copiedField,
  onCopy,
}: {
  record: DNSRecord;
  idx: number;
  copiedField: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  const purposeLabel: Record<string, string> = {
    ownership: "Ownership verification",
    ssl:       "SSL certificate",
    routing:   "Traffic routing",
  };

  return (
    <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {purposeLabel[record.purpose] ?? record.purpose}
        </span>
        <span className="rounded bg-background px-2 py-0.5 text-xs font-mono font-medium border">
          {record.type}
        </span>
      </div>

      <CopyRow label="Name"  value={record.name}  fieldKey={`name-${idx}`}  copiedField={copiedField} onCopy={onCopy} />
      <CopyRow label="Value" value={record.value} fieldKey={`value-${idx}`} copiedField={copiedField} onCopy={onCopy} />
    </div>
  );
}

function CopyRow({
  label,
  value,
  fieldKey,
  copiedField,
  onCopy,
}: {
  label: string;
  value: string;
  fieldKey: string;
  copiedField: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  const copied = copiedField === fieldKey;
  return (
    <div>
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded bg-background px-3 py-1.5 text-xs font-mono border">
          {value}
        </code>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onCopy(value, fieldKey)}
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}
