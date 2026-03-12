import requests
from ..config import settings


def send_resend_email(to_email, subject, html):

    url = "https://api.resend.com/emails"

    payload = {
        "from": settings.from_email,
        "to": [to_email],
        "subject": subject,
        "html": html
    }

    headers = {
        "Authorization": f"Bearer {settings.resend_api_key}",
        "Content-Type": "application/json"
    }

    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()