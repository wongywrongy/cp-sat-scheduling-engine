"""add draw tables

Revision ID: 002_add_draw
Revises: 001_initial
Create Date: 2026-01-28 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_add_draw'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create events table
    op.create_table(
        'events',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tournament_id', sa.String(), nullable=False),
        sa.Column('code', sa.Enum('MS', 'WS', 'MD', 'WD', 'XD', name='eventcode'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('draw_format', sa.Enum('SINGLE_ELIMINATION', 'ROUND_ROBIN', 'POOL_KNOCKOUT', 'SWISS', 'DOUBLE_ELIMINATION', name='drawformat'), nullable=True),
        sa.Column('parameters', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['tournament_id'], ['tournaments.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_events_tournament_id'), 'events', ['tournament_id'], unique=False)

    # Create entries table
    op.create_table(
        'entries',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('event_id', sa.String(), nullable=False),
        sa.Column('participant_ids', sa.JSON(), nullable=False),
        sa.Column('seed', sa.Integer(), nullable=True),
        sa.Column('entry_metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['event_id'], ['events.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_entries_event_id'), 'entries', ['event_id'], unique=False)

    # Create draws table
    op.create_table(
        'draws',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('event_id', sa.String(), nullable=False),
        sa.Column('format', sa.Enum('SINGLE_ELIMINATION', 'ROUND_ROBIN', 'POOL_KNOCKOUT', 'SWISS', 'DOUBLE_ELIMINATION', name='drawformat'), nullable=False),
        sa.Column('status', sa.Enum('DRAFT', 'GENERATED', 'LOCKED', name='drawstatus'), nullable=False, server_default='DRAFT'),
        sa.Column('draw_metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['event_id'], ['events.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_draws_event_id'), 'draws', ['event_id'], unique=False)

    # Add draw-related columns to matches table
    op.add_column('matches', sa.Column('dependencies', sa.JSON(), nullable=True))
    op.add_column('matches', sa.Column('draw_metadata', sa.JSON(), nullable=True))
    op.add_column('matches', sa.Column('draw_status', sa.String(), nullable=True))


def downgrade() -> None:
    # Remove draw-related columns from matches table
    op.drop_column('matches', 'draw_status')
    op.drop_column('matches', 'draw_metadata')
    op.drop_column('matches', 'dependencies')

    # Drop draws table
    op.drop_index(op.f('ix_draws_event_id'), table_name='draws')
    op.drop_table('draws')

    # Drop entries table
    op.drop_index(op.f('ix_entries_event_id'), table_name='entries')
    op.drop_table('entries')

    # Drop events table
    op.drop_index(op.f('ix_events_tournament_id'), table_name='events')
    op.drop_table('events')

    # Drop enums
    op.execute("DROP TYPE IF EXISTS drawstatus")
    op.execute("DROP TYPE IF EXISTS drawformat")
    op.execute("DROP TYPE IF EXISTS eventcode")
