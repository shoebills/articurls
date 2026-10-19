"""Reverse-proxy snippet generators for subfolder publishing.

Each function returns copy-paste configuration the customer deploys on their
own infrastructure to proxy `https://{domain}{subpath}/*` (and `/_next/*`
assets) to the Articurls UGC origin `https://{subdomain}.{ugc_domain}`,
preserving the original host via `x-original-host` so the platform proxy can
resolve the tenant and strip the subpath.
"""

from __future__ import annotations


def _backend(subdomain: str, ugc_domain: str) -> str:
    return f"https://{subdomain}.{ugc_domain}"


def _host(subdomain: str, ugc_domain: str) -> str:
    return f"{subdomain}.{ugc_domain}"


_CLOUDFLARE_WORKER_TEMPLATE = """export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const subpath = "{{CUSTOM_SUBPATH}}";
    const backendOrigin = "{{BACKEND_ORIGIN}}";

    // Strip trailing slash on subpath for exact match checks
    const normalizedSubpath = subpath.replace(/\\/+$/, "");
    const isSubpathMatch = url.pathname === normalizedSubpath ||
                           url.pathname.startsWith(normalizedSubpath + "/");
    const isAssetMatch = url.pathname.startsWith("/_next/");

    if (isSubpathMatch || isAssetMatch) {
      const proxyUrl = new URL(url.pathname + url.search, backendOrigin);
      const newHeaders = new Headers(request.headers);
      newHeaders.set("x-original-host", url.hostname);
      newHeaders.set("x-articurls-basepath", normalizedSubpath);

      return fetch(proxyUrl.toString(), {
        method: request.method,
        headers: newHeaders,
        body: request.body,
        redirect: "manual"
      });
    }

    return fetch(request);
  }
};
"""


def cloudflare_worker(subdomain: str, ugc_domain: str, subpath: str) -> str:
    normalized_subpath = "/" + subpath.strip().strip("/")
    return (
        _CLOUDFLARE_WORKER_TEMPLATE.replace("{{CUSTOM_SUBPATH}}", normalized_subpath)
        .replace("{{BACKEND_ORIGIN}}", _backend(subdomain, ugc_domain))
    )


def nextjs_rewrite(subdomain: str, ugc_domain: str, subpath: str, domain: str) -> str:
    backend = _backend(subdomain, ugc_domain)
    return f"""// proxy.ts (Next.js App Router)
import {{ NextResponse }} from 'next/server';
import type {{ NextRequest }} from 'next/server';

export function proxy(request: NextRequest) {{
  const {{ pathname }} = request.nextUrl;
  const isSubpath = pathname === '{subpath}' || pathname.startsWith('{subpath}/');
  const isAsset = pathname.startsWith('/_next/');

  if (isSubpath || isAsset) {{
    const url = new URL(pathname + request.nextUrl.search, '{backend}');
    const headers = new Headers(request.headers);
    headers.set('x-original-host', request.headers.get('host') || '{domain}');
    headers.set('x-articurls-basepath', '{subpath}');
    return NextResponse.rewrite(url, {{ request: {{ headers }} }});
  }}
}}

export const config = {{
  matcher: ['{subpath}', '{subpath}/:path*', '/_next/:path*'],
}};"""


def vercel_rewrite(subdomain: str, ugc_domain: str, subpath: str) -> str:
    backend = _backend(subdomain, ugc_domain)
    return f"""// vercel.json
{{
  "rewrites": [
    {{
      "source": "{subpath}",
      "destination": "{backend}{subpath}"
    }},
    {{
      "source": "{subpath}/:match*",
      "destination": "{backend}{subpath}/:match*"
    }},
    {{
      "source": "/_next/:path*",
      "destination": "{backend}/_next/:path*"
    }}
  ]
}}"""


def nginx_config(subdomain: str, ugc_domain: str, subpath: str) -> str:
    backend = _backend(subdomain, ugc_domain)
    host = _host(subdomain, ugc_domain)
    return f"""# Nginx location block
location {subpath} {{
    proxy_pass {backend}{subpath};
    proxy_set_header Host {host};
    proxy_set_header X-Original-Host $host;
    proxy_set_header X-Articurls-Basepath {subpath};
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_ssl_server_name on;
}}

location /_next/ {{
    proxy_pass {backend}/_next/;
    proxy_set_header Host {host};
    proxy_ssl_server_name on;
}}"""


def caddy_config(subdomain: str, ugc_domain: str, subpath: str, domain: str) -> str:
    backend = _backend(subdomain, ugc_domain)
    host = _host(subdomain, ugc_domain)
    return f"""# Caddyfile
{domain} {{
    handle_path {subpath}* {{
        reverse_proxy {backend} {{
            header_up Host {host}
            header_up X-Original-Host {{host}}
            header_up X-Articurls-Basepath {subpath}
        }}
    }}
    handle_path /_next/* {{
        reverse_proxy {backend} {{
            header_up Host {host}
        }}
    }}
}}"""


def apache_config(subdomain: str, ugc_domain: str, subpath: str, domain: str) -> str:
    backend = _backend(subdomain, ugc_domain)
    return f"""# Apache .htaccess or httpd.conf
RewriteEngine On
SSLProxyEngine On
ProxyPreserveHost Off
RequestHeader set X-Original-Host "{domain}"
RequestHeader set X-Articurls-Basepath "{subpath}"
ProxyPass {subpath} {backend}{subpath}
ProxyPassReverse {subpath} {backend}{subpath}
ProxyPass /_next/ {backend}/_next/
ProxyPassReverse /_next/ {backend}/_next/"""