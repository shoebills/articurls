from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models
from ..config import settings
from ..database import get_db
from ..domains.utils import normalize_hostname
from ..redis_client import redis_client
from ..security.oauth2 import get_current_site
from ..domains.schemas import SubfolderIn, SubfolderOut
from ..cloudflare.worker_template import generate_worker_script
from ..utils import is_pro_entitled

router = APIRouter(tags=["Subfolder"])


def normalize_subpath(raw: str | None) -> str:
    if not raw:
        return "/blog"
    clean = "/" + raw.strip().strip("/").lower()
    return clean if clean != "/" else "/blog"


@router.get("/settings/subfolder", response_model=SubfolderOut, status_code=status.HTTP_200_OK)
def get_subfolder_settings(
    current_site: models.Site = Depends(get_current_site),
):
    is_active = bool(current_site.custom_domain and current_site.custom_subpath)
    return SubfolderOut(
        custom_domain=current_site.custom_domain,
        custom_subpath=current_site.custom_subpath,
        is_active=is_active,
    )


@router.post("/settings/subfolder", response_model=SubfolderOut, status_code=status.HTTP_200_OK)
def update_subfolder_settings(
    body: SubfolderIn,
    db: Session = Depends(get_db),
    current_site: models.Site = Depends(get_current_site),
):
    if not is_pro_entitled(current_site.user_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Custom subfolder routing requires an active Pro subscription.",
        )

    domain = normalize_hostname(body.custom_domain)
    subpath = normalize_subpath(body.custom_subpath)

    if not domain or "." not in domain:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Please provide a valid domain name.")

    existing = db.query(models.Site).filter(
        models.Site.custom_domain == domain,
        models.Site.site_id != current_site.site_id,
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This domain is already in use by another publication.",
        )

    current_site.custom_domain = domain
    current_site.custom_subpath = subpath
    current_site.domain_status = models.DomainStatus.ACTIVE
    db.commit()
    db.refresh(current_site)

    try:
        redis_client.delete(f"domain_lookup:{domain}")
        if current_site.subdomain and settings.ugc_domain:
            redis_client.delete(f"domain_lookup:{current_site.subdomain}.{settings.ugc_domain}")
    except Exception:
        pass

    return SubfolderOut(
        custom_domain=current_site.custom_domain,
        custom_subpath=current_site.custom_subpath,
        is_active=True,
    )


@router.delete("/settings/subfolder", status_code=status.HTTP_200_OK)
async def delete_subfolder_settings(
    db: Session = Depends(get_db),
    current_site: models.Site = Depends(get_current_site),
):
    old_domain = current_site.custom_domain
    current_site.custom_domain = None
    current_site.custom_subpath = None
    current_site.domain_status = models.DomainStatus.NONE

    db.commit()

    if old_domain:
        try:
            redis_client.delete(f"domain_lookup:{old_domain}")
            if current_site.subdomain and settings.ugc_domain:
                redis_client.delete(f"domain_lookup:{current_site.subdomain}.{settings.ugc_domain}")
        except Exception:
            pass

    return {"message": "Subfolder settings removed."}


@router.get("/settings/subfolder/snippets", status_code=status.HTTP_200_OK)
def get_subfolder_snippets(
    current_site: models.Site = Depends(get_current_site),
):
    """Generate copy-paste configuration snippets for various reverse proxies."""
    subpath = current_site.custom_subpath or "/blog"
    clean_subpath = "/" + subpath.strip().strip("/")
    domain = current_site.custom_domain or "example.com"
    backend = f"https://{current_site.subdomain}.{settings.ugc_domain}"

    cf_worker = generate_worker_script(current_site.subdomain, settings.ugc_domain, clean_subpath)

    nextjs_rewrite = f"""// proxy.ts (Next.js App Router)
import {{ NextResponse }} from 'next/server';
import type {{ NextRequest }} from 'next/server';

export function proxy(request: NextRequest) {{
  const {{ pathname }} = request.nextUrl;
  const isSubpath = pathname === '{clean_subpath}' || pathname.startsWith('{clean_subpath}/');
  const isAsset = pathname.startsWith('/_next/');

  if (isSubpath || isAsset) {{
    const url = new URL(pathname + request.nextUrl.search, '{backend}');
    const headers = new Headers(request.headers);
    headers.set('x-original-host', request.headers.get('host') || '{domain}');
    headers.set('x-articurls-basepath', '{clean_subpath}');
    return NextResponse.rewrite(url, {{ request: {{ headers }} }});
  }}
}}

export const config = {{
  matcher: ['{clean_subpath}', '{clean_subpath}/:path*', '/_next/:path*'],
}};"""

    vercel_rewrite = f"""// vercel.json
{{
  "rewrites": [
    {{
      "source": "{clean_subpath}",
      "destination": "{backend}{clean_subpath}"
    }},
    {{
      "source": "{clean_subpath}/:match*",
      "destination": "{backend}{clean_subpath}/:match*"
    }},
    {{
      "source": "/_next/:path*",
      "destination": "{backend}/_next/:path*"
    }}
  ]
}}"""

    nginx_config = f"""# Nginx location block
location {clean_subpath} {{
    proxy_pass {backend}{clean_subpath};
    proxy_set_header Host {current_site.subdomain}.{settings.ugc_domain};
    proxy_set_header X-Original-Host $host;
    proxy_set_header X-Articurls-Basepath {clean_subpath};
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_ssl_server_name on;
}}

location /_next/ {{
    proxy_pass {backend}/_next/;
    proxy_set_header Host {current_site.subdomain}.{settings.ugc_domain};
    proxy_ssl_server_name on;
}}"""

    caddy_config = f"""# Caddyfile
{domain} {{
    handle_path {clean_subpath}* {{
        reverse_proxy {backend} {{
            header_up Host {current_site.subdomain}.{settings.ugc_domain}
            header_up X-Original-Host {{host}}
            header_up X-Articurls-Basepath {clean_subpath}
        }}
    }}
    handle_path /_next/* {{
        reverse_proxy {backend} {{
            header_up Host {current_site.subdomain}.{settings.ugc_domain}
        }}
    }}
}}"""

    apache_config = f"""# Apache .htaccess or httpd.conf
RewriteEngine On
SSLProxyEngine On
ProxyPreserveHost Off
RequestHeader set X-Original-Host "{domain}"
RequestHeader set X-Articurls-Basepath "{clean_subpath}"
ProxyPass {clean_subpath} {backend}{clean_subpath}
ProxyPassReverse {clean_subpath} {backend}{clean_subpath}
ProxyPass /_next/ {backend}/_next/
ProxyPassReverse /_next/ {backend}/_next/"""

    return {
        "cloudflare": cf_worker,
        "nextjs": nextjs_rewrite,
        "vercel": vercel_rewrite,
        "nginx": nginx_config,
        "caddy": caddy_config,
        "apache": apache_config,
    }
