from fastapi import APIRouter, HTTPException, Request, status

from ..config import settings
from ..workers.tasks import backfill_umami_websites

router = APIRouter(tags=["Umami"])


@router.post("/internal/umami/backfill", status_code=status.HTTP_202_ACCEPTED)
def umami_backfill(request: Request):
    """Enqueue Umami website provisioning for users missing umami_website_id."""
    secret = settings.internal_api_secret
    if not secret or request.headers.get("x-internal-secret") != secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    backfill_umami_websites.delay()
    return {"message": "Umami backfill enqueued"}
