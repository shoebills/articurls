from typing import Any
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from fastapi import BackgroundTasks

from .. import models
from ..cache.service import schedule_category_purge, schedule_tenant_purge


def sync_site_navigation_links(site: models.Site, old_path: str, new_path: str) -> None:
    """Updates matching URLs in custom navbar items and footer columns."""
    if site.nav_items and isinstance(site.nav_items, list):
        modified = False
        new_nav_items = []
        for item in site.nav_items:
            if isinstance(item, dict):
                item_copy = dict(item)
                if item_copy.get("url") == old_path:
                    item_copy["url"] = new_path
                    modified = True
                new_nav_items.append(item_copy)
            else:
                new_nav_items.append(item)
        if modified:
            site.nav_items = new_nav_items
            flag_modified(site, "nav_items")

    if site.footer_columns and isinstance(site.footer_columns, list):
        footer_modified = False
        new_footer_cols = []
        for col in site.footer_columns:
            if isinstance(col, dict) and "links" in col and isinstance(col["links"], list):
                col_copy = dict(col)
                new_links = []
                for link in col["links"]:
                    if isinstance(link, dict):
                        link_copy = dict(link)
                        if link_copy.get("url") == old_path:
                            link_copy["url"] = new_path
                            footer_modified = True
                        new_links.append(link_copy)
                    else:
                        new_links.append(link)
                col_copy["links"] = new_links
                new_footer_cols.append(col_copy)
            else:
                new_footer_cols.append(col)
        if footer_modified:
            site.footer_columns = new_footer_cols
            flag_modified(site, "footer_columns")


def sync_slug_change_redirect(
    db: Session,
    site: models.Site,
    entity_type: str,  # "category" | "author"
    old_slug: str,
    new_slug: str,
    background_tasks: BackgroundTasks,
) -> None:
    """Automatically creates a permanent 301 redirect from old entity path to new entity path.

    - Deletes any reverse redirect to avoid loops (A -> B -> A).
    - Inserts or updates the redirect for old_path -> new_path with origin="automatic".
    - Flattens previous redirect chains targeting old_path so all historical URLs point directly
      to new_path in 1 hop.
    - Synchronizes matching URLs in custom navigation and footer links.
    - Purges cache for old slug, new slug, and tenant.
    """
    if not old_slug or not new_slug or old_slug == new_slug:
        return

    old_path = f"/{entity_type}/{old_slug}"
    new_path = f"/{entity_type}/{new_slug}"

    # Step 1: Prevent bounce loops (if new_path previously redirected to old_path, remove it)
    db.query(models.Redirect).filter(
        models.Redirect.site_id == site.site_id,
        models.Redirect.source_path == new_path,
    ).delete(synchronize_session=False)

    # Step 2: Insert or update redirect from old_path to new_path
    existing_redirect = (
        db.query(models.Redirect)
        .filter(
            models.Redirect.site_id == site.site_id,
            models.Redirect.source_path == old_path,
        )
        .first()
    )
    if existing_redirect:
        existing_redirect.target_url = new_path
        existing_redirect.type = models.RedirectType.PERMANENT
        existing_redirect.origin = models.RedirectOrigin.AUTOMATIC
    else:
        new_redirect = models.Redirect(
            site_id=site.site_id,
            source_path=old_path,
            target_url=new_path,
            type=models.RedirectType.PERMANENT,
            origin=models.RedirectOrigin.AUTOMATIC,
        )
        db.add(new_redirect)

    # Step 3: Chain Flattening (1-Hop Rule)
    # If any existing redirects pointed to old_path (e.g. v1 -> v2), point them directly to new_path (v1 -> v3).
    db.query(models.Redirect).filter(
        models.Redirect.site_id == site.site_id,
        models.Redirect.target_url == old_path,
    ).update(
        {models.Redirect.target_url: new_path},
        synchronize_session=False,
    )

    # Step 4: Drop any accidental self-loops (source_path == target_url)
    db.query(models.Redirect).filter(
        models.Redirect.site_id == site.site_id,
        models.Redirect.source_path == models.Redirect.target_url,
    ).delete(synchronize_session=False)

    # Step 5: Update custom navigation and footer links
    sync_site_navigation_links(site, old_path, new_path)

    # Step 6: Cache invalidation
    if entity_type == "category":
        schedule_category_purge(background_tasks, site, old_slug)
        schedule_category_purge(background_tasks, site, new_slug)
    schedule_tenant_purge(background_tasks, site)


def cleanup_entity_redirects(
    db: Session,
    site_id: Any,
    entity_type: str,
    slug: str,
) -> None:
    """Removes automatic redirects that target a deleted entity to avoid dead-end 404 targets."""
    target_path = f"/{entity_type}/{slug}"
    db.query(models.Redirect).filter(
        models.Redirect.site_id == site_id,
        models.Redirect.target_url == target_path,
        models.Redirect.origin == models.RedirectOrigin.AUTOMATIC,
    ).delete(synchronize_session=False)
