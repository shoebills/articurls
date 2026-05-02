"""
Cloudflare Custom Hostnames API client.
Implements SaaS custom domain onboarding using Cloudflare for SaaS.
"""
import httpx
from typing import Optional, Dict, Any
from ..config import settings


class CloudflareError(Exception):
    def __init__(self, status_code: int, body: str):
        self.status_code = status_code
        self.body = body
        super().__init__(f"Cloudflare API error {status_code}: {body}")


class CloudflareClient:
    def __init__(self):
        self.api_token = settings.cloudflare_api_token
        self.zone_id = settings.cloudflare_zone_id
        self.base_url = "https://api.cloudflare.com/client/v4"
        self.headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
        }

    async def create_custom_hostname(self, hostname: str) -> Optional[Dict[str, Any]]:
        url = f"{self.base_url}/zones/{self.zone_id}/custom_hostnames"
        payload = {
            "hostname": hostname,
            "ssl": {
                "method": "txt",
                "type": "dv",
                "settings": {"min_tls_version": "1.2"},
            },
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload, headers=self.headers)
                if response.status_code == 201:
                    data = response.json()
                    if data.get("success"):
                        return data.get("result")
                raise CloudflareError(response.status_code, response.text)
        except CloudflareError:
            raise
        except Exception as e:
            print(f"Cloudflare create_custom_hostname error: {e}")
            return None

    async def get_custom_hostname(self, hostname_id: str) -> Optional[Dict[str, Any]]:
        url = f"{self.base_url}/zones/{self.zone_id}/custom_hostnames/{hostname_id}"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=self.headers)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        return data.get("result")
                return None
        except Exception as e:
            print(f"Cloudflare get_custom_hostname error: {e}")
            return None

    async def delete_custom_hostname(self, hostname_id: str) -> bool:
        url = f"{self.base_url}/zones/{self.zone_id}/custom_hostnames/{hostname_id}"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.delete(url, headers=self.headers)
                return response.status_code in (200, 404)
        except Exception as e:
            print(f"Cloudflare delete_custom_hostname error: {e}")
            return False

    async def force_recheck(self, hostname_id: str) -> Optional[Dict[str, Any]]:
        url = f"{self.base_url}/zones/{self.zone_id}/custom_hostnames/{hostname_id}"
        payload = {"ssl": {"method": "txt", "type": "dv"}}
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.patch(url, json=payload, headers=self.headers)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        return data.get("result")
                return None
        except Exception as e:
            print(f"Cloudflare force_recheck error: {e}")
            return None

    # ── Sync versions for use in Celery tasks (no event loop) ────────────────

    def get_custom_hostname_sync(self, hostname_id: str) -> Optional[Dict[str, Any]]:
        url = f"{self.base_url}/zones/{self.zone_id}/custom_hostnames/{hostname_id}"
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.get(url, headers=self.headers)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        return data.get("result")
                return None
        except Exception as e:
            print(f"Cloudflare get_custom_hostname_sync error: {e}")
            return None

    def delete_custom_hostname_sync(self, hostname_id: str) -> bool:
        url = f"{self.base_url}/zones/{self.zone_id}/custom_hostnames/{hostname_id}"
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.delete(url, headers=self.headers)
                return response.status_code in (200, 404)
        except Exception as e:
            print(f"Cloudflare delete_custom_hostname_sync error: {e}")
            return False
