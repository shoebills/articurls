"""allow multiple subpaths per custom domain

Revision ID: b9c8d7e6f5a4
Revises: a0b1c2d3e4f9
Create Date: 2026-10-22
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b9c8d7e6f5a4"
down_revision: Union[str, Sequence[str], None] = "a0b1c2d3e4f9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index(op.f("ix_sites_custom_domain"), table_name="sites")
    op.create_index(op.f("ix_sites_custom_domain"), "sites", ["custom_domain"], unique=False)
    op.create_index(
        "uq_sites_custom_domain_apex",
        "sites",
        ["custom_domain"],
        unique=True,
        postgresql_where=sa.text("custom_domain IS NOT NULL AND custom_subpath IS NULL"),
    )
    op.create_index(
        "uq_sites_custom_domain_subpath",
        "sites",
        ["custom_domain", "custom_subpath"],
        unique=True,
        postgresql_where=sa.text("custom_domain IS NOT NULL AND custom_subpath IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_sites_custom_domain_subpath", table_name="sites")
    op.drop_index("uq_sites_custom_domain_apex", table_name="sites")
    op.drop_index(op.f("ix_sites_custom_domain"), table_name="sites")
    op.create_index(op.f("ix_sites_custom_domain"), "sites", ["custom_domain"], unique=True)
