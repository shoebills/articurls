from fastapi import Depends, APIRouter, HTTPException, Query, Request, status, BackgroundTasks
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..schemas import subscribers
from ..security.oauth2 import get_current_user, get_current_site
from ..utils import normalize_email
from ..utils.rate_limit import check_rate_limit_ip_and_email


router = APIRouter(
    tags=["Subscriber"]
    )


_SUBSCRIBE_IP_LIMIT = 5
_SUBSCRIBE_IP_WINDOW = 600       # 10 minutes
_SUBSCRIBE_EMAIL_LIMIT = 3
_SUBSCRIBE_EMAIL_WINDOW = 3600   # 1 hour


def _dispatch_subscriber_webhook(url: str, token: str | None, payload: dict):
    try:
        import httpx
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        with httpx.Client(timeout=10.0) as client:
            client.post(url, json=payload, headers=headers)
    except Exception:
        pass


@router.post("/subscribe/{subdomain}", status_code=status.HTTP_200_OK)
def subscribe_blog(
    subdomain: str,
    request: Request,
    body: subscribers.Subscribe,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
):

    email = normalize_email(str(body.email))

    check_rate_limit_ip_and_email(
        request, "subscribe", email,
        _SUBSCRIBE_IP_LIMIT, _SUBSCRIBE_IP_WINDOW,
        _SUBSCRIBE_EMAIL_LIMIT, _SUBSCRIBE_EMAIL_WINDOW,
    )

    db_site = db.query(models.Site).filter(models.Site.subdomain == subdomain).first()

    if not db_site:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                          detail=f"Site with subdomain {subdomain} doesn't exist")
     
    db_subscriber = db.query(models.Subscriber).filter(models.Subscriber.email == email, models.Subscriber.site_id == db_site.site_id).first()

    # already a subscriber
    if db_subscriber:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already subscribed to this user"
        )
    
    new_subscriber = models.Subscriber(email=email, 
                                       site_id=db_site.site_id)

    db.add(new_subscriber)
    db.commit()
    db.refresh(new_subscriber)

    if db_site.newsletter_webhook_url:
        payload = {
            "event": "subscriber.created",
            "email": new_subscriber.email,
            "site_id": str(db_site.site_id),
            "subdomain": db_site.subdomain,
        }
        background_tasks.add_task(
            _dispatch_subscriber_webhook,
            db_site.newsletter_webhook_url,
            db_site.newsletter_webhook_token,
            payload,
        )

    return {"message": "You're subscribed!"}

@router.get("/list", status_code=status.HTTP_200_OK)
def list_subscribers(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site),
):

    base_query = db.query(models.Subscriber).filter(
        models.Subscriber.site_id == current_site.site_id
    )

    total = base_query.count()

    db_subscribers = (
        base_query.order_by(models.Subscriber.subscribed_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "items": [
            {
                "email": sub.email,
                "subscribed_at": sub.subscribed_at.isoformat() if sub.subscribed_at else None,
            }
            for sub in db_subscribers
        ],
        "total": total,
        "page": page,
        "total_pages": max(1, -(-total // limit)),
    }