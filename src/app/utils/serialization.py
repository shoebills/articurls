from sqlalchemy.orm import Session
from .. import models
from ..schemas import user
from .entitlements import is_pro_entitled


def public_user_out(db: Session, db_user: models.User):
    is_pro = is_pro_entitled(db_user, db)
    public_user = user.PublicUser.model_validate(db_user, from_attributes=True)
    public_user.show_articurls_watermark = not is_pro
    return public_user