"""drop cf subfolder fields from sites

Removes cf_zone_id, cf_route_id, cf_connected. These backed the
one-click Cloudflare token deploy (POST /settings/subfolder/deploy),
which was dead code — the API token was never stored and the frontend
never called the endpoint. Subdirectory publishing continues via the
manual reverse-proxy snippets.

Revision ID: h1i2j3k4l5m6
Revises: g0h1i2j3k4l5
Create Date: 2026-10-03
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "h1i2j3k4l5m6"
down_revision: Union[str, Sequence[str], None] = "g0h1i2j3k4l5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("sites", "cf_connected")
    op.drop_column("sites", "cf_route_id")
    op.drop_column("sites", "cf_zone_id")


def downgrade() -> None:
    op.add_column("sites", sa.Column("cf_zone_id", sa.String(), nullable=True))
    op.add_column("sites", sa.Column("cf_route_id", sa.String(), nullable=True))
    op.add_column("sites", sa.Column("cf_connected", sa.Boolean(), server_default="false", nullable=False))
