from sqlalchemy.orm import Session
from .. import models
from ..schemas import user
from .entitlements import is_pro_entitled


def public_user_out(db: Session, db_user: models.User):
    is_pro = is_pro_entitled(db_user, db)
    public_user = user.PublicUser.model_validate(db_user, from_attributes=True)
    public_user.show_articurls_watermark = not (is_pro and bool(db_user.remove_branding))
    # Subscriber collection is a Pro-only capability.
    public_user.subscriber_collection_enabled = bool(is_pro and db_user.subscriber_collection_enabled)
    # Only Pro users can use a custom favicon; free users always get the platform default.
    if not is_pro:
        public_user.favicon_url = None
    return public_user