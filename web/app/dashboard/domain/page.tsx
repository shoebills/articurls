"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Check, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import {
  addCustomDomain,
  getCustomDomain,
  verifyCustomDomain,
  deleteCustomDomain,
  getSubscription,
} from "@/lib/api";
import type { CustomDomain, DNSRecord } from "@/lib/types";

export default function DomainSettingsPage() {
  const router = useRouter();
  const [domain, setDomain] = useState<CustomDomain | null>(null);
  const [dnsInstructions, setDnsInstructions] = useState<DNSRecord[]>([]);
  const [hostname, setHostname] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [checkingPro, setCheckingPro] = useState(true);

  useEffect(() => {
    checkProStatus();
  }, []);

  async function checkProStatus() {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        router.push("/login");
        return;
      }

      const subscription = await getSubscription(token);
      const isProActive =
        subscription?.plan_type === "pro" &&
        ["active", "past_due"].includes(subscription.status);

      setIsPro(isProActive);

      if (isProActive) {
        await loadDomain();
      }
    } catch (err) {
      console.error("Failed to check Pro status:", err);
    } finally {
      setCheckingPro(false);
    }
  }

  async function loadDomain() {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const data = await getCustomDomain(token);
      setDomain(data);
    } catch (err) {
      console.error("Failed to load domain:", err);
    }
  }

  async function handleAddDomain(e: React.FormEvent) {
    e.preventDefault();

    if (!hostname.trim()) {
      setError("Please enter a domain");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        router.push("/login");
        return;
      }

      const result = await addCustomDomain(token, hostname);
      setDomain({
        hostname: result.hostname,
        domain_status: result.domain_status,
        verified_at: null,
        grace_started_at: null,
        grace_expires_at: null,
      });
      setDnsInstructions(result.dns_instructions);
      setHostname("");
      setSuccess("Domain added successfully! Please configure your DNS records.");
    } catch (err: any) {
      setError(err.message || "Failed to add domain");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyDomain() {
    setVerifying(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        router.push("/login");
        return;
      }

      const result = await verifyCustomDomain(token);

      if (result.verification_status === "verified") {
        await loadDomain();
        setDnsInstructions([]);
        setSuccess("Domain verified successfully! Your custom domain is now active.");
      } else if (result.verification_status === "already_verified") {
        setSuccess("Domain is already verified.");
      } else {
        setError(
          "Domain not verified yet. Please ensure your DNS records are configured correctly and try again in a few minutes."
        );
        if (result.dns_instructions) {
          setDnsInstructions(result.dns_instructions);
        }
      }
    } catch (err: any) {
      if (err.status === 429) {
        setError("Please wait a few seconds before verifying again.");
      } else {
        setError(err.message || "Failed to verify domain");
      }
    } finally {
      setVerifying(false);
    }
  }

  async function handleDeleteDomain() {
    if (!confirm("Are you sure you want to remove this domain? This action cannot be undone.")) {
      return;
    }

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        router.push("/login");
        return;
      }

      await deleteCustomDomain(token);
      setDomain(null);
      setDnsInstructions([]);
      setSuccess("Domain removed successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to delete domain");
    } finally {
      setDeleting(false);
    }
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
            <Check className="h-3.5 w-3.5" />
            Active
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Pending Verification
          </span>
        );
      case "grace":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-800">
            <AlertCircle className="h-3.5 w-3.5" />
            Grace Period
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
            <AlertCircle className="h-3.5 w-3.5" />
            Expired
          </span>
        );
      default:
        return null;
    }
  }

  if (checkingPro) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Custom Domain</h1>
          <p className="mt-2 text-muted-foreground">
            Connect your own domain to your blog
          </p>
        </div>

        <Card className="p-8 text-center">
          <div className="mx-auto max-w-md space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <ExternalLink className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold">Upgrade to Pro</h2>
            <p className="text-muted-foreground">
              Custom domains are available on the Pro plan. Upgrade now to connect your own domain to your blog.
            </p>
            <Button
              size="lg"
              onClick={() => router.push("/dashboard/billing")}
              className="mt-4"
            >
              Upgrade to Pro
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Custom Domain</h1>
        <p className="mt-2 text-muted-foreground">
          Connect your own domain to your blog
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-900">
          <Check className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {!domain?.hostname ? (
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Add Custom Domain</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your subdomain (e.g., blog.example.com). Root domains are not supported.
          </p>

          <form onSubmit={handleAddDomain} className="mt-6 space-y-4">
            <div>
              <Input
                type="text"
                placeholder="blog.example.com"
                value={hostname}
                onChange={(e) => setHostname(e.target.value)}
                disabled={loading}
                className="font-mono"
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Domain
            </Button>
          </form>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold font-mono">{domain.hostname}</h2>
              <div className="flex items-center gap-2">
                {getStatusBadge(domain.domain_status)}
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteDomain}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </Button>
          </div>

          {domain.domain_status === "active" && domain.verified_at && (
            <div className="mt-6 rounded-lg bg-green-50 p-4">
              <p className="text-sm font-medium text-green-900">
                Your custom domain is live!
              </p>
              <p className="mt-1 text-sm text-green-700">
                Visit{" "}
                <a
                  href={`https://${domain.hostname}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline"
                >
                  https://{domain.hostname}
                </a>
              </p>
              <p className="mt-2 text-xs text-green-600">
                Verified on {new Date(domain.verified_at).toLocaleDateString()}
              </p>
            </div>
          )}

          {domain.domain_status === "pending" && dnsInstructions.length > 0 && (
            <div className="mt-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold">DNS Configuration</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add these DNS records to your domain provider:
                </p>
              </div>

              <div className="space-y-4">
                {dnsInstructions.map((record, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border bg-muted/30 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {record.purpose === "ownership" && "1. Ownership Verification (TXT)"}
                        {record.purpose === "ssl" && "2. SSL Certificate (TXT)"}
                        {record.purpose === "routing" && "3. Traffic Routing (CNAME)"}
                      </span>
                      <span className="rounded bg-background px-2 py-1 text-xs font-mono">
                        {record.type}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          Name
                        </label>
                        <div className="mt-1 flex items-center gap-2">
                          <code className="flex-1 rounded bg-background px-3 py-2 text-sm font-mono">
                            {record.name}
                          </code>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(record.name, `name-${idx}`)}
                          >
                            {copiedField === `name-${idx}` ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          Value
                        </label>
                        <div className="mt-1 flex items-center gap-2">
                          <code className="flex-1 truncate rounded bg-background px-3 py-2 text-sm font-mono">
                            {record.value}
                          </code>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(record.value, `value-${idx}`)}
                          >
                            {copiedField === `value-${idx}` ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> DNS changes can take up to 48 hours to propagate, but usually complete within a few minutes.
                </p>
              </div>

              <Button
                onClick={handleVerifyDomain}
                disabled={verifying}
                className="w-full"
              >
                {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify Domain
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
