from pathlib import Path
from ..config import settings
from .smtp import send_smtp_email
from .resend import send_resend_email


TEMPLATE_DIR = Path(__file__).parent


def _api_base() -> str:
    return settings.public_base_url.rstrip("/")


def send_email(to_email, subject, html):

    if settings.email_provider == "resend":
        send_resend_email(to_email, subject, html)
    else:
        send_smtp_email(to_email, subject, html)

def send_verify_new_user(
    to_email: str,
    blog_name: str,
    verify_token: str,
    *,
    is_new_signup: bool = True,
):
    html = (TEMPLATE_DIR / "verify_new_user.html").read_text()

    if is_new_signup:
        intro_before = "Thanks for signing up for "
        intro_after = ". Confirm your email address to activate your account and open your dashboard."
        note_title = "Verify your email to activate your account."
        note_body = "Unverified accounts are automatically deleted 14 days after sign-up."
        footer_note = "If you didn’t create an account, you can safely ignore this email."
        subject = "Verify your email for Articurls"
    else:
        intro_before = "Confirm your new email address for "
        intro_after = "."
        note_title = "Verify your new email address."
        note_body = "You’ll need to confirm this address to complete the change."
        footer_note = "If you didn’t request this change, contact support immediately."
        subject = "Verify your new email for Articurls"

    html = html.replace("{{ blog_name }}", blog_name)
    base = settings.app_base_url.rstrip("/")
    html = html.replace(
        "{{ verify_url }}",
        f"{base}/verify?token={verify_token}",
    )
    html = html.replace("{{ expiry_hours }}", "24")
    html = html.replace("{{ intro_before }}", intro_before)
    html = html.replace("{{ intro_after }}", intro_after)
    html = html.replace("{{ note_title }}", note_title)
    html = html.replace("{{ note_body }}", note_body)
    html = html.replace("{{ footer_note }}", footer_note)

    send_email(to_email, subject, html)

def send_password_reset(to_email: str, reset_token: str):

    html = (TEMPLATE_DIR / "reset_password.html").read_text()

    reset_url = f"{_api_base()}/reset-password?token={reset_token}"
    html = html.replace("{{ reset_url }}", reset_url)

    subject = "Reset your Articurls password"
    send_email(to_email, subject, html)


def send_payment_failed_email(to_email: str, name: str):
    html = (TEMPLATE_DIR / "payment_failed.html").read_text()
    html = html.replace("{{ name }}", name or "there")
    billing_url = f"{settings.app_base_url.rstrip('/')}/dashboard/billing"
    html = html.replace("{{ billing_url }}", billing_url)

    subject = "Payment failed for your Articurls subscription"
    send_email(to_email, subject, html)


def send_subscription_cancelled_email(to_email: str, name: str, access_until: str | None = None):
    html = (TEMPLATE_DIR / "subscription_cancelled.html").read_text()
    html = html.replace("{{ name }}", name or "there")
    html = html.replace("{{ access_until }}", access_until or "the end of your current period")
    billing_url = f"{settings.app_base_url.rstrip('/')}/dashboard/billing"
    html = html.replace("{{ billing_url }}", billing_url)

    subject = "Your Articurls subscription has been cancelled"
    send_email(to_email, subject, html)


def send_domain_grace_period_email(to_email: str, name: str, domain: str, grace_expires: str | None = None):
    html = (TEMPLATE_DIR / "domain_grace_period.html").read_text()
    html = html.replace("{{ name }}", name or "there")
    html = html.replace("{{ domain }}", domain)
    html = html.replace("{{ grace_expires }}", grace_expires or "14 days")
    billing_url = f"{settings.app_base_url.rstrip('/')}/dashboard/billing?plan=pro"
    html = html.replace("{{ billing_url }}", billing_url)

    subject = f"Action Required: Your domain {domain} is in grace period"
    send_email(to_email, subject, html)


def send_domain_expired_email(to_email: str, name: str, domain: str):
    html = (TEMPLATE_DIR / "domain_expired.html").read_text()
    html = html.replace("{{ name }}", name or "there")
    html = html.replace("{{ domain }}", domain)
    billing_url = f"{settings.app_base_url.rstrip('/')}/dashboard/billing?plan=pro"
    html = html.replace("{{ billing_url }}", billing_url)

    subject = f"Your custom domain {domain} has been deactivated"
    send_email(to_email, subject, html)


def _send_traffic_quota_email(
    to_email: str,
    template: str,
    subject: str,
    name: str,
    total_pageviews: int,
    tier_limit: int,
):
    html = (TEMPLATE_DIR / template).read_text()
    html = html.replace("{{ name }}", name or "there")
    html = html.replace("{{ usage_pct }}", str(min(100, round(total_pageviews * 100 / tier_limit))))
    html = html.replace("{{ total_pageviews }}", f"{total_pageviews:,}")
    html = html.replace("{{ tier_limit }}", f"{tier_limit:,}")
    billing_url = f"{settings.app_base_url.rstrip('/')}/dashboard/billing/upgrade"
    html = html.replace("{{ billing_url }}", billing_url)

    send_email(to_email, subject, html)


def send_traffic_warning_80_email(to_email: str, name: str, total_pageviews: int, tier_limit: int):
    _send_traffic_quota_email(
        to_email,
        "traffic_warning_80.html",
        "You are approaching your Articurls monthly traffic limit",
        name,
        total_pageviews,
        tier_limit,
    )


def send_traffic_limit_100_email(to_email: str, name: str, total_pageviews: int, tier_limit: int):
    _send_traffic_quota_email(
        to_email,
        "traffic_limit_100.html",
        "You have reached your Articurls monthly traffic limit",
        name,
        total_pageviews,
        tier_limit,
    )


def send_traffic_locked_email(to_email: str, name: str, total_pageviews: int, tier_limit: int):
    _send_traffic_quota_email(
        to_email,
        "traffic_locked.html",
        "Dashboard paused - Articurls monthly traffic limit exceeded",
        name,
        total_pageviews,
        tier_limit,
    )