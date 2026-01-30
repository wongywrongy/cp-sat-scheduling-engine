"""initial migration

Revision ID: 001_initial
Revises: 
Create Date: 2026-01-28 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create tournaments table
    op.create_table(
        'tournaments',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('config', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tournaments_id'), 'tournaments', ['id'], unique=False)

    # Create roster_groups table
    op.create_table(
        'roster_groups',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tournament_id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('type', sa.Enum('GROUP', 'ROSTER', name='rostergrouptype'), nullable=False),
        sa.Column('parent_id', sa.String(), nullable=True),
        sa.Column('group_metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['parent_id'], ['roster_groups.id'], ),
        sa.ForeignKeyConstraint(['tournament_id'], ['tournaments.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_roster_groups_id'), 'roster_groups', ['id'], unique=False)
    op.create_index(op.f('ix_roster_groups_parent_id'), 'roster_groups', ['parent_id'], unique=False)
    op.create_index(op.f('ix_roster_groups_tournament_id'), 'roster_groups', ['tournament_id'], unique=False)

    # Create players table
    op.create_table(
        'players',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tournament_id', sa.String(), nullable=False),
        sa.Column('group_id', sa.String(), nullable=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('availability', sa.JSON(), nullable=False),
        sa.Column('min_rest_minutes', sa.Integer(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['group_id'], ['roster_groups.id'], ),
        sa.ForeignKeyConstraint(['tournament_id'], ['tournaments.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_players_id'), 'players', ['id'], unique=False)
    op.create_index(op.f('ix_players_group_id'), 'players', ['group_id'], unique=False)
    op.create_index(op.f('ix_players_tournament_id'), 'players', ['tournament_id'], unique=False)

    # Create matches table
    op.create_table(
        'matches',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tournament_id', sa.String(), nullable=False),
        sa.Column('event_code', sa.String(), nullable=False),
        sa.Column('match_type', sa.Enum('INDIVIDUAL', 'ROSTER_VS_ROSTER', 'ROSTER_MATCH', 'AUTO_GENERATED', name='matchtype'), nullable=False),
        sa.Column('side_a', sa.JSON(), nullable=False),
        sa.Column('side_b', sa.JSON(), nullable=False),
        sa.Column('roster_a_id', sa.String(), nullable=True),
        sa.Column('roster_b_id', sa.String(), nullable=True),
        sa.Column('selected_players_a', sa.JSON(), nullable=True),
        sa.Column('selected_players_b', sa.JSON(), nullable=True),
        sa.Column('generation_rule', sa.JSON(), nullable=True),
        sa.Column('duration_slots', sa.Integer(), nullable=False),
        sa.Column('preferred_court', sa.Integer(), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['roster_a_id'], ['roster_groups.id'], ),
        sa.ForeignKeyConstraint(['roster_b_id'], ['roster_groups.id'], ),
        sa.ForeignKeyConstraint(['tournament_id'], ['tournaments.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_matches_id'), 'matches', ['id'], unique=False)
    op.create_index(op.f('ix_matches_tournament_id'), 'matches', ['tournament_id'], unique=False)

    # Create schedules table
    op.create_table(
        'schedules',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tournament_id', sa.String(), nullable=False),
        sa.Column('assignments', sa.JSON(), nullable=False),
        sa.Column('status', sa.Enum('OPTIMAL', 'FEASIBLE', 'INFEASIBLE', 'UNKNOWN', name='solverstatus'), nullable=False),
        sa.Column('objective_score', sa.Float(), nullable=True),
        sa.Column('unscheduled_matches', sa.JSON(), nullable=False),
        sa.Column('soft_violations', sa.JSON(), nullable=False),
        sa.Column('infeasible_reasons', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['tournament_id'], ['tournaments.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_schedules_id'), 'schedules', ['id'], unique=False)
    op.create_index(op.f('ix_schedules_tournament_id'), 'schedules', ['tournament_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_schedules_tournament_id'), table_name='schedules')
    op.drop_index(op.f('ix_schedules_id'), table_name='schedules')
    op.drop_table('schedules')
    op.drop_index(op.f('ix_matches_tournament_id'), table_name='matches')
    op.drop_index(op.f('ix_matches_id'), table_name='matches')
    op.drop_table('matches')
    op.drop_index(op.f('ix_players_tournament_id'), table_name='players')
    op.drop_index(op.f('ix_players_group_id'), table_name='players')
    op.drop_index(op.f('ix_players_id'), table_name='players')
    op.drop_table('players')
    op.drop_index(op.f('ix_roster_groups_tournament_id'), table_name='roster_groups')
    op.drop_index(op.f('ix_roster_groups_parent_id'), table_name='roster_groups')
    op.drop_index(op.f('ix_roster_groups_id'), table_name='roster_groups')
    op.drop_table('roster_groups')
    op.drop_index(op.f('ix_tournaments_id'), table_name='tournaments')
    op.drop_table('tournaments')
    
    # Drop enums
    op.execute("DROP TYPE IF EXISTS solverstatus")
    op.execute("DROP TYPE IF EXISTS matchtype")
    op.execute("DROP TYPE IF EXISTS rostergrouptype")
