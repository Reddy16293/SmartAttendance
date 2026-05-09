"""Add image storage columns to attendance_sessions table

Revision ID: add_image_storage
Revises: 700f2361a1c6_add_user_provider_and_roll_number
Create Date: 2026-02-27 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_image_storage'
down_revision = '700f2361a1c6_add_user_provider_and_roll_number'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns for image storage
    op.add_column('attendance_sessions', 
        sa.Column('original_image', sa.String(500), nullable=True)
    )
    op.add_column('attendance_sessions',
        sa.Column('annotated_image', sa.String(500), nullable=True)
    )


def downgrade() -> None:
    # Remove the columns if downgrading
    op.drop_column('attendance_sessions', 'annotated_image')
    op.drop_column('attendance_sessions', 'original_image')
