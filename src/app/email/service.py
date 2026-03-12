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

def send_new_post_email(to_email: str, post_title: str, blog_url: str, blog_name: str):

    html = (TEMPLATE_DIR / "new_post_email.html").read_text()

    html = html.replace("{{ post_title }}", post_title)
    html = html.replace("{{ post_url }}", blog_url)
    html = html.replace("{{ blog_name }}", blog_name)

    subject = f"New post from {blog_name}: {post_title}"
    send_email(to_email, subject, html)