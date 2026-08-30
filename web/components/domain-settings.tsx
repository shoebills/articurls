"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Globe,
  ExternalLink,
  Layers,
  FolderTree,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  addCustomDomain,
  getCustomDomain,
  verifyCustomDomain,
  deleteCustomDomain,
  getSubfolderSettings,
  updateSubfolderSettings,
  deleteSubfolderSettings,
  getSubfolderSnippets,
  ApiError,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { CustomDomain, DNSRecord, SubfolderSettings, SubfolderSnippets } from "@/lib/types";
import { UGC_DOMAIN } from "@/lib/env";
import { FloatingErrorToast } from "@/components/floating-error-toast";

type StackType = "nextjs" | "cloudflare" | "vercel" | "nginx" | "caddy" | "apache";

interface StackOption {
  id: StackType;
  name: string;
  filename: string;
  instruction: string;
}

const STACK_OPTIONS: StackOption[] = [
  {
    id: "nextjs",
    name: "Next.js (App / Pages)",
    filename: "next.config.mjs",
    instruction: "Add this rewrite block to your next.config.mjs (or next.config.js) and redeploy.",
  },
  {
    id: "cloudflare",
    name: "Cloudflare Worker",
    filename: "worker.js",
    instruction: "Deploy this Worker on Cloudflare and bind the route pattern to your domain.",
  },
  {
    id: "vercel",
    name: "Vercel",
    filename: "vercel.json",
    instruction: "Add this rewrite rule to your vercel.json configuration and redeploy.",
  },
  {
    id: "nginx",
    name: "Nginx",
    filename: "/etc/nginx/sites-available/your-site.conf",
    instruction: "Add this location block to your server config and reload Nginx (nginx -s reload).",
  },
  {
    id: "caddy",
    name: "Caddy",
    filename: "Caddyfile",
    instruction: "Add this block to your Caddyfile and reload Caddy (caddy reload).",
  },
  {
    id: "apache",
    name: "Apache",
    filename: ".htaccess",
    instruction: "Add these proxy rules to your .htaccess or VirtualHost configuration.",
  },
];

function parseInputUrl(raw: string): {
  domain: string;
  subpath: string | null;
  type: "apex" | "subdomain" | "subdirectory" | "invalid";
} {
  let cleaned = raw.trim().toLowerCase();
  for (const prefix of ["https://", "http://"]) {
    if (cleaned.startsWith(prefix)) {
      cleaned = cleaned.slice(prefix.length);
    }
  }
  cleaned = cleaned.split("?")[0].split("#")[0].replace(/\/+$/, "");

  if (!cleaned) {
    return { domain: "", subpath: null, type: "invalid" };
  }

  const firstSlashIndex = cleaned.indexOf("/");
  let domainPart = cleaned;
  let subpathPart: string | null = null;

  if (firstSlashIndex !== -1) {
    domainPart = cleaned.slice(0, firstSlashIndex);
    const path = cleaned.slice(firstSlashIndex);
    subpathPart = "/" + path.replace(/^\/+/, "");
  }

  domainPart = domainPart.replace(/:[0-9]+$/, "");

  if (!domainPart || !domainPart.includes(".") || domainPart.endsWith(".")) {
    return { domain: domainPart, subpath: subpathPart, type: "invalid" };
  }

  if (subpathPart && subpathPart !== "/") {
    return { domain: domainPart, subpath: subpathPart, type: "subdirectory" };
  }

  const parts = domainPart.split(".");
  if (parts.length > 2 && parts[0] !== "www") {
    return { domain: domainPart, subpath: null, type: "subdomain" };
  }

  return { domain: domainPart, subpath: null, type: "apex" };
}

