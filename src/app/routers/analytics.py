from fastapi import Depends, APIRouter, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from .. import models
from ..security.oauth2 import get_current_user


router = APIRouter(
    tags=["Analytics"],
    prefix="/analytics"
)


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
def views_analytics(db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    total_posts = db.query(func.count(models.Blog.blog_id)).filter(models.Blog.user_id == current_user.user_id).scalar()

    total_views = db.query(func.count(models.Views.blog_id)).filter(models.Views.user_id == current_user.user_id).scalar()

    unique_visitors = db.query(func.count(func.distinct(models.Views.visitor_hash))).filter(models.Views.user_id == current_user.user_id).scalar()

    return {
        "total_posts": total_posts,
        "total_views": total_views,
        "unique_visitors": unique_visitors
    }

@router.get("/subscribers", status_code=status.HTTP_200_OK)
def subscribers_analytics(db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    current_subscribers = db.query(func.count(models.Subscriber.subscriber_id)).filter(models.Subscriber.user_id == current_user.user_id, models.Subscriber.unsubscribed_at.is_(None)).scalar()

    subscribed = db.query(func.count(models.Subscriber.subscriber_id)).filter(models.Subscriber.user_id == current_user.user_id).scalar()

    unsubscribed = db.query(func.count(models.Subscriber.subscriber_id)).filter(models.Subscriber.user_id == current_user.user_id, models.Subscriber.unsubscribed_at.isnot(None)).scalar()

    return {
        "current_subscribers": current_subscribers,
        "subscribed": subscribed,
        "unsubscribed": unsubscribed
    }