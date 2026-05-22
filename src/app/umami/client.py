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
            response = client.request(
                method,
                url,
                json=json,
                headers=self._auth_headers_sync(),
            )
            if response.status_code == 401:
                response = client.request(
                    method,
                    url,
                    json=json,
                    headers=self._auth_headers_sync(force_login=True),
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
