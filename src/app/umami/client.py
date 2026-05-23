"""
Umami admin API client (self-hosted v3).

Uses login/password auth. Sync methods are for Celery workers.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import httpx

from ..config import settings

logger = logging.getLogger(__name__)


class UmamiError(Exception):
    def __init__(self, status_code: int, body: str):
        self.status_code = status_code
        self.body = body
        super().__init__(f"Umami API error {status_code}: {body}")


class UmamiClient:
    def __init__(self) -> None:
        self._token: Optional[str] = None

    @property
    def configured(self) -> bool:
        return bool(
            settings.umami_api_url
            and settings.umami_api_username
            and settings.umami_api_password
        )

    @property
    def base_url(self) -> str:
        return settings.umami_api_url.rstrip("/")

    def _login_sync(self) -> str:
        url = f"{self.base_url}/api/auth/login"
        payload = {
            "username": settings.umami_api_username,
            "password": settings.umami_api_password,
        }
        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, json=payload)
            if response.status_code != 200:
                raise UmamiError(response.status_code, response.text)
            data = response.json()
            token = data.get("token")
            if not token:
                raise UmamiError(response.status_code, "Missing token in login response")
            self._token = token
            return token

    def _auth_headers_sync(self, force_login: bool = False) -> Dict[str, str]:
        if force_login or not self._token:
            self._login_sync()
        return {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _request_sync(
        self,
        method: str,
        path: str,
        *,
        json: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        with httpx.Client(timeout=30.0) as client:
            kwargs: Dict[str, Any] = {}
            if method.upper() == "GET" and json:
                kwargs["params"] = json
            elif json:
                kwargs["json"] = json
            response = client.request(
                method,
                url,
                headers=self._auth_headers_sync(),
                **kwargs,
            )
            if response.status_code == 401:
                kwargs_retry: Dict[str, Any] = {}
                if method.upper() == "GET" and json:
                    kwargs_retry["params"] = json
                elif json:
                    kwargs_retry["json"] = json
                response = client.request(
                    method,
                    url,
                    headers=self._auth_headers_sync(force_login=True),
                    **kwargs_retry,
                )
            if response.status_code >= 400:
                raise UmamiError(response.status_code, response.text)
            if not response.content:
                return {}
            return response.json()

    def create_website_sync(self, *, name: str, domain: str) -> Dict[str, Any]:
        return self._request_sync(
            "POST",
            "/api/websites",
            json={"name": name, "domain": domain},
        )

    def update_website_sync(
        self,
        website_id: str,
        *,
        name: Optional[str] = None,
        domain: Optional[str] = None,
    ) -> Dict[str, Any]:
        payload: Dict[str, str] = {}
        if name is not None:
            payload["name"] = name
        if domain is not None:
            payload["domain"] = domain
        return self._request_sync(
            "POST",
            f"/api/websites/{website_id}",
            json=payload,
        )

    def get_share_sync(self, website_id: str) -> Optional[str]:
        """Return the share URL for the first existing share of a website, or None."""
        try:
            data = self._request_sync("GET", f"/api/websites/{website_id}/shares")
            shares = data.get("data", [])
            if not shares:
                return None
            slug = shares[0].get("slug")
            if not slug:
                return None
            return f"{self.base_url}/share/{slug}"
        except UmamiError as exc:
            if exc.status_code == 404:
                return None
            raise

    def enable_share_sync(self, website_id: str, name: str = "Analytics") -> str:
        """Create a share page for a website and return the share URL."""
        data = self._request_sync(
            "POST",
            f"/api/websites/{website_id}/shares",
            json={
                "name": name,
                "parameters": {
                    "overview": True,
                    "events": True,
                    "sessions": True,
                },
            },
        )
        slug = data.get("slug")
        if not slug:
            raise UmamiError(500, "Missing slug in Umami share response")
        return f"{self.base_url}/share/{slug}"

    def get_or_create_share_sync(self, website_id: str, name: str = "Analytics") -> str:
        """Return the share URL, creating a share page if none exists."""
        existing = self.get_share_sync(website_id)
        if existing:
            return existing
        return self.enable_share_sync(website_id, name=name)

    def get_website_stats_sync(
        self,
        website_id: str,
        *,
        start_at: int,
        end_at: int,
    ) -> Dict[str, Any]:
        """Return core stats (pageviews, visitors, sessions, etc.) for a date range."""
        params = {"startAt": start_at, "endAt": end_at}
        return self._request_sync(
            "GET",
            f"/api/websites/{website_id}/stats",
            params=params,
        )

    def get_website_pageviews_sync(
        self,
        website_id: str,
        *,
        start_at: int,
        end_at: int,
        unit: str = "day",
        timezone: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Return pageviews timeseries data."""
        params = {
            "startAt": start_at,
            "endAt": end_at,
            "unit": unit,
        }
        if timezone:
            params["timezone"] = timezone
        return self._request_sync(
            "GET",
            f"/api/websites/{website_id}/pageviews",
            params=params,
        )

    def get_website_metrics_sync(
        self,
        website_id: str,
        *,
        start_at: int,
        end_at: int,
        type: str,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Dict[str, Any]]:
        """Return metrics by dimension (path, referrer, country, browser, etc.)."""
        params = {
            "startAt": start_at,
            "endAt": end_at,
            "type": type,
            "limit": limit,
            "offset": offset,
        }
        return self._request_sync(
            "GET",
            f"/api/websites/{website_id}/metrics",
            params=params,
        )

    def get_website_active_sync(self, website_id: str) -> Dict[str, Any]:
        """Return active visitors in the last 5 minutes."""
        return self._request_sync(
            "GET",
            f"/api/websites/{website_id}/active",
        )

    def get_realtime_sync(self, website_id: str) -> Dict[str, Any]:
        """Return realtime analytics (last 30 minutes)."""
        return self._request_sync(
            "GET",
            f"/api/realtime/{website_id}",
        )
