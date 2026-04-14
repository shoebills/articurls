import hashlib

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, utils
from ..config import settings
from ..domains import normalize_custom_domain
from ..schemas import blog, user
from ..schemas import page as page_schema
from ..seo import render_robots, render_sitemap
from ..utils import is_pro_entitled, public_post_url

router = APIRouter(
    prefix="/public/custom-domain",
    tags=["Public custom domain"],
)


def require_internal_secret(x_internal_secret: str | None = Header(default=None)):
    if not settings.internal_api_secret:
        return
    if x_internal_secret != settings.internal_api_secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


def _resolve_verified_user_by_host(host: str, db: Session) -> models.User:
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
    return db_user


def _canonical_profile_url(user_name: str) -> str:
    return f"{settings.public_base_url.rstrip('/')}/{user_name}"


@router.get("/tenant", status_code=status.HTTP_200_OK)
def tenant_by_host(
    host: str = Query(..., description="Blog Host header value, e.g. blog.example.com"),
    db: Session = Depends(get_db),
    _=Depends(require_internal_secret),
):
    db_user = _resolve_verified_user_by_host(host, db)
    return {"user_id": db_user.user_id, "user_name": db_user.user_name}


@router.get("/posts/{slug}", response_model=blog.PublicBlog, responses={301: {"description": "Redirect to canonical articurls URL when Pro is not active"}},)
def post_by_host_and_slug(
    slug: str,
    request: Request,
    host: str = Query(..., description="Blog Host header value"),
    db: Session = Depends(get_db),
    _=Depends(require_internal_secret),
):
    db_user = _resolve_verified_user_by_host(host, db)

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
        return RedirectResponse(url=canonical, status_code=status.HTTP_301_MOVED_PERMANENTLY)

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


@router.get("/user", response_model=user.PublicUser, responses={301: {"description": "Redirect to canonical articurls URL when Pro is not active"}})
def user_by_host(
    host: str = Query(..., description="Blog Host header value"),
    db: Session = Depends(get_db),
    _=Depends(require_internal_secret),
):
    db_user = _resolve_verified_user_by_host(host, db)
    if not is_pro_entitled(db_user, db):
        return RedirectResponse(url=_canonical_profile_url(db_user.user_name), status_code=status.HTTP_301_MOVED_PERMANENTLY)
    return db_user


@router.get("/blogs", response_model=list[blog.PublicBlogs], responses={301: {"description": "Redirect to canonical articurls URL when Pro is not active"}})
def blogs_by_host(
    host: str = Query(..., description="Blog Host header value"),
    db: Session = Depends(get_db),
    _=Depends(require_internal_secret),
):
    db_user = _resolve_verified_user_by_host(host, db)
    if not is_pro_entitled(db_user, db):
        return RedirectResponse(url=_canonical_profile_url(db_user.user_name), status_code=status.HTTP_301_MOVED_PERMANENTLY)
    rows = (
        db.query(models.Blog)
        .filter(models.Blog.user_id == db_user.user_id, models.Blog.status == models.BlogStatus.PUBLISHED)
        .all()
    )
    for row in rows:
        row.excerpt = utils.make_excerpt(row.content)
    return rows


@router.get("/pages", response_model=list[page_schema.UserPageOut], responses={301: {"description": "Redirect to canonical articurls URL when Pro is not active"}})
def pages_by_host(
    host: str = Query(..., description="Blog Host header value"),
    db: Session = Depends(get_db),
    _=Depends(require_internal_secret),
):
    db_user = _resolve_verified_user_by_host(host, db)
    if not is_pro_entitled(db_user, db):
        return RedirectResponse(url=_canonical_profile_url(db_user.user_name), status_code=status.HTTP_301_MOVED_PERMANENTLY)
    return (
        db.query(models.UserPage)
        .filter(models.UserPage.user_id == db_user.user_id, models.UserPage.show_in_menu.is_(True))
        .order_by(models.UserPage.menu_order.asc(), models.UserPage.created_at.asc())
        .all()
    )


@router.get("/page/{slug}", response_model=page_schema.UserPageOut, responses={301: {"description": "Redirect to canonical articurls URL when Pro is not active"}})
def page_by_host_and_slug(
    slug: str,
    host: str = Query(..., description="Blog Host header value"),
    db: Session = Depends(get_db),
    _=Depends(require_internal_secret),
):
    db_user = _resolve_verified_user_by_host(host, db)
    if not is_pro_entitled(db_user, db):
        return RedirectResponse(
            url=f"{_canonical_profile_url(db_user.user_name)}/page/{slug}",
            status_code=status.HTTP_301_MOVED_PERMANENTLY,
        )
    db_page = (
        db.query(models.UserPage)
        .filter(models.UserPage.user_id == db_user.user_id, models.UserPage.slug == slug)
        .first()
    )
    if not db_page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return db_page


@router.get("/robots.txt", status_code=status.HTTP_200_OK)
def robots_by_host(
    host: str = Query(..., description="Blog Host header value"),
    db: Session = Depends(get_db),
    _=Depends(require_internal_secret),
):
    db_user = _resolve_verified_user_by_host(host, db)
    force_disallow = not is_pro_entitled(db_user, db)
    content = render_robots(db_user, db, force_disallow=force_disallow, serving_custom_host=True)
    return Response(content=content, media_type="text/plain; charset=utf-8")


@router.get("/sitemap.xml", status_code=status.HTTP_200_OK)
def sitemap_by_host(
    host: str = Query(..., description="Blog Host header value"),
    db: Session = Depends(get_db),
    _=Depends(require_internal_secret),
):
    db_user = _resolve_verified_user_by_host(host, db)
    if not is_pro_entitled(db_user, db):
        return Response(
            content='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
            media_type="application/xml; charset=utf-8",
        )
    content = render_sitemap(db_user, db)
    return Response(content=content, media_type="application/xml; charset=utf-8")