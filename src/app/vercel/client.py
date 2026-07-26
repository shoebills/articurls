"""
Vercel project domain API — register and verify customer hostnames.
Vercel provisions TLS automatically via Let's Encrypt for all project domains.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import httpx

from ..config import settings

logger = logging.getLogger(__name__)


class VercelError(Exception):
    def __init__(self, status_code: int, body: str):
        self.status_code = status_code
        self.body = body
        super().__init__(f"Vercel API error {status_code}: {body}")


class VercelClient:
    def __init__(self) -> None:
        self.token = settings.vercel_api_token
        self.project = settings.vercel_project_name
        self.team_id = settings.vercel_team_id or None
        self.base_url = "https://api.vercel.com"

    @property
    def configured(self) -> bool:
        return bool(self.token and self.project)

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }

    def _query(self) -> Dict[str, str]:
        if self.team_id:
            return {"teamId": self.team_id}
        return {}

    async def add_project_domain(self, name: str) -> Optional[Dict[str, Any]]:
        if not self.configured:
            return None
        url = f"{self.base_url}/v10/projects/{self.project}/domains"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    json={"name": name.lower().strip()},
                    headers=self._headers(),
                    params=self._query(),
                )
                if response.status_code in (200, 201):
                    return response.json()
                if response.status_code == 409:
                    return await self.get_project_domain(name)
                raise VercelError(response.status_code, response.text)
        except VercelError:
            raise
        except Exception as exc:
            logger.warning("Vercel add_project_domain failed for %s: %s", name, exc)
            return None

    async def get_project_domain(self, name: str) -> Optional[Dict[str, Any]]:
        return self.get_project_domain_sync(name)

    def get_project_domain_sync(self, name: str) -> Optional[Dict[str, Any]]:
        if not self.configured:
            return None
        url = f"{self.base_url}/v9/projects/{self.project}/domains/{name.lower().strip()}"
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.get(
                    url, headers=self._headers(), params=self._query()
                )
                if response.status_code == 200:
                    return response.json()
                return None
        except Exception as exc:
            logger.warning("Vercel get_project_domain failed for %s: %s", name, exc)
            return None

    def ensure_project_domain_sync(self, name: str) -> Optional[Dict[str, Any]]:
        existing = self.get_project_domain_sync(name)
        if existing:
            return existing
        return self.add_project_domain_sync(name)

    def is_project_domain_verified_sync(self, name: str) -> bool:
        domain = self.get_project_domain_sync(name)
        return bool(domain and domain.get("verified"))

    async def verify_project_domain(self, name: str) -> Optional[Dict[str, Any]]:
        if not self.configured:
            return None
        url = (
            f"{self.base_url}/v9/projects/{self.project}/domains/"
            f"{name.lower().strip()}/verify"
        )
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url, headers=self._headers(), params=self._query()
                )
                if response.status_code in (200, 201):
                    return response.json()
                return None
        except Exception as exc:
            logger.warning("Vercel verify_project_domain failed for %s: %s", name, exc)
            return None

    async def remove_project_domain(self, name: str) -> bool:
        if not self.configured:
            return True
        url = f"{self.base_url}/v9/projects/{self.project}/domains/{name.lower().strip()}"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.delete(
                    url, headers=self._headers(), params=self._query()
                )
                return response.status_code in (200, 204, 404)
        except Exception as exc:
            logger.warning("Vercel remove_project_domain failed for %s: %s", name, exc)
            return False

    def add_project_domain_sync(self, name: str) -> Optional[Dict[str, Any]]:
        if not self.configured:
            return None
        url = f"{self.base_url}/v10/projects/{self.project}/domains"
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    url,
                    json={"name": name.lower().strip()},
                    headers=self._headers(),
                    params=self._query(),
                )
                if response.status_code in (200, 201):
                    return response.json()
                if response.status_code == 409:
                    get_url = (
                        f"{self.base_url}/v9/projects/{self.project}/domains/"
                        f"{name.lower().strip()}"
                    )
                    get_resp = client.get(
                        get_url, headers=self._headers(), params=self._query()
                    )
                    if get_resp.status_code == 200:
                        return get_resp.json()
                return None
        except Exception as exc:
            logger.warning("Vercel add_project_domain_sync failed for %s: %s", name, exc)
            return None

    def verify_project_domain_sync(self, name: str) -> Optional[Dict[str, Any]]:
        if not self.configured:
            return None
        url = (
            f"{self.base_url}/v9/projects/{self.project}/domains/"
            f"{name.lower().strip()}/verify"
        )
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    url, headers=self._headers(), params=self._query()
                )
                if response.status_code in (200, 201):
                    return response.json()
                return None
        except Exception as exc:
            logger.warning("Vercel verify_project_domain_sync failed for %s: %s", name, exc)
            return None


def vercel_verification_records(
    vercel_domain: Optional[Dict[str, Any]],
    hostname: str,
) -> List[Dict[str, Any]]:
    """Turn Vercel domain.verification challenges into dashboard DNS rows."""
    if not vercel_domain or vercel_domain.get("verified"):
        return []
    rows: List[Dict[str, Any]] = []
    for challenge in vercel_domain.get("verification") or []:
        if not isinstance(challenge, dict):
            continue
        record_type = (challenge.get("type") or "TXT").upper()
        if record_type != "TXT":
            continue
        name = challenge.get("domain") or hostname
        value = challenge.get("value") or ""
        if not value:
            continue
        rows.append(
            {
                "type": "TXT",
                "name": name,
                "value": value,
                "purpose": "vercel",
                "verified": False,
            }
        )
    return rows


def append_vercel_dns_instructions(
    instructions: list,
    hostname: str,
) -> list:
    """Append Vercel TXT verification rows to DNS instructions."""
    from ..domains.schemas import DNSRecord

    if not settings.vercel_api_token or not settings.vercel_project_name:
        return instructions
    vc = VercelClient()
    vercel_domain = vc.ensure_project_domain_sync(hostname)
    extra = vercel_verification_records(vercel_domain, hostname)
    if not extra:
        return instructions
    return instructions + [DNSRecord(**row) for row in extra]


merge_vercel_dns_instructions = append_vercel_dns_instructions
