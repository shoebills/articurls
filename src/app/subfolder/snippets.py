"""Reverse-proxy snippet generators for subfolder publishing.

Each function returns copy-paste configuration the customer deploys on their
own infrastructure to proxy `https://{domain}{subpath}/*` (and `/_next/*`
assets) to the Articurls UGC origin `https://{subdomain}.{ugc_domain}`,
preserving the original host via `x-original-host` so the platform proxy can
resolve the tenant and strip the subpath.
"""

from __future__ import annotations


from ..domains.utils import is_marketing_hostname


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
    const isSubpathMatch =
      url.pathname === normalizedSubpath ||
      url.pathname.startsWith(normalizedSubpath + "/");
    const isAssetMatch = url.pathname.startsWith("/_next/");

    if (isSubpathMatch || isAssetMatch) {
      const proxyUrl = new URL(url.pathname + url.search, backendOrigin);
      const newHeaders = new Headers(request.headers);
      newHeaders.set("host", proxyUrl.hostname);
      newHeaders.set("x-original-host", url.hostname);
      newHeaders.set("x-articurls-basepath", normalizedSubpath);

      const response = await fetch(proxyUrl.toString(), {
        method: request.method,
        headers: newHeaders,
        body: request.body,
        redirect: "manual",
      });

      if (isAssetMatch && response.status === 404) {
        return fetch(request);
      }

      return response;
    }

    return fetch(request);
  },
};
"""


def cloudflare_worker(subdomain: str, ugc_domain: str, subpath: str) -> str:
    normalized_subpath = "/" + subpath.strip().strip("/")
    return (
        _CLOUDFLARE_WORKER_TEMPLATE.replace("{{CUSTOM_SUBPATH}}", normalized_subpath)
        .replace("{{BACKEND_ORIGIN}}", _backend(subdomain, ugc_domain))
    )


_SEO_FILE_PATTERN = (
    r":file(robots\.txt|ads\.txt|sitemap\.xml|llms\.txt|rss\.xml|atom\.xml|feed\.xml|feed\.atom)"
)


def nextjs_rewrite(subdomain: str, ugc_domain: str, subpath: str, domain: str) -> str:
    has_clause = f"\n        has: [{{ type: 'host', value: '{domain}' }}]," if domain else ""
    if domain and is_marketing_hostname(domain):
        tenant_host = _host(subdomain, ugc_domain)
        return f"""// next.config.mjs
/** @type {{import('next').NextConfig}} */
const nextConfig = {{
  async rewrites() {{
    return [
      {{
        source: '{subpath}/{_SEO_FILE_PATTERN}',{has_clause}
        destination: '/site/{tenant_host}/:file',
      }},
      {{
        source: '{subpath}',{has_clause}
        destination: '/site/{tenant_host}{subpath}',
      }},
      {{
        source: '{subpath}/:path*',{has_clause}
        destination: '/site/{tenant_host}{subpath}/:path*',
      }},
    ];
  }},
}};

export default nextConfig;"""

    backend = _backend(subdomain, ugc_domain)
    return f"""// next.config.mjs
/** @type {{import('next').NextConfig}} */
const nextConfig = {{
  async rewrites() {{
    return [
      {{
        source: '{subpath}',{has_clause}
        destination: '{backend}{subpath}',
      }},
      {{
        source: '{subpath}/:path*',{has_clause}
        destination: '{backend}{subpath}/:path*',
      }},
      {{
        source: '/_next/:path*',{has_clause}
        destination: '{backend}/_next/:path*',
      }},
    ];
  }},
}};

export default nextConfig;"""


def vercel_rewrite(
    subdomain: str, ugc_domain: str, subpath: str, domain: str = ""
) -> str:
    has_line = (
        f'\n      "has": [{{ "type": "host", "value": "{domain}" }}],'
        if domain
        else ""
    )
    if domain and is_marketing_hostname(domain):
        tenant_host = _host(subdomain, ugc_domain)
        escaped_seo = _SEO_FILE_PATTERN.replace("\\", "\\\\")
        return f"""{{
  "rewrites": [
    {{
      "source": "{subpath}/{escaped_seo}",{has_line}
      "destination": "/site/{tenant_host}/:file"
    }},
    {{
      "source": "{subpath}",{has_line}
      "destination": "/site/{tenant_host}{subpath}"
    }},
    {{
      "source": "{subpath}/:path*",{has_line}
      "destination": "/site/{tenant_host}{subpath}/:path*"
    }}
  ]
}}"""

    backend = _backend(subdomain, ugc_domain)
    return f"""{{
  "rewrites": [
    {{
      "source": "{subpath}",{has_line}
      "destination": "{backend}{subpath}"
    }},
    {{
      "source": "{subpath}/:path*",{has_line}
      "destination": "{backend}{subpath}/:path*"
    }},
    {{
      "source": "/_next/:path*",{has_line}
      "destination": "{backend}/_next/:path*"
    }}
  ]
}}"""


def nginx_config(subdomain: str, ugc_domain: str, subpath: str) -> str:
    backend = _backend(subdomain, ugc_domain)
    host = _host(subdomain, ugc_domain)
    return f"""# Nginx server block configuration
location ^~ {subpath} {{
    proxy_pass {backend}{subpath};
    proxy_set_header Host {host};
    proxy_set_header X-Original-Host $host;
    proxy_set_header X-Articurls-Basepath {subpath};
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_ssl_server_name on;
}}

location ^~ /_next/ {{
    proxy_pass {backend}/_next/;
    proxy_set_header Host {host};
    proxy_set_header X-Original-Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_ssl_server_name on;
}}"""


def caddy_config(subdomain: str, ugc_domain: str, subpath: str, domain: str) -> str:
    backend = _backend(subdomain, ugc_domain)
    host = _host(subdomain, ugc_domain)
    return f"""# Caddyfile
{domain} {{
    @blog path {subpath} {subpath}/*
    handle @blog {{
        reverse_proxy {backend} {{
            header_up Host {host}
            header_up X-Original-Host {{host}}
            header_up X-Articurls-Basepath {subpath}
        }}
    }}
    handle /_next/* {{
        reverse_proxy {backend} {{
            header_up Host {host}
            header_up X-Original-Host {{host}}
        }}
    }}
}}"""


def apache_config(subdomain: str, ugc_domain: str, subpath: str, domain: str) -> str:
    backend = _backend(subdomain, ugc_domain)
    return f"""# Apache VirtualHost configuration (requires mod_proxy, mod_proxy_http, mod_ssl, mod_headers)
SSLProxyEngine On
ProxyPreserveHost Off

<Location {subpath}>
    ProxyPass {backend}{subpath}
    ProxyPassReverse {backend}{subpath}
    RequestHeader set X-Original-Host "{domain}"
    RequestHeader set X-Articurls-Basepath "{subpath}"
</Location>

<Location /_next/>
    ProxyPass {backend}/_next/
    ProxyPassReverse {backend}/_next/
    RequestHeader set X-Original-Host "{domain}"
</Location>"""