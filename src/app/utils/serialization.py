from sqlalchemy.orm import Session
from .. import models
from ..schemas import user


def public_user_out(db: Session, db_site: models.Site):
    # Get the default author for public profile
    author = db_site.authors[0] if db_site.authors else None
    
    data = {
        "user_name": db_site.subdomain,
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
        "featured_blog_ids": db_site.featured_blog_ids,
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
        
        # Fallback values for author fields
        "name": author.name if author else "",
        "bio": author.bio if author else None,
        "contact_email": author.contact_email if author else None,
        "instagram_link": author.instagram_link if author else None,
        "x_link": author.x_link if author else None,
        "pinterest_link": author.pinterest_link if author else None,
        "facebook_link": author.facebook_link if author else None,
        "linkedin_link": author.linkedin_link if author else None,
        "github_link": author.github_link if author else None,
        "youtube_link": author.youtube_link if author else None,
        "website_link": author.website_link if author else None,
        "profile_image_url": author.profile_image_url if author else None,
    }
    return user.PublicUser(**data)

def user_settings_out(db: Session, db_user: models.User, db_site: models.Site):
    author = db_site.authors[0] if db_site.authors else None
    
    data = {
        "user_id": db_user.user_id,
        "name": author.name if author else db_user.name,
        "user_name": db_site.subdomain,
        "email": db_user.email,
        "google_id": db_user.google_id,
        "meta_title": db_site.meta_title,
        "meta_description": db_site.meta_description,
        "bio": author.bio if author else None,
        "contact_email": author.contact_email if author else None,
        "instagram_link": author.instagram_link if author else None,
        "x_link": author.x_link if author else None,
        "pinterest_link": author.pinterest_link if author else None,
        "facebook_link": author.facebook_link if author else None,
        "linkedin_link": author.linkedin_link if author else None,
        "github_link": author.github_link if author else None,
        "youtube_link": author.youtube_link if author else None,
        "website_link": author.website_link if author else None,
        "profile_image_url": author.profile_image_url if author else None,
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
        "last_username_change_at": db_site.last_username_change_at,
        "is_admin": False,  # handled downstream if needed
        "favicon_url": db_site.favicon_url,
        "featured_blogs_enabled": db_site.featured_blogs_enabled,
        "featured_blog_ids": db_site.featured_blog_ids,
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
