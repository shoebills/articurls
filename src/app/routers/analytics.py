from fastapi import Depends, APIRouter, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from .. import models
from ..security.oauth2 import get_current_user
from datetime import datetime, timedelta, timezone
from typing import Optional


router = APIRouter(
    tags=["Analytics"],
    prefix="/analytics"
)

PERIOD_MAP = {
    "24h": timedelta(hours=24),
    "7d": timedelta(days=7),
    "28d": timedelta(days=28),
    "3m": timedelta(days=90),
    "6m": timedelta(days=180),
    "1y": timedelta(days=365),
}


def get_since(period: Optional[str]):
    if period is None:
        return None
    delta = PERIOD_MAP.get(period)
    if delta is None:
        return None
    return datetime.now(timezone.utc) - delta

@router.get("/blog/{id}/views", status_code=status.HTTP_200_OK)
def get_blog_views(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    db_blog = db.query(models.Blog).filter(models.Blog.blog_id == id, models.Blog.user_id == current_user.user_id).first()

    if not db_blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Blog with id: {id} not found")
    
    total_views = db.query(func.count(models.Views.view_id)).filter(models.Views.blog_id == id).scalar()

    unique_visitors = db.query(func.count(func.distinct(models.Views.visitor_hash))).filter(models.Views.blog_id == id).scalar()

    return {
        "blog_id": id,
        "total_views": total_views,
        "unique_visitors": unique_visitors
    }

@router.get("/views", status_code=status.HTTP_200_OK)
def views_analytics(db: Session = Depends(get_db), period: Optional[str] = "all", current_user = Depends(get_current_user)):

    total_posts = db.query(func.count(models.Blog.blog_id)).filter(models.Blog.user_id == current_user.user_id).scalar()

    since = get_since(period)

    views_query = db.query(models.Views).filter(models.Views.user_id == current_user.user_id)

    if since:
        views_query = views_query.filter(models.Views.visited_at >= since)

    total_views = views_query.with_entities(func.count(models.Views.view_id)).scalar()
    unique_visitors = views_query.with_entities(func.count(func.distinct(models.Views.visitor_hash))).scalar()

    return {
        "period": period,
        "total_posts": total_posts,
        "total_views": total_views,
        "unique_visitors": unique_visitors
    }

@router.get("/subscribers", status_code=status.HTTP_200_OK)
def subscribers_analytics(period: Optional[str] = "all", db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    current_subscribers = db.query(func.count(models.Subscriber.subscriber_id)).filter(models.Subscriber.user_id == current_user.user_id, models.Subscriber.unsubscribed_at.is_(None)).scalar()

    since = get_since(period)

    sub_query = db.query(models.Subscriber).filter(models.Subscriber.user_id == current_user.user_id)

    if since:
        subscribed = sub_query.with_entities(func.count(models.Subscriber.subscriber_id)).filter(models.Subscriber.subscribed_at >= since).scalar()
        unsubscribed = sub_query.with_entities(func.count(models.Subscriber.subscriber_id)).filter(models.Subscriber.unsubscribed_at >= since).scalar()
    else:
        subscribed = sub_query.with_entities(func.count(models.Subscriber.subscriber_id)).scalar()
        unsubscribed = sub_query.with_entities(func.count(models.Subscriber.subscriber_id)).filter(models.Subscriber.unsubscribed_at.isnot(None)).scalar()

    return {
        "period": period,
        "current_subscribers": current_subscribers,
        "subscribed": subscribed,
        "unsubscribed": unsubscribed
    }