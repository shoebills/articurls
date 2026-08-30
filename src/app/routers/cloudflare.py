from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models
from ..config import settings
from ..database import get_db
from ..redis_client import redis_client
from ..security.oauth2 import get_current_site
from ..domains.schemas import SubfolderIn, SubfolderOut, CloudflareDeployIn
from ..cloudflare.client import CloudflareClient, CloudflareError
from ..cloudflare.worker_template import generate_worker_script

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Subfolder / Cloudflare"])


def normalize_subpath(raw: str | None) -> str:
    if not raw:
        return "/blog"
    clean = "/" + raw.strip().strip("/").lower()
    return clean if clean != "/" else "/blog"


def normalize_domain(raw: str) -> str:
    host = raw.strip().lower()
    for prefix in ("https://", "http://"):
        if host.startswith(prefix):
            host = host[len(prefix):]
    return host.split("/")[0].split("?")[0].rstrip(".")


@router.get("/settings/subfolder", response_model=SubfolderOut, status_code=status.HTTP_200_OK)
def get_subfolder_settings(
    current_site: models.Site = Depends(get_current_site),
):
    is_active = bool(current_site.custom_domain and current_site.custom_subpath)
    return SubfolderOut(
        custom_domain=current_site.custom_domain,
        custom_subpath=current_site.custom_subpath,
        cf_connected=current_site.cf_connected,
        is_active=is_active,
    )


@router.post("/settings/subfolder", response_model=SubfolderOut, status_code=status.HTTP_200_OK)
def update_subfolder_settings(
    body: SubfolderIn,
    db: Session = Depends(get_db),
    current_site: models.Site = Depends(get_current_site),
):
    domain = normalize_domain(body.custom_domain)
    subpath = normalize_subpath(body.custom_subpath)

    if not domain or "." not in domain:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Please provide a valid domain name.")

    existing = db.query(models.Site).filter(
        models.Site.custom_domain == domain,
        models.Site.custom_subpath == subpath,
        models.Site.site_id != current_site.site_id,
    ).first()

    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This domain and subfolder path is already in use.")

    current_site.custom_domain = domain
    current_site.custom_subpath = subpath
    current_site.domain_status = models.DomainStatus.ACTIVE
    db.commit()
    db.refresh(current_site)

    try:
        redis_client.delete(f"domain_lookup:{domain}")
    except Exception:
        pass

    return SubfolderOut(
        custom_domain=current_site.custom_domain,
        custom_subpath=current_site.custom_subpath,
        cf_connected=current_site.cf_connected,
        is_active=True,
    )


@router.post("/settings/subfolder/deploy", response_model=SubfolderOut, status_code=status.HTTP_200_OK)
async def deploy_cloudflare_subfolder(
    body: CloudflareDeployIn,
    db: Session = Depends(get_db),
    current_site: models.Site = Depends(get_current_site),
):
    """Deploy reverse-proxy worker script and bind route directly using user's Cloudflare API Token."""
    domain = normalize_domain(body.custom_domain)
    subpath = normalize_subpath(body.custom_subpath)
    cf_token = body.cf_token.strip()

    if not domain or "." not in domain:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Please provide a valid domain name.")
    if not cf_token:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Cloudflare API token is required.")

    cf = CloudflareClient(token=cf_token)
    try:
        zone = await cf.get_zone_for_hostname(domain)
        if not zone:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Could not find an active Cloudflare zone for domain '{domain}'. Please ensure your domain is active on Cloudflare and your API Token has Zone:Read permission.",
            )

        zone_id = zone["id"]
        account_id = await cf.get_account_id(zone)
        if not account_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not resolve Cloudflare Account ID. Please ensure your API Token has Account:Workers permission.",
            )

        # Upload worker script
        script_name = f"articurls-proxy-{current_site.subdomain}"
        script_code = generate_worker_script(current_site.subdomain, settings.ugc_domain, subpath)
        await cf.upload_worker_script(account_id, script_name, script_code)

        # Bind route
        pattern = f"{domain}{subpath}/*"
        route_id = await cf.create_worker_route(zone_id, pattern, script_name)

        current_site.custom_domain = domain
        current_site.custom_subpath = subpath
        current_site.cf_zone_id = zone_id
        current_site.cf_route_id = route_id
        current_site.cf_connected = True
        current_site.domain_status = models.DomainStatus.ACTIVE
        db.commit()
        db.refresh(current_site)

        try:
            redis_client.delete(f"domain_lookup:{domain}")
        except Exception:
            pass

        return SubfolderOut(
            custom_domain=current_site.custom_domain,
            custom_subpath=current_site.custom_subpath,
            cf_connected=current_site.cf_connected,
            is_active=True,
        )

    except CloudflareError as cfe:
        logger.error("Cloudflare token deploy error: %s", cfe)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cloudflare error: {cfe.body}")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Cloudflare unexpected deploy error: %s", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to deploy worker: {str(exc)}")


@router.delete("/settings/subfolder", status_code=status.HTTP_200_OK)
async def delete_subfolder_settings(
    db: Session = Depends(get_db),
    current_site: models.Site = Depends(get_current_site),
):
    old_domain = current_site.custom_domain
    current_site.custom_subpath = None
    if not current_site.cf_connected:
        current_site.custom_domain = None
        current_site.domain_status = models.DomainStatus.NONE

    db.commit()

    if old_domain:
        try:
            redis_client.delete(f"domain_lookup:{old_domain}")
        except Exception:
            pass

    return {"message": "Subfolder settings removed."}


@router.delete("/settings/subfolder/cloudflare", status_code=status.HTTP_200_OK)
async def disconnect_cloudflare(
    db: Session = Depends(get_db),
    current_site: models.Site = Depends(get_current_site),
):
    """Disconnect Cloudflare and delete worker route."""
    current_site.cf_connected = False
    current_site.cf_route_id = None
    current_site.cf_zone_id = None
    db.commit()
    return {"message": "Cloudflare disconnected."}


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

    nextjs_rewrite = f"""// next.config.mjs (or next.config.js)
export default {{
  async rewrites() {{
    return [
      {{
        source: '{clean_subpath}',
        destination: '{backend}{clean_subpath}',
      }},
      {{
        source: '{clean_subpath}/:path*',
        destination: '{backend}{clean_subpath}/:path*',
      }},
    ];
  }},
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
    }}
  ]
}}"""

    nginx_config = f"""# Nginx location block
location {clean_subpath} {{
    proxy_pass {backend}{clean_subpath};
    proxy_set_header Host {domain};
    proxy_set_header X-Original-Host {domain};
    proxy_set_header X-Articurls-Basepath {clean_subpath};
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_ssl_server_name on;
}}"""

    caddy_config = f"""# Caddyfile
{domain} {{
    handle_path {clean_subpath}* {{
        reverse_proxy {backend} {{
            header_up Host {domain}
            header_up X-Original-Host {domain}
            header_up X-Articurls-Basepath {clean_subpath}
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
ProxyPassReverse {clean_subpath} {backend}{clean_subpath}"""

    return {
        "cloudflare_worker": cf_worker,
        "nextjs": nextjs_rewrite,
        "vercel": vercel_rewrite,
        "nginx": nginx_config,
        "caddy": caddy_config,
        "apache": apache_config,
    }
