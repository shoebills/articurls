from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
import httpx

from ..config import settings

logger = logging.getLogger(__name__)


class CloudflareError(Exception):
    def __init__(self, status_code: int, body: str):
        self.status_code = status_code
        self.body = body
        super().__init__(f"Cloudflare API error {status_code}: {body}")


class CloudflareClient:
    def __init__(self, token: Optional[str] = None) -> None:
        self.token = token
        self.base_url = "https://api.cloudflare.com/client/v4"

    def _headers(self, content_type: str = "application/json") -> Dict[str, str]:
        headers = {
            "Content-Type": content_type,
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    async def get_zone_for_hostname(self, hostname: str) -> Optional[Dict[str, Any]]:
        """Find the Cloudflare zone that owns this hostname (apex or subdomain)."""
        # Try finding by full domain or apex domain
        parts = hostname.lower().strip().split(".")
        candidates = []
        for i in range(len(parts) - 1):
            candidates.append(".".join(parts[i:]))

        async with httpx.AsyncClient(timeout=10.0) as client:
            for cand in candidates:
                url = f"{self.base_url}/zones"
                res = await client.get(url, params={"name": cand, "status": "active"}, headers=self._headers())
                if res.is_success:
                    data = res.json()
                    if data.get("result"):
                        return data["result"][0]
        return None

    async def get_account_id(self, zone: Optional[Dict[str, Any]] = None) -> Optional[str]:
        """Resolve account ID from zone or accounts endpoint."""
        if zone and "account" in zone and "id" in zone["account"]:
            return zone["account"]["id"]

        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.base_url}/accounts"
            res = await client.get(url, headers=self._headers())
            if res.is_success:
                data = res.json()
                if data.get("result"):
                    return data["result"][0]["id"]
        return None

    async def upload_worker_script(self, account_id: str, script_name: str, script_content: str) -> bool:
        """Upload a JavaScript worker script to Cloudflare."""
        url = f"{self.base_url}/accounts/{account_id}/workers/scripts/{script_name}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.put(
                url,
                content=script_content.encode("utf-8"),
                headers=self._headers(content_type="application/javascript"),
            )
            if not res.is_success:
                logger.error("Failed to upload Cloudflare worker: %s", res.text)
                raise CloudflareError(res.status_code, res.text)
            return True

    async def create_worker_route(self, zone_id: str, pattern: str, script_name: str) -> str:
        """Bind a pattern like `example.com/blog/*` to the worker script."""
        url = f"{self.base_url}/zones/{zone_id}/workers/routes"
        payload = {
            "pattern": pattern,
            "script": script_name,
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(url, json=payload, headers=self._headers())
            if not res.is_success:
                logger.error("Failed to create worker route: %s", res.text)
                raise CloudflareError(res.status_code, res.text)
            data = res.json()
            return data["result"]["id"]

    async def delete_worker_route(self, zone_id: str, route_id: str) -> bool:
        """Delete an existing worker route."""
        url = f"{self.base_url}/zones/{zone_id}/workers/routes/{route_id}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.delete(url, headers=self._headers())
            return res.is_success
