from pathlib import Path

from fastapi import APIRouter, Depends, Request, status

from ..config import settings
from ..email.service import send_email
from ..schemas import support as support_schema
from ..security import oauth2
from ..utils import public_blog_home_url
from ..utils.rate_limit import check_rate_limit_ip

router = APIRouter(
    tags=["Support"],
    prefix="/support"
)

_TEMPLATE = Path(__file__).resolve().parent.parent / "email" / "support_message.html"

_SUPPORT_IP_LIMIT = 5
_SUPPORT_IP_WINDOW = 3600  # 1 hour


@router.post("/contact", status_code=status.HTTP_200_OK)
def send_support_message(
    request: Request,
    body: support_schema.SupportMessage,
    current_user=Depends(oauth2.get_current_user),
):

    check_rate_limit_ip(request, "support_contact", _SUPPORT_IP_LIMIT, _SUPPORT_IP_WINDOW)

    html = _TEMPLATE.read_text()
    html = html.replace("{{ category }}", body.category)
    html = html.replace("{{ subject }}", body.subject)
    html = html.replace("{{ name }}", current_user.name or current_user.email)
    html = html.replace("{{ email }}", current_user.email)
    html = html.replace("{{ blog_url }}", public_blog_home_url(current_user))
    html = html.replace("{{ message }}", body.message)

    subject = f"[Support] {body.category}: {body.subject}"
    send_email(settings.support_email, subject, html)

    return {"ok": True}
