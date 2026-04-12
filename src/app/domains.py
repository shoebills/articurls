from __future__ import annotations
import dns.exception
import dns.name
import dns.resolver
from urllib.parse import urlparse

MAX_CNAME_HOPS = 20
DNS_QUERY_LIFETIME = 10.0


def normalize_custom_domain(raw: str | None) -> str | None:
    
    if raw is None:
        return None
    s = str(raw).strip().lower()
    if not s:
        return None
    if "://" in s:
        parsed = urlparse(s)
        host = parsed.hostname
        if not host:
            return None
        s = host.lower()
    else:
        s = s.split("/")[0].strip().lower()
        if not s:
            return None
    return s.rstrip(".") or None


def verify_custom_domain_dns(user_hostname: str, cname_target: str) -> None:
    
    host = normalize_custom_domain(user_hostname)
    target = normalize_custom_domain(cname_target)
    if not host:
        raise ValueError("Set a valid custom domain before verifying.")
    if not target:
        raise ValueError("Server misconfiguration: CNAME target is empty.")

    current = dns.name.from_text(host)
    expected = dns.name.from_text(target)

    for hop in range(MAX_CNAME_HOPS):
        try:
            answers = dns.resolver.resolve(
                current, "CNAME", lifetime=DNS_QUERY_LIFETIME
            )
            nxt = answers[0].target
            if nxt == current:
                raise ValueError("DNS misconfiguration: CNAME loop detected.")
            current = nxt
        except dns.resolver.NoAnswer:
            break
        except dns.resolver.NXDOMAIN:
            raise ValueError(
                f"No DNS records found for {host!r}. Add this hostname at your DNS provider, "
                f"then create a CNAME pointing it to {target!r}."
            ) from None
        except dns.resolver.LifetimeTimeout:
            raise ValueError(
                "DNS lookup timed out. Try again in a few minutes after saving your DNS changes."
            ) from None
        except dns.exception.DNSException as exc:
            raise ValueError(f"DNS lookup failed: {exc}") from None

    final = str(current).rstrip(".").lower()
    want = str(expected).rstrip(".").lower()
    if final != want:
        raise ValueError(
            f"Your domain does not point to the required target yet. "
            f"Create a CNAME from {host!r} to {want!r}. "
            f"(Currently resolves to {final!r} after following CNAMEs.)"
        )