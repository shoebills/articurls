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

def send_new_post_email(to_email: str, post_title: str, blog_url: str, blog_name: str, unsubscribe_token):

    html = (TEMPLATE_DIR / "new_post_email.html").read_text()

    html = html.replace("{{ post_title }}", post_title)
    html = html.replace("{{ post_url }}", blog_url)
    html = html.replace("{{ blog_name }}", blog_name)
    html = html.replace(
        "{{ unsubscribe_url }}",
        f"{_api_base()}/unsubscribe?token={unsubscribe_token}",
    )

    subject = f"New post from {blog_name}: {post_title}"
    send_email(to_email, subject, html)

def send_sub_confirmation_email(to_email: str, blog_name: str, confirm_token: str):

    html = (TEMPLATE_DIR / "confirm_subscription.html").read_text()

    html = html.replace("{{ blog_name }}", blog_name)
    html = html.replace(
        "{{ confirm_url }}",
        f"{_api_base()}/confirm-subscription?token={confirm_token}",
    )

    subject = f"Confirm your subscription to {blog_name}'s blog"

    send_email(to_email, subject, html)

def send_verify_new_user(to_email: str, blog_name: str, verify_token: str, plan_choice: str):

    html = (TEMPLATE_DIR / "verify_new_user.html").read_text()

    html = html.replace("{{ blog_name }}", blog_name)
    base = settings.app_base_url.rstrip("/")
    html = html.replace(
        "{{ verify_url }}",
        f"{base}/verify?token={verify_token}&plan_choice={plan_choice}",
    )

    subject = "Verify your email for Articurls"

    send_email(to_email, subject, html)

def send_password_reset(to_email: str, reset_token: str):

    html = (TEMPLATE_DIR / "reset_password.html").read_text()

    reset_url = f"{_api_base()}/reset-password?token={reset_token}"
    html = html.replace("{{ reset_url }}", reset_url)

    subject = "Reset your Articurls password"
    send_email(to_email, subject, html)