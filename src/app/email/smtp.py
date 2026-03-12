import smtplib
from email.mime.text import MIMEText
from app.config import settings

def send_smtp_email(to_email, subject, html):
    
    msg = MIMEText(html, "html")

    msg["Subject"] = subject
    msg["From"] = settings.from_email
    msg["To"] = to_email

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.send_message(msg)