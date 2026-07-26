from sqlalchemy.orm import Session
from .. import models
from ..schemas import user


def public_user_out(db: Session, db_user: models.User):
    return user.PublicUser.model_validate(db_user, from_attributes=True)
