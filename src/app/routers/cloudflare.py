from __future__ import annotations

import json
import logging
import secrets
from urllib.parse import quote, urlencode
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from .. import models
from ..config import settings
from ..database import get_db
from ..redis_client import redis_client
from ..security.oauth2 import get_current_site, get_current_user
from ..domains.schemas import SubfolderIn, SubfolderOut
from ..cloudflare.client import CloudflareClient, CloudflareError
from ..cloudflare.worker_template import generate_worker_script

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Subfolder / Cloudflare"])

_CF_OAUTH_STATE_TTL = 900  # 15 minutes


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

    # Check if this domain+subpath combination is already taken by another site
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


@router.get("/auth/cloudflare/connect")
def cloudflare_connect(
    current_user: models.User = Depends(get_current_user),
    current_site: models.Site = Depends(get_current_site),
):
    """Initiate Cloudflare OAuth flow for automatic worker provisioning."""
    if not settings.cloudflare_client_id or not settings.cloudflare_redirect_uri:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cloudflare OAuth is not configured on this server.",
        )

    state = secrets.token_urlsafe(32)
    state_payload = {
        "user_id": current_user.user_id,
        "site_id": current_site.site_id,
    }
    redis_client.setex(f"cf_oauth:{state}", _CF_OAUTH_STATE_TTL, json.dumps(state_payload))

    params = {
        "client_id": settings.cloudflare_client_id,
        "redirect_uri": settings.cloudflare_redirect_uri,
        "response_type": "code",
        "scope": "workers:write workers_routes:write zone:read offline_access",
        "state": state,
    }
    auth_url = f"https://dash.cloudflare.com/oauth2/auth?{urlencode(params)}"
    return {"auth_url": auth_url}


@router.get("/auth/cloudflare/callback")
async def cloudflare_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    """Handle Cloudflare OAuth return and provision worker + route."""
    dashboard_settings_url = f"{settings.app_base_url}/dashboard/settings"

    if error or not code or not state:
        return RedirectResponse(f"{dashboard_settings_url}?cf_error=oauth_rejected", status_code=status.HTTP_302_FOUND)

    cached_state = redis_client.get(f"cf_oauth:{state}")
    if not cached_state:
        return RedirectResponse(f"{dashboard_settings_url}?cf_error=invalid_state", status_code=status.HTTP_302_FOUND)

    redis_client.delete(f"cf_oauth:{state}")
    state_data = json.loads(cached_state)
    site_id = state_data.get("site_id")

    site = db.query(models.Site).filter(models.Site.site_id == site_id).first()
    if not site or not site.custom_domain:
        return RedirectResponse(f"{dashboard_settings_url}?cf_error=no_domain_set", status_code=status.HTTP_302_FOUND)

    # Exchange code for access token
    token_url = "https://dash.cloudflare.com/oauth2/token"
    token_payload = {
        "grant_type": "authorization_code",
        "client_id": settings.cloudflare_client_id,
        "client_secret": settings.cloudflare_client_secret,
        "redirect_uri": settings.cloudflare_redirect_uri,
        "code": code,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(token_url, data=token_payload)
            if not res.is_success:
                logger.error("Cloudflare token exchange failed: %s", res.text)
                return RedirectResponse(f"{dashboard_settings_url}?cf_error=token_failed", status_code=status.HTTP_302_FOUND)
            token_data = res.json()
            access_token = token_data.get("access_token")
    except Exception as e:
        logger.error("Cloudflare token exchange exception: %s", e)
        return RedirectResponse(f"{dashboard_settings_url}?cf_error=network_error", status_code=status.HTTP_302_FOUND)

    cf = CloudflareClient(token=access_token)
    try:
        zone = await cf.get_zone_for_hostname(site.custom_domain)
        if not zone:
            return RedirectResponse(f"{dashboard_settings_url}?cf_error=zone_not_found", status_code=status.HTTP_302_FOUND)

        zone_id = zone["id"]
        account_id = await cf.get_account_id(zone)
        if not account_id:
            return RedirectResponse(f"{dashboard_settings_url}?cf_error=account_not_found", status_code=status.HTTP_302_FOUND)

        # Upload worker script
        script_name = f"articurls-proxy-{site.subdomain}"
        custom_subpath = site.custom_subpath or "/blog"
        script_code = generate_worker_script(site.subdomain, settings.ugc_domain, custom_subpath)
        await cf.upload_worker_script(account_id, script_name, script_code)

        # Bind route
        pattern = f"{site.custom_domain}{custom_subpath}/*"
        route_id = await cf.create_worker_route(zone_id, pattern, script_name)

        site.cf_zone_id = zone_id
        site.cf_route_id = route_id
        site.cf_connected = True
        site.domain_status = models.DomainStatus.ACTIVE
        db.commit()

        return RedirectResponse(f"{dashboard_settings_url}?cf_success=connected", status_code=status.HTTP_302_FOUND)

    except CloudflareError as cfe:
        logger.error("Cloudflare provisioning error: %s", cfe)
        return RedirectResponse(f"{dashboard_settings_url}?cf_error=provisioning_failed", status_code=status.HTTP_302_FOUND)
    except Exception as exc:
        logger.error("Cloudflare unexpected callback error: %s", exc)
        return RedirectResponse(f"{dashboard_settings_url}?cf_error=unknown", status_code=status.HTTP_302_FOUND)


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
        source: '{clean_subpath}/:path*',
        destination: '{backend}{clean_subpath}/:path*',
      }},
    ];
  }},
}};"""

    nginx_config = f"""# Nginx location block
location {clean_subpath}/ {{
    proxy_pass {backend}{clean_subpath}/;
    proxy_set_header Host {domain};
    proxy_set_header X-Original-Host {domain};
    proxy_set_header X-Articurls-Basepath {clean_subpath};
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_ssl_server_name on;
}}"""

    caddy_config = f"""# Caddyfile
{domain} {{
    handle_path {clean_subpath}/* {{
        reverse_proxy {backend} {{
            header_up Host {domain}
            header_up X-Original-Host {domain}
            header_up X-Articurls-Basepath {clean_subpath}
        }}
    }}
}}"""

    return {
        "cloudflare_worker": cf_worker,
        "nextjs": nextjs_rewrite,
        "nginx": nginx_config,
        "caddy": caddy_config,
    }
