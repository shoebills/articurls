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

def send_verify_new_user(to_email: str, blog_name: str, verify_token: str):

    html = (TEMPLATE_DIR / "verify_new_user.html").read_text()

    html = html.replace("{{ blog_name }}", blog_name)
    base = settings.app_base_url.rstrip("/")
    html = html.replace(
        "{{ verify_url }}",
        f"{base}/verify?token={verify_token}",
    )
    html = html.replace("{{ expiry_hours }}", "24")

    subject = "Verify your email for Articurls"

    send_email(to_email, subject, html)

def send_password_reset(to_email: str, reset_token: str):

    html = (TEMPLATE_DIR / "reset_password.html").read_text()

    reset_url = f"{_api_base()}/reset-password?token={reset_token}"
    html = html.replace("{{ reset_url }}", reset_url)

    subject = "Reset your Articurls password"
    send_email(to_email, subject, html)


def send_trial_expired_email(to_email: str, blog_name: str):

    html = (TEMPLATE_DIR / "trial_expired.html").read_text()

    html = html.replace("{{ blog_name }}", blog_name)
    billing_url = f"{settings.app_base_url.rstrip('/')}/dashboard/billing?plan=pro"
    html = html.replace("{{ billing_url }}", billing_url)

    subject = "Your Articurls trial has ended"
    send_email(to_email, subject, html)


def send_trial_deletion_warning_email(to_email: str, blog_name: str, time_left: str):

    html = (TEMPLATE_DIR / "deletion_warning.html").read_text()

    html = html.replace("{{ blog_name }}", blog_name)
    html = html.replace("{{ time_left }}", time_left)
    billing_url = f"{settings.app_base_url.rstrip('/')}/dashboard/billing?plan=pro"
    html = html.replace("{{ billing_url }}", billing_url)

    subject = f"Your Articurls account will be deleted in {time_left}"
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