function generateClientSnippet(
  stack: StackType,
  domain: string,
  subpath: string,
  subdomain: string
): string {
  const cleanSubpath = "/" + subpath.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  const targetDomain = domain || "example.com";
  const backend = `https://${subdomain}.${UGC_DOMAIN}`;

  switch (stack) {
    case "nextjs":
      return `// next.config.mjs (or next.config.js)
export default {
  async rewrites() {
    return [
      {
        source: '${cleanSubpath}',
        destination: '${backend}${cleanSubpath}',
      },
      {
        source: '${cleanSubpath}/:path*',
        destination: '${backend}${cleanSubpath}/:path*',
      },
    ];
  },
};`;

    case "cloudflare":
      return `// worker.js - Route: ${targetDomain}${cleanSubpath}*
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "${cleanSubpath}" || url.pathname.startsWith("${cleanSubpath}/")) {
      const proxyUrl = new URL(url.pathname + url.search, "${backend}");
      const headers = new Headers(request.headers);
      headers.set("x-original-host", url.hostname);
      headers.set("x-articurls-basepath", "${cleanSubpath}");
      return fetch(proxyUrl.toString(), {
        method: request.method,
        headers,
        body: request.body,
        redirect: "manual",
      });
    }
    return fetch(request);
  },
};`;

    case "vercel":
      return `// vercel.json
{
  "rewrites": [
    {
      "source": "${cleanSubpath}",
      "destination": "${backend}${cleanSubpath}"
    },
    {
      "source": "${cleanSubpath}/:match*",
      "destination": "${backend}${cleanSubpath}/:match*"
    }
  ]
}`;

    case "nginx":
      return `# Nginx location block
location ${cleanSubpath} {
    proxy_pass ${backend}${cleanSubpath};
    proxy_set_header Host ${targetDomain};
    proxy_set_header X-Original-Host ${targetDomain};
    proxy_set_header X-Articurls-Basepath ${cleanSubpath};
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_ssl_server_name on;
}`;

    case "caddy":
      return `# Caddyfile
${targetDomain} {
    handle_path ${cleanSubpath}* {
        reverse_proxy ${backend} {
            header_up Host ${targetDomain}
            header_up X-Original-Host {host}
            header_up X-Articurls-Basepath ${cleanSubpath}
        }
    }
}`;

    case "apache":
      return `# Apache .htaccess or httpd.conf
RewriteEngine On
SSLProxyEngine On
ProxyPreserveHost Off
RequestHeader set X-Original-Host "${targetDomain}"
RequestHeader set X-Articurls-Basepath "${cleanSubpath}"
ProxyPass ${cleanSubpath} ${backend}${cleanSubpath}
ProxyPassReverse ${cleanSubpath} ${backend}${cleanSubpath}`;
  }
}

