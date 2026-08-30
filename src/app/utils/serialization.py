from sqlalchemy.orm import Session
from .. import models
from ..schemas import user, site


def public_site_out(db: Session, db_site: models.Site):
    data = {
        "subdomain": db_site.subdomain,
        "name": db_site.user.name if db_site.user else "",
        "meta_title": db_site.meta_title or "",
        "meta_description": db_site.meta_description or "",
        "og_image_url": db_site.og_image_url,
        "template_id": db_site.template_id,
        "site_mode": db_site.site_mode,
        "color_theme": db_site.color_theme,
        "custom_color": db_site.custom_color,
        "font_family": db_site.font_family,
        "button_style": db_site.button_style,
        "navbar_alignment": db_site.navbar_alignment,
        "navbar_style": db_site.navbar_style,
        "navbar_enabled": db_site.navbar_enabled,
        "nav_blog_name": db_site.nav_blog_name,
        "nav_blog_name_size": db_site.nav_blog_name_size,
        "nav_menu_enabled": db_site.nav_menu_enabled,
        "nav_items": db_site.nav_items,
        "show_about_section": db_site.show_about_section,
        "site_footer_enabled": db_site.site_footer_enabled,
        "footer_columns": db_site.footer_columns,
        "footer_copyright": db_site.footer_copyright,
        "footer_socials_enabled": db_site.footer_socials_enabled,
        "footer_newsletter_enabled": db_site.footer_newsletter_enabled,
        "footer_system_links_enabled": db_site.footer_system_links_enabled,
        "favicon_url": db_site.favicon_url,
        "featured_blogs_enabled": db_site.featured_blogs_enabled,
        "featured_blog_ids": [str(bid) for bid in (db_site.featured_blog_ids or [])],
        "content_width": db_site.content_width,
        "list_image_position": db_site.list_image_position,
        "show_preview_in_lists": db_site.show_preview_in_lists,
        "about_title": db_site.about_title,
        "subscriber_collection_enabled": db_site.subscriber_collection_enabled,
        "custom_domain": db_site.custom_domain,
        "domain_status": db_site.domain_status,
        "rss_enabled": db_site.rss_enabled,
        "umami_website_id": db_site.umami_website_id,
        "custom_head_code": db_site.custom_head_code,
        "custom_body_code": db_site.custom_body_code,
        "custom_css": db_site.custom_css,
    }
    return site.PublicSite(**data)

def user_settings_out(db: Session, db_user: models.User, db_site: models.Site):
    data = {
        "user_id": db_user.user_id,
        "name": db_user.name,
        "subdomain": db_site.subdomain,
        "email": db_user.email,
        "google_id": db_user.google_id,
        "profile_image_url": db_user.profile_image_url,
        "meta_title": db_site.meta_title,
        "meta_description": db_site.meta_description,
        "template_id": db_site.template_id,
        "site_mode": db_site.site_mode,
        "color_theme": db_site.color_theme,
        "custom_color": db_site.custom_color,
        "font_family": db_site.font_family,
        "button_style": db_site.button_style,
        "navbar_alignment": db_site.navbar_alignment,
        "navbar_style": db_site.navbar_style,
        "navbar_enabled": db_site.navbar_enabled,
        "nav_blog_name": db_site.nav_blog_name,
        "nav_blog_name_size": db_site.nav_blog_name_size,
        "nav_menu_enabled": db_site.nav_menu_enabled,
        "nav_items": db_site.nav_items,
        "show_about_section": db_site.show_about_section,
        "site_footer_enabled": db_site.site_footer_enabled,
        "footer_columns": db_site.footer_columns,
        "footer_copyright": db_site.footer_copyright,
        "footer_socials_enabled": db_site.footer_socials_enabled,
        "footer_newsletter_enabled": db_site.footer_newsletter_enabled,
        "footer_system_links_enabled": db_site.footer_system_links_enabled,
        "is_admin": False,  # handled downstream if needed
        "favicon_url": db_site.favicon_url,
        "featured_blogs_enabled": db_site.featured_blogs_enabled,
        "featured_blog_ids": [str(bid) for bid in (db_site.featured_blog_ids or [])],
        "subscriber_collection_enabled": db_site.subscriber_collection_enabled,
        "custom_domain": db_site.custom_domain,
        "content_width": db_site.content_width,
        "list_image_position": db_site.list_image_position,
        "show_preview_in_lists": db_site.show_preview_in_lists,
        "domain_status": db_site.domain_status,
        "rss_enabled": db_site.rss_enabled,
        "custom_head_code": db_site.custom_head_code,
        "custom_body_code": db_site.custom_body_code,
        "custom_css": db_site.custom_css,
    }
    
    # check if user is admin
    from .admin import is_admin_email
    data["is_admin"] = is_admin_email(db_user.email)
    
    return user.UserSettings(**data)
