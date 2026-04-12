import hashlib

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models
from ..domains import normalize_custom_domain
from ..schemas import blog
from ..utils import is_pro_entitled, public_post_url

router = APIRouter(
    prefix="/public/custom-domain",
    tags=["Public custom domain"],
)


@router.get("/tenant", status_code=status.HTTP_200_OK)
def tenant_by_host(host: str = Query(..., description="Blog Host header value, e.g. blog.example.com"), db: Session = Depends(get_db)):
    
    h = normalize_custom_domain(host)
    if not h:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid host",
        )
    db_user = (
        db.query(models.User)
        .filter(
            models.User.custom_domain == h,
            models.User.is_domain_verified.is_(True),
        )
        .first()
    )
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unknown or unverified host",
        )
    return {"user_id": db_user.user_id, "user_name": db_user.user_name}


@router.get("/posts/{slug}", response_model=blog.PublicBlog, responses={307: {"description": "Redirect to canonical articurls URL when Pro is not active"}},)
def post_by_host_and_slug(slug: str, request: Request, host: str = Query(..., description="Blog Host header value"), db: Session = Depends(get_db)):

    h = normalize_custom_domain(host)
    if not h:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid host",
        )
    db_user = (
        db.query(models.User)
        .filter(
            models.User.custom_domain == h,
            models.User.is_domain_verified.is_(True),
        )
        .first()
    )
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found",
        )

    db_blog = (
        db.query(models.Blog)
        .filter(
            models.Blog.slug == slug,
            models.Blog.user_id == db_user.user_id,
        )
        .first()
    )
    if not db_blog or db_blog.status != models.BlogStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found",
        )

    if not is_pro_entitled(db_user, db):
        canonical = public_post_url(db_user, db_blog, db)
        return RedirectResponse(url=canonical, status_code=status.HTTP_307_TEMPORARY_REDIRECT)

    ip = (request.client.host if request.client else None) or ""
    user_agent = request.headers.get("user-agent", "")
    visitor_hash = hashlib.sha256(f"{ip}{user_agent}".encode()).hexdigest()
    db.add(
        models.Views(
            user_id=db_user.user_id,
            blog_id=db_blog.blog_id,
            visitor_hash=visitor_hash,
        )
    )
    db.commit()
    return db_blog