export function DomainSettings({ subdomain }: { subdomain: string }) {
  const { token } = useAuth();

  const [domainData, setDomainData] = useState<CustomDomain | null | undefined>(undefined);
  const [subfolderData, setSubfolderData] = useState<SubfolderSettings | null | undefined>(undefined);
  const [snippets, setSnippets] = useState<SubfolderSnippets | null>(null);

  const [inputUrl, setInputUrl] = useState("");
  const [selectedStack, setSelectedStack] = useState<StackType>("nextjs");

  const [connecting, setConnecting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [dnsInstructions, setDnsInstructions] = useState<DNSRecord[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [info, setInfo] = useState("");

  const loadAll = useCallback(
    async (tok: string) => {
      try {
        const [dom, sub] = await Promise.all([
          getCustomDomain(tok).catch(() => null),
          getSubfolderSettings(tok).catch(() => null),
        ]);
        setDomainData(dom);
        setSubfolderData(sub);

        if (dom?.dns_instructions && dom.dns_instructions.length > 0) {
          setDnsInstructions(dom.dns_instructions);
        } else if (dom?.domain_status === "active") {
          setDnsInstructions([]);
        }

        if (sub?.is_active) {
          const snips = await getSubfolderSnippets(tok).catch(() => null);
          setSnippets(snips);
        }
      } catch {
        setDomainData(null);
        setSubfolderData(null);
      }
    },
    []
  );

  useEffect(() => {
    if (!token) return;
    loadAll(token);
  }, [token, loadAll]);

  const parsed = useMemo(() => parseInputUrl(inputUrl), [inputUrl]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (parsed.type === "invalid" || !parsed.domain) {
      setError("Please enter a valid domain or subdirectory (e.g. blog.yourdomain.com or yourdomain.com/blog)");
      return;
    }

    setConnecting(true);
    setError("");
    setInfo("");
    setSuccess("");

    try {
      if (parsed.type === "subdirectory" && parsed.subpath) {
        // Subdirectory flow
        const updated = await updateSubfolderSettings(token, {
          custom_domain: parsed.domain,
          custom_subpath: parsed.subpath,
        });
        setSubfolderData(updated);
        const snips = await getSubfolderSnippets(token).catch(() => null);
        setSnippets(snips);
        setInputUrl("");
        setSuccess("Subdirectory connected successfully! Choose your stack below.");
        await loadAll(token);
      } else {
        // Custom Domain / Subdomain flow
        const result = await addCustomDomain(token, parsed.domain);
        setDnsInstructions(result.dns_instructions ?? []);
        setInputUrl("");
        setSuccess("Domain connected. Configure DNS records below to verify.");
        await loadAll(token);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to connect domain");
    } finally {
      setConnecting(false);
    }
  };

  const handleVerify = async () => {
    if (!token) return;
    setVerifying(true);
    setError("");
    setInfo("");
    setSuccess("");

    try {
      const result = await verifyCustomDomain(token);
      if (result.verification_status === "verified" || result.verification_status === "already_verified") {
        await loadAll(token);
        setDnsInstructions([]);
        setSuccess("Domain verified! Your custom domain is now active.");
      } else {
        if (result.dns_instructions) {
          setDnsInstructions(result.dns_instructions);
        }
        if (result.message) {
          setInfo(result.message);
        }
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
  };

  const handleDisconnect = async () => {
    if (!token) return;
    setDeleting(true);
    setError("");
    setInfo("");
    setSuccess("");
    setConfirmDelete(false);

    try {
      if (subfolderData?.is_active) {
        await deleteSubfolderSettings(token);
      } else if (domainData?.hostname) {
        await deleteCustomDomain(token);
      }
      setDomainData(null);
      setSubfolderData(null);
      setDnsInstructions([]);
      setSnippets(null);
      setSuccess("Domain disconnected.");
      await loadAll(token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to disconnect domain");
    } finally {
      setDeleting(false);
    }
  };

  const isSubdirectoryActive = Boolean(subfolderData?.is_active && subfolderData.custom_domain);
  const isCustomDomainConfigured = Boolean(domainData?.hostname && !isSubdirectoryActive);

  const activeDomainName = isSubdirectoryActive
    ? `${subfolderData?.custom_domain}${subfolderData?.custom_subpath || "/blog"}`
    : domainData?.hostname || "";

  const permanentSubdomainUrl = `https://${encodeURIComponent(subdomain)}.${UGC_DOMAIN}`;

  const currentStack = STACK_OPTIONS.find((s) => s.id === selectedStack) || STACK_OPTIONS[0];
  const activeSnippetCode = useMemo(() => {
    if (!isSubdirectoryActive) return "";
    const dom = subfolderData?.custom_domain || "example.com";
    const path = subfolderData?.custom_subpath || "/blog";

    if (snippets) {
      if (selectedStack === "nextjs" && snippets.nextjs) return snippets.nextjs;
      if (selectedStack === "cloudflare" && snippets.cloudflare_worker) return snippets.cloudflare_worker;
      if (selectedStack === "vercel" && snippets.vercel) return snippets.vercel;
      if (selectedStack === "nginx" && snippets.nginx) return snippets.nginx;
      if (selectedStack === "caddy" && snippets.caddy) return snippets.caddy;
      if (selectedStack === "apache" && snippets.apache) return snippets.apache;
    }
    return generateClientSnippet(selectedStack, dom, path, subdomain);
  }, [isSubdirectoryActive, selectedStack, subfolderData, snippets, subdomain]);

  if (domainData === undefined || subfolderData === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FloatingErrorToast message={error} onDismiss={() => setError("")} />
      <FloatingErrorToast message={success} onDismiss={() => setSuccess("")} autoDismissMs={3000} variant="success" />

      {/* ── 1. Permanent Subdomain Banner ─────────────────────────────────── */}
      <Card className="rounded-2xl border border-border/80 shadow-xs">
        <CardHeader className="pb-3 sm:pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Permanent Address</CardTitle>
              <CardDescription className="text-xs">
                Your default Articurls URL that is always active and online.
              </CardDescription>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Default
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
            <span className="font-mono text-sm font-medium text-foreground truncate max-w-full">
              {subdomain}.{UGC_DOMAIN}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => copyToClipboard(permanentSubdomainUrl, "subdomain-url")}
              >
                {copiedKey === "subdomain-url" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" asChild>
                <a href={permanentSubdomainUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Visit
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. Unified Custom Domain / Subdirectory Card ───────────────────── */}
      <Card className="rounded-2xl border border-border/80 shadow-xs">
        <CardHeader className="pb-4 sm:pb-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/80 bg-muted/40 text-foreground">
              {isSubdirectoryActive ? <FolderTree className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Custom Domain & Subdirectory</CardTitle>
              <CardDescription className="text-xs">
                Connect an apex domain (<span className="font-mono">example.com</span>), subdomain (<span className="font-mono">blog.example.com</span>), or subdirectory (<span className="font-mono">example.com/blog</span>).
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {info && (
            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <p>{info}</p>
            </div>
          )}

          {/* ── No Domain Configured: Unified Input ────────────────────────── */}
          {!isSubdirectoryActive && !isCustomDomainConfigured && (
            <form onSubmit={handleConnect} className="space-y-4">
              <div className="space-y-2">
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <Input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="e.g. blog.yourdomain.com or yourdomain.com/blog"
                    className="font-mono text-sm flex-1"
                    disabled={connecting}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                  <Button type="submit" disabled={connecting || parsed.type === "invalid" || !parsed.domain} className="shrink-0 gap-2">
                    {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    Connect
                  </Button>
                </div>

                {/* Live Detection Badge */}
                {inputUrl.trim() ? (
                  <div className="flex items-center gap-2 pt-1 text-xs">
                    {parsed.type === "subdirectory" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-2.5 py-0.5 font-medium text-purple-600 dark:text-purple-400">
                        <FolderTree className="h-3 w-3" />
                        Subdirectory Route (Reverse Proxy under {parsed.subpath})
                      </span>
                    ) : parsed.type === "subdomain" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 font-medium text-blue-600 dark:text-blue-400">
                        <Globe className="h-3 w-3" />
                        Custom Subdomain (CNAME Record)
                      </span>
                    ) : parsed.type === "apex" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-medium text-emerald-600 dark:text-emerald-400">
                        <Globe className="h-3 w-3" />
                        Apex Custom Domain (A / CNAME Record)
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Type a domain (e.g. blog.site.com or site.com/blog)</span>
                    )}
                  </div>
                ) : null}
              </div>
            </form>
          )}

          {/* ── Domain Configured (Custom Domain or Subdirectory) ──────────── */}
          {(isSubdirectoryActive || isCustomDomainConfigured) && (
            <div className="space-y-6">
              {/* Connected Header Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/20 p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-base font-semibold text-foreground">{activeDomainName}</span>
                    <StatusBadge
                      status={
                        isSubdirectoryActive
                          ? "active"
                          : domainData?.domain_status || "pending"
                      }
                      isSubdirectory={isSubdirectoryActive}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isSubdirectoryActive
                      ? `Requests to https://${activeDomainName} are served by your blog.`
                      : domainData?.domain_status === "active"
                      ? `Your domain is active and serving traffic.`
                      : `Add the DNS records below at your registrar to verify.`}
                  </p>
                </div>

                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <Button variant="destructive" size="sm" onClick={handleDisconnect} disabled={deleting}>
                      {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm Disconnect"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 text-xs"
                    onClick={() => setConfirmDelete(true)}
                  >
                    Disconnect
                  </Button>
                )}
              </div>

              {/* ── Subdirectory: Tech Stack Selector & Implementation Plan ── */}
              {isSubdirectoryActive && (
                <div className="space-y-4 pt-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary" />
                        Reverse Proxy Setup
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Select your technology stack to get the exact configuration snippet.
                      </p>
                    </div>

                    {/* Stack Selector Dropdown */}
                    <div className="w-full sm:w-64">
                      <Select value={selectedStack} onValueChange={(val) => setSelectedStack(val as StackType)}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select Stack" />
                        </SelectTrigger>
                        <SelectContent>
                          {STACK_OPTIONS.map((stack) => (
                            <SelectItem key={stack.id} value={stack.id} className="text-xs">
                              {stack.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Implementation Plan Card */}
                  <div className="rounded-xl border border-border/80 bg-neutral-950 p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs border-b border-neutral-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-neutral-400">{currentStack.filename}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 gap-1.5 text-xs bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white"
                        onClick={() => copyToClipboard(activeSnippetCode, "stack-snippet")}
                      >
                        {copiedKey === "stack-snippet" ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy Snippet
                          </>
                        )}
                      </Button>
                    </div>

                    <p className="text-xs text-neutral-400">{currentStack.instruction}</p>

                    <pre className="max-h-64 overflow-x-auto font-mono text-xs text-neutral-200 leading-relaxed">
                      {activeSnippetCode}
                    </pre>
                  </div>
                </div>
              )}

              {/* ── Custom Domain: Pending State & DNS Instructions ──────── */}
              {isCustomDomainConfigured && domainData?.domain_status === "pending" && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      DNS Records
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Add these records with your DNS provider, then click Verify.
                    </p>
                  </div>

                  {dnsInstructions.length > 0 ? (
                    <div className="space-y-3">
                      {dnsInstructions.map((record, idx) => (
                        <div key={idx} className="rounded-xl border border-border/80 bg-background p-4 space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold uppercase tracking-wider text-muted-foreground">
                              {record.purpose === "routing" ? "Routing Record" : "Verification Record"}
                            </span>
                            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px]">
                              {record.type}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <div className="space-y-1">
                              <span className="text-[11px] text-muted-foreground">Name / Host</span>
                              <div className="flex items-center gap-1.5">
                                <code className="flex-1 truncate rounded-lg bg-muted/40 px-2.5 py-1.5 font-mono text-xs">
                                  {record.name}
                                </code>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => copyToClipboard(record.name, `dns-name-${idx}`)}
                                >
                                  {copiedKey === `dns-name-${idx}` ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[11px] text-muted-foreground">Value / Points to</span>
                              <div className="flex items-center gap-1.5">
                                <code className="flex-1 truncate rounded-lg bg-muted/40 px-2.5 py-1.5 font-mono text-xs">
                                  {record.value}
                                </code>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => copyToClipboard(record.value, `dns-val-${idx}`)}
                                >
                                  {copiedKey === `dns-val-${idx}` ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <Button onClick={handleVerify} disabled={verifying} className="w-full gap-2">
                    {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Verify Domain
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status, isSubdirectory }: { status: string; isSubdirectory?: boolean }) {
  if (isSubdirectory) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Subdirectory Active
      </span>
    );
  }

  const map: Record<string, { label: string; className: string }> = {
    active: { label: "Active", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    pending: { label: "Pending verification", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    grace: { label: "Grace period", className: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
    expired: { label: "Expired", className: "bg-red-500/10 text-red-600 dark:text-red-400" },
  };

  const s = map[status] || { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}

export default DomainSettings;
