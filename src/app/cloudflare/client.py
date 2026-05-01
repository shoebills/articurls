"""
Cloudflare Custom Hostnames API client.
Implements SaaS custom domain onboarding using Cloudflare for SaaS.
"""
import httpx
from typing import Optional, Dict, Any, List
from ..config import settings


class CloudflareClient:
    def __init__(self):
        self.api_token = settings.cloudflare_api_token
        self.zone_id = settings.cloudflare_zone_id
        self.base_url = "https://api.cloudflare.com/client/v4"
        self.headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
        }

    def create_custom_hostname(self, hostname: str) -> Optional[Dict[str, Any]]:
        """
        Create a custom hostname in Cloudflare.
        
        Returns the full API response or None on failure.
        Response structure:
        {
            "id": "hostname_id",
            "hostname": "blog.example.com",
            "status": "pending",
            "ownership_verification": {
                "type": "txt",
                "name": "_cf-custom-hostname.blog.example.com",
                "value": "abc123..."
            },
            "ssl": {
                "status": "pending_validation",
                "method": "txt",
                "type": "dv",
                "validation_records": [
                    {
                        "txt_name": "_acme-challenge.blog.example.com",
                        "txt_value": "xyz789..."
                    }
                ]
            }
        }
        """
        url = f"{self.base_url}/zones/{self.zone_id}/custom_hostnames"
        payload = {
            "hostname": hostname,
            "ssl": {
                "method": "txt",
                "type": "dv",
                "settings": {
                    "min_tls_version": "1.2"
                }
            }
        }
        
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(url, json=payload, headers=self.headers)
                
                if response.status_code == 201:
                    data = response.json()
                    if data.get("success"):
                        return data.get("result")
                
                return None
        except Exception as e:
            print(f"Cloudflare create_custom_hostname error: {e}")
            return None

    def get_custom_hostname(self, hostname_id: str) -> Optional[Dict[str, Any]]:
        """
        Get custom hostname details from Cloudflare.
        
        Returns the full hostname object or None on failure.
        """
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
            print(f"Cloudflare get_custom_hostname error: {e}")
            return None

    def delete_custom_hostname(self, hostname_id: str) -> bool:
        """
        Delete a custom hostname from Cloudflare.
        
        Returns True on success (including 404), False on other errors.
        """
        url = f"{self.base_url}/zones/{self.zone_id}/custom_hostnames/{hostname_id}"
        
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.delete(url, headers=self.headers)
                
                # Success or already deleted
                if response.status_code in (200, 404):
                    return True
                
                return False
        except Exception as e:
            print(f"Cloudflare delete_custom_hostname error: {e}")
            return False

    def force_recheck(self, hostname_id: str) -> Optional[Dict[str, Any]]:
        """
        Force Cloudflare to recheck hostname and SSL validation.
        
        Returns updated hostname object or None on failure.
        """
        url = f"{self.base_url}/zones/{self.zone_id}/custom_hostnames/{hostname_id}"
        payload = {
            "ssl": {
                "method": "txt",
                "type": "dv"
            }
        }
        
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.patch(url, json=payload, headers=self.headers)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        return data.get("result")
                
                return None
        except Exception as e:
            print(f"Cloudflare force_recheck error: {e}")
            return None
