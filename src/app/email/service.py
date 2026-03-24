from pathlib import Path
from ..config import settings
from .smtp import send_smtp_email
from .resend import send_resend_email


TEMPLATE_DIR = Path(__file__).parent

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
    html = html.replace("{{ unsubscribe_url }}", f"https://articurls.com/unsubscribe?token={unsubscribe_token}")

    subject = f"New post from {blog_name}: {post_title}"
    send_email(to_email, subject, html)

def send_sub_confirmation_email(to_email: str, blog_name: str, confirm_token: str):

    html = (TEMPLATE_DIR / "confirm_subscription.html").read_text()

    html = html.replace("{{ blog_name }}", blog_name)
    html = html.replace("{{ confirm_url }}", f"https://articurls.com/confirm-subscription?token={confirm_token}")

    subject = f"Confirm your subscription to {blog_name}'s blog"

    send_email(to_email, subject, html)

def send_verify_new_user(to_email: str, blog_name: str, verify_token: str, plan_choice: str):

    html = (TEMPLATE_DIR / "verify_new_user.html").read_text()

    html = html.replace("{{ blog_name }}", blog_name)
    html = html.replace("{{ verify_url }}", f"https://app.articurls.com/verify-new-user?token={verify_token}&plan_choice={plan_choice}")

    subject = "Verify your email for Articurls"

    send_email(to_email, subject, html)