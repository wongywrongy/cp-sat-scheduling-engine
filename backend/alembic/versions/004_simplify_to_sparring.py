"""simplify to school sparring - remove tournament complexity

Revision ID: 004_simplify_sparring
Revises: 003_normalize_divisions
Create Date: 2026-01-28 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '004_simplify_sparring'
down_revision = '003_normalize_divisions'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop all draw/division/event related tables
    op.drop_table('match_state_events')
    op.drop_table('schedule_assignments')
    op.drop_table('draws')
    op.drop_table('entry_members')
    op.drop_table('entries')
    op.drop_table('events')
    op.drop_table('divisions')
    
    # Simplify roster_groups table - remove hierarchy (parent_id, type)
    # Keep it simple for school grouping
    conn = op.get_bind()
    if conn.dialect.name == 'postgresql':
        # Check if columns exist before dropping
        try:
            result = conn.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'roster_groups' AND column_name IN ('parent_id', 'type')
            """)
            existing_cols = [row[0] for row in result]
            
            if 'parent_id' in existing_cols:
                try:
                    op.drop_constraint('roster_groups_parent_id_fkey', 'roster_groups', type_='foreignkey')
                except Exception:
                    pass
                try:
                    op.drop_index(op.f('ix_roster_groups_parent_id'), table_name='roster_groups')
                except Exception:
                    pass
                op.drop_column('roster_groups', 'parent_id')
            if 'type' in existing_cols:
                op.drop_column('roster_groups', 'type')
        except Exception:
            # If table doesn't exist or columns already dropped, continue
            pass
    else:
        # For SQLite, try to drop columns if they exist
        try:
            op.drop_column('roster_groups', 'parent_id')
        except Exception:
            pass
        try:
            op.drop_column('roster_groups', 'type')
        except Exception:
            pass
    
    # Remove complex columns from matches table
    op.drop_constraint('fk_matches_side_b_entry', 'matches', type_='foreignkey')
    op.drop_constraint('fk_matches_side_a_entry', 'matches', type_='foreignkey')
    op.drop_constraint('fk_matches_division', 'matches', type_='foreignkey')
    op.drop_index(op.f('ix_matches_side_b_entry_id'), table_name='matches')
    op.drop_index(op.f('ix_matches_side_a_entry_id'), table_name='matches')
    op.drop_index(op.f('ix_matches_division_id'), table_name='matches')
    op.drop_column('matches', 'side_b_entry_id')
    op.drop_column('matches', 'side_a_entry_id')
    op.drop_column('matches', 'division_id')
    op.drop_column('matches', 'event_code')
    op.drop_column('matches', 'roster_a_id')
    op.drop_column('matches', 'roster_b_id')
    op.drop_column('matches', 'selected_players_a')
    op.drop_column('matches', 'selected_players_b')
    op.drop_column('matches', 'generation_rule')
    op.drop_column('matches', 'dependencies')
    op.drop_column('matches', 'draw_metadata')
    op.drop_column('matches', 'draw_status')
    
    # Keep group_id in players table - it's needed for school grouping
    # Check if column exists, if not add it
    conn = op.get_bind()
    if conn.dialect.name == 'postgresql':
        result = conn.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'players' AND column_name = 'group_id'
        """)
        has_group_id = len(list(result)) > 0
    else:
        # SQLite - check pragma
        result = conn.execute("PRAGMA table_info(players)")
        has_group_id = any(row[1] == 'group_id' for row in result)
    
    if not has_group_id:
        op.add_column('players', sa.Column('group_id', sa.String(), nullable=True))
        op.create_foreign_key('players_group_id_fkey', 'players', 'roster_groups', ['group_id'], ['id'])
        op.create_index(op.f('ix_players_group_id'), 'players', ['group_id'], unique=False)
    else:
        # Column exists, just ensure foreign key and index exist
        try:
            op.create_foreign_key('players_group_id_fkey', 'players', 'roster_groups', ['group_id'], ['id'])
        except Exception:
            pass  # Foreign key might already exist
        try:
            op.create_index(op.f('ix_players_group_id'), 'players', ['group_id'], unique=False)
        except Exception:
            pass  # Index might already exist
    
    # Drop enums that are no longer needed
    if conn.dialect.name == 'postgresql':
        op.execute("DROP TYPE IF EXISTS entrymemberrole")
        op.execute("DROP TYPE IF EXISTS gendercategory")
        op.execute("DROP TYPE IF EXISTS discipline")
        op.execute("DROP TYPE IF EXISTS drawstatus")
        op.execute("DROP TYPE IF EXISTS drawformat")
        op.execute("DROP TYPE IF EXISTS eventcode")
        op.execute("DROP TYPE IF EXISTS rostergrouptype")


def downgrade() -> None:
    # Note: This downgrade is complex and may not fully restore all data
    # Re-add group_id to players
    op.add_column('players', sa.Column('group_id', sa.String(), nullable=True))
    op.create_foreign_key('players_group_id_fkey', 'players', 'roster_groups', ['group_id'], ['id'])
    op.create_index(op.f('ix_players_group_id'), 'players', ['group_id'], unique=False)
    
    # Re-add complex columns to matches (simplified - some data may be lost)
    op.add_column('matches', sa.Column('draw_status', sa.String(), nullable=True))
    op.add_column('matches', sa.Column('draw_metadata', sa.JSON(), nullable=True))
    op.add_column('matches', sa.Column('dependencies', sa.JSON(), nullable=True))
    op.add_column('matches', sa.Column('generation_rule', sa.JSON(), nullable=True))
    op.add_column('matches', sa.Column('selected_players_b', sa.JSON(), nullable=True))
    op.add_column('matches', sa.Column('selected_players_a', sa.JSON(), nullable=True))
    op.add_column('matches', sa.Column('roster_b_id', sa.String(), nullable=True))
    op.add_column('matches', sa.Column('roster_a_id', sa.String(), nullable=True))
    op.add_column('matches', sa.Column('event_code', sa.String(), nullable=True))
    op.add_column('matches', sa.Column('division_id', sa.String(), nullable=True))
    op.add_column('matches', sa.Column('side_a_entry_id', sa.String(), nullable=True))
    op.add_column('matches', sa.Column('side_b_entry_id', sa.String(), nullable=True))
    
    # Re-create tables (simplified - data will be empty)
    # Note: This is a simplified recreation - full restoration would require more complex logic
    pass
