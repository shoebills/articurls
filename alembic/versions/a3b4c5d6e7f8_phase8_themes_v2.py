"""phase8 themes v2

Revision ID: a3b4c5d6e7f8
Revises: z2a3b4c5d6e7
Create Date: 2026-09-24
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a3b4c5d6e7f8"
down_revision: Union[str, Sequence[str], None] = "z2a3b4c5d6e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Migrate all sites to saas template and update server_default
    op.execute("UPDATE sites SET template_id = 'saas' WHERE template_id IN ('standard', 'editorial')")
    op.alter_column("sites", "template_id", server_default="saas")

    # 2. Drop legacy custom_color column
    op.drop_column("sites", "custom_color")

    # 3. Add color_palette JSON column
    op.add_column("sites", sa.Column("color_palette", sa.JSON(), nullable=True))

    # 4. Add typography columns (heading, content, UI)
    op.add_column("sites", sa.Column("font_heading", sa.String(length=32), server_default="sans", nullable=False))
    op.add_column("sites", sa.Column("font_content", sa.String(length=32), server_default="sans", nullable=False))
    op.add_column("sites", sa.Column("font_ui", sa.String(length=32), server_default="sans", nullable=False))

    # 5. Add button_variant column
    op.add_column("sites", sa.Column("button_variant", sa.String(length=16), server_default="solid", nullable=False))


def downgrade() -> None:
    op.drop_column("sites", "button_variant")
    op.drop_column("sites", "font_ui")
    op.drop_column("sites", "font_content")
    op.drop_column("sites", "font_heading")
    op.drop_column("sites", "color_palette")
    op.add_column("sites", sa.Column("custom_color", sa.String(length=16), nullable=True))
    op.alter_column("sites", "template_id", server_default="standard")
    op.execute("UPDATE sites SET template_id = 'standard' WHERE template_id = 'saas'")
