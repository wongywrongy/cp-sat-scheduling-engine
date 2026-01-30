"""add player rank and tri-meet support

Revision ID: 005_add_rank_tri_meet
Revises: 004_simplify_sparring
Create Date: 2026-01-28 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '005_add_rank_tri_meet'
down_revision = '004_simplify_sparring'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add rank field to players
    op.add_column('players', sa.Column('rank', sa.String(), nullable=True))
    
    # Add tri-meet support to matches
    op.add_column('matches', sa.Column('side_c', sa.JSON(), nullable=True))
    op.add_column('matches', sa.Column('match_type', sa.String(), nullable=False, server_default='dual'))
    op.add_column('matches', sa.Column('event_rank', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('matches', 'event_rank')
    op.drop_column('matches', 'match_type')
    op.drop_column('matches', 'side_c')
    op.drop_column('players', 'rank')
