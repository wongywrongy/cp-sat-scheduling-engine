"""normalize divisions - replace hardcoded EventCode enum

Revision ID: 003_normalize_divisions
Revises: 002_add_draw
Create Date: 2026-01-28 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '003_normalize_divisions'
down_revision = '002_add_draw'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Get database dialect to handle enum creation appropriately
    conn = op.get_bind()
    is_postgresql = conn.dialect.name == 'postgresql'
    
    # Create enums only for PostgreSQL (SQLite stores enums as strings)
    if is_postgresql:
        op.execute("CREATE TYPE discipline AS ENUM ('singles', 'doubles', 'mixed')")
        op.execute("CREATE TYPE gendercategory AS ENUM ('men', 'women', 'mixed', 'open')")
        op.execute("CREATE TYPE entrymemberrole AS ENUM ('player1', 'player2')")
    
    # Create divisions table with enums (SQLAlchemy handles SQLite compatibility automatically)
    op.create_table(
        'divisions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tournament_id', sa.String(), nullable=False),
        sa.Column('discipline', sa.Enum('singles', 'doubles', 'mixed', name='discipline'), nullable=False),
        sa.Column('gender_category', sa.Enum('men', 'women', 'mixed', 'open', name='gendercategory'), nullable=False),
        sa.Column('level_label', sa.String(), nullable=False),
        sa.Column('code', sa.String(), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['tournament_id'], ['tournaments.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_divisions_id'), 'divisions', ['id'], unique=False)
    op.create_index(op.f('ix_divisions_tournament_id'), 'divisions', ['tournament_id'], unique=False)
    op.create_index('ix_divisions_tournament_discipline', 'divisions', ['tournament_id', 'discipline'], unique=False)
    op.create_index('ix_divisions_tournament_gender', 'divisions', ['tournament_id', 'gender_category'], unique=False)
    op.create_unique_constraint('uq_division_tournament_code', 'divisions', ['tournament_id', 'code'])
    
    # Add division_id column to events table (nullable initially for migration)
    op.add_column('events', sa.Column('division_id', sa.String(), nullable=True))
    op.create_index(op.f('ix_events_division_id'), 'events', ['division_id'], unique=False)
    op.create_foreign_key('fk_events_division', 'events', 'divisions', ['division_id'], ['id'])
    
    # Migrate existing events to divisions
    # Map old EventCode enum values to new division structure
    conn = op.get_bind()
    
    # Get all existing events
    events_result = conn.execute(text("SELECT id, tournament_id, code, name FROM events"))
    events = events_result.fetchall()
    
    for event_id, tournament_id, old_code, event_name in events:
        # Map old EventCode to discipline and gender_category
        code_mapping = {
            'MS': ('singles', 'men', 'A'),  # Default to 'A' level
            'WS': ('singles', 'women', 'A'),
            'MD': ('doubles', 'men', 'A'),
            'WD': ('doubles', 'women', 'A'),
            'XD': ('mixed', 'mixed', 'A'),
        }
        
        if old_code in code_mapping:
            discipline, gender_category, level_label = code_mapping[old_code]
            
            # Create division code from old code + level
            division_code = f"{old_code}-{level_label}"
            
            # Check if division already exists for this tournament
            division_check = conn.execute(
                text("SELECT id FROM divisions WHERE tournament_id = :tournament_id AND code = :code"),
                {"tournament_id": tournament_id, "code": division_code}
            ).fetchone()
            
            if division_check:
                division_id = division_check[0]
            else:
                # Create new division
                import uuid
                division_id = str(uuid.uuid4())
                conn.execute(
                    text("""
                        INSERT INTO divisions (id, tournament_id, discipline, gender_category, level_label, code, sort_order)
                        VALUES (:id, :tournament_id, :discipline, :gender_category, :level_label, :code, 0)
                    """),
                    {
                        "id": division_id,
                        "tournament_id": tournament_id,
                        "discipline": discipline,
                        "gender_category": gender_category,
                        "level_label": level_label,
                        "code": division_code
                    }
                )
            
            # Update event to reference division
            conn.execute(
                text("UPDATE events SET division_id = :division_id WHERE id = :event_id"),
                {"division_id": division_id, "event_id": event_id}
            )
    
    # Make division_id NOT NULL after migration
    op.alter_column('events', 'division_id', nullable=False)
    
    # Create entry_members table
    op.create_table(
        'entry_members',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('entry_id', sa.String(), nullable=False),
        sa.Column('player_id', sa.String(), nullable=False),
        sa.Column('role', sa.Enum('player1', 'player2', name='entrymemberrole'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['entry_id'], ['entries.id'], ),
        sa.ForeignKeyConstraint(['player_id'], ['players.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_entry_members_id'), 'entry_members', ['id'], unique=False)
    op.create_index(op.f('ix_entry_members_entry_id'), 'entry_members', ['entry_id'], unique=False)
    op.create_index(op.f('ix_entry_members_player_id'), 'entry_members', ['player_id'], unique=False)
    op.create_index('ix_entry_members_entry', 'entry_members', ['entry_id'], unique=False)
    op.create_index('ix_entry_members_player', 'entry_members', ['player_id'], unique=False)
    op.create_unique_constraint('uq_entry_member_role', 'entry_members', ['entry_id', 'role'])
    
    # Migrate existing entries to entry_members
    entries_result = conn.execute(text("SELECT id, participant_ids FROM entries WHERE participant_ids IS NOT NULL"))
    entries = entries_result.fetchall()
    
    for entry_id, participant_ids_json in entries:
        import json
        participant_ids = json.loads(participant_ids_json) if isinstance(participant_ids_json, str) else participant_ids_json
        
        if isinstance(participant_ids, list) and len(participant_ids) > 0:
            # Create entry_member for first player
            import uuid
            member1_id = str(uuid.uuid4())
            conn.execute(
                text("""
                    INSERT INTO entry_members (id, entry_id, player_id, role)
                    VALUES (:id, :entry_id, :player_id, 'player1')
                """),
                {
                    "id": member1_id,
                    "entry_id": entry_id,
                    "player_id": participant_ids[0]
                }
            )
            
            # Create entry_member for second player if exists (doubles/mixed)
            if len(participant_ids) > 1:
                member2_id = str(uuid.uuid4())
                conn.execute(
                    text("""
                        INSERT INTO entry_members (id, entry_id, player_id, role)
                        VALUES (:id, :entry_id, :player_id, 'player2')
                    """),
                    {
                        "id": member2_id,
                        "entry_id": entry_id,
                        "player_id": participant_ids[1]
                    }
                )
    
    # Add division_id and entry references to matches table
    op.add_column('matches', sa.Column('division_id', sa.String(), nullable=True))
    op.add_column('matches', sa.Column('side_a_entry_id', sa.String(), nullable=True))
    op.add_column('matches', sa.Column('side_b_entry_id', sa.String(), nullable=True))
    op.create_index(op.f('ix_matches_division_id'), 'matches', ['division_id'], unique=False)
    op.create_index(op.f('ix_matches_side_a_entry_id'), 'matches', ['side_a_entry_id'], unique=False)
    op.create_index(op.f('ix_matches_side_b_entry_id'), 'matches', ['side_b_entry_id'], unique=False)
    op.create_foreign_key('fk_matches_division', 'matches', 'divisions', ['division_id'], ['id'])
    op.create_foreign_key('fk_matches_side_a_entry', 'matches', 'entries', ['side_a_entry_id'], ['id'])
    op.create_foreign_key('fk_matches_side_b_entry', 'matches', ['side_b_entry_id'], ['entries'], ['id'])
    
    # Migrate matches: try to find division from event_code
    matches_result = conn.execute(text("SELECT id, tournament_id, event_code FROM matches WHERE event_code IS NOT NULL"))
    matches = matches_result.fetchall()
    
    for match_id, tournament_id, event_code in matches:
        # Extract base code (MS, WS, etc.) from event_code
        base_code = event_code.split('-')[0] if '-' in event_code else event_code
        
        # Find division for this tournament and code
        division_result = conn.execute(
            text("""
                SELECT id FROM divisions 
                WHERE tournament_id = :tournament_id 
                AND (code LIKE :code_pattern OR code = :code_exact)
                LIMIT 1
            """),
            {
                "tournament_id": tournament_id,
                "code_pattern": f"{base_code}-%",
                "code_exact": base_code
            }
        ).fetchone()
        
        if division_result:
            division_id = division_result[0]
            conn.execute(
                text("UPDATE matches SET division_id = :division_id WHERE id = :match_id"),
                {"division_id": division_id, "match_id": match_id}
            )
    
    # Create schedule_assignments table
    op.create_table(
        'schedule_assignments',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('schedule_id', sa.String(), nullable=False),
        sa.Column('match_id', sa.String(), nullable=False),
        sa.Column('slot_id', sa.Integer(), nullable=False),
        sa.Column('court_id', sa.Integer(), nullable=False),
        sa.Column('duration_slots', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('locked', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('pinned', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['schedule_id'], ['schedules.id'], ),
        sa.ForeignKeyConstraint(['match_id'], ['matches.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_schedule_assignments_id'), 'schedule_assignments', ['id'], unique=False)
    op.create_index(op.f('ix_schedule_assignments_schedule_id'), 'schedule_assignments', ['schedule_id'], unique=False)
    op.create_index(op.f('ix_schedule_assignments_match_id'), 'schedule_assignments', ['match_id'], unique=False)
    op.create_index('ix_schedule_assignments_schedule', 'schedule_assignments', ['schedule_id'], unique=False)
    op.create_index('ix_schedule_assignments_match', 'schedule_assignments', ['match_id'], unique=False)
    op.create_index('ix_schedule_assignments_slot_court', 'schedule_assignments', ['schedule_id', 'slot_id', 'court_id'], unique=False)
    op.create_unique_constraint('uq_schedule_slot_court', 'schedule_assignments', ['schedule_id', 'slot_id', 'court_id'])
    op.create_unique_constraint('uq_schedule_match', 'schedule_assignments', ['schedule_id', 'match_id'])
    
    # Migrate existing schedule assignments from JSON to table
    schedules_result = conn.execute(text("SELECT id, assignments FROM schedules WHERE assignments IS NOT NULL"))
    schedules = schedules_result.fetchall()
    
    for schedule_id, assignments_json in schedules:
        import json
        assignments = json.loads(assignments_json) if isinstance(assignments_json, str) else assignments_json
        
        if isinstance(assignments, list):
            for assignment in assignments:
                if isinstance(assignment, dict) and 'matchId' in assignment:
                    import uuid
                    assignment_id = str(uuid.uuid4())
                    conn.execute(
                        text("""
                            INSERT INTO schedule_assignments 
                            (id, schedule_id, match_id, slot_id, court_id, duration_slots, locked, pinned)
                            VALUES (:id, :schedule_id, :match_id, :slot_id, :court_id, :duration_slots, :locked, :pinned)
                        """),
                        {
                            "id": assignment_id,
                            "schedule_id": schedule_id,
                            "match_id": assignment.get('matchId'),
                            "slot_id": assignment.get('slotId', 0),
                            "court_id": assignment.get('courtId', 0),
                            "duration_slots": assignment.get('durationSlots', 1),
                            "locked": assignment.get('locked', False),
                            "pinned": assignment.get('pinned', False)
                        }
                    )
    
    # Create match_state_events table
    op.create_table(
        'match_state_events',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('match_id', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('score', sa.JSON(), nullable=True),
        sa.Column('event_metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['match_id'], ['matches.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_match_state_events_id'), 'match_state_events', ['id'], unique=False)
    op.create_index(op.f('ix_match_state_events_match_id'), 'match_state_events', ['match_id'], unique=False)
    op.create_index('ix_match_state_events_match', 'match_state_events', ['match_id'], unique=False)
    op.create_index('ix_match_state_events_created', 'match_state_events', ['created_at'], unique=False)


def downgrade() -> None:
    # Drop match_state_events table
    op.drop_index('ix_match_state_events_created', table_name='match_state_events')
    op.drop_index('ix_match_state_events_match', table_name='match_state_events')
    op.drop_index(op.f('ix_match_state_events_match_id'), table_name='match_state_events')
    op.drop_index(op.f('ix_match_state_events_id'), table_name='match_state_events')
    op.drop_table('match_state_events')
    
    # Drop schedule_assignments table
    op.drop_constraint('uq_schedule_match', 'schedule_assignments', type_='unique')
    op.drop_constraint('uq_schedule_slot_court', 'schedule_assignments', type_='unique')
    op.drop_index('ix_schedule_assignments_slot_court', table_name='schedule_assignments')
    op.drop_index('ix_schedule_assignments_match', table_name='schedule_assignments')
    op.drop_index('ix_schedule_assignments_schedule', table_name='schedule_assignments')
    op.drop_index(op.f('ix_schedule_assignments_match_id'), table_name='schedule_assignments')
    op.drop_index(op.f('ix_schedule_assignments_schedule_id'), table_name='schedule_assignments')
    op.drop_index(op.f('ix_schedule_assignments_id'), table_name='schedule_assignments')
    op.drop_table('schedule_assignments')
    
    # Remove division_id and entry references from matches
    op.drop_constraint('fk_matches_side_b_entry', 'matches', type_='foreignkey')
    op.drop_constraint('fk_matches_side_a_entry', 'matches', type_='foreignkey')
    op.drop_constraint('fk_matches_division', 'matches', type_='foreignkey')
    op.drop_index(op.f('ix_matches_side_b_entry_id'), table_name='matches')
    op.drop_index(op.f('ix_matches_side_a_entry_id'), table_name='matches')
    op.drop_index(op.f('ix_matches_division_id'), table_name='matches')
    op.drop_column('matches', 'side_b_entry_id')
    op.drop_column('matches', 'side_a_entry_id')
    op.drop_column('matches', 'division_id')
    
    # Drop entry_members table
    op.drop_constraint('uq_entry_member_role', 'entry_members', type_='unique')
    op.drop_index('ix_entry_members_player', table_name='entry_members')
    op.drop_index('ix_entry_members_entry', table_name='entry_members')
    op.drop_index(op.f('ix_entry_members_player_id'), table_name='entry_members')
    op.drop_index(op.f('ix_entry_members_entry_id'), table_name='entry_members')
    op.drop_index(op.f('ix_entry_members_id'), table_name='entry_members')
    op.drop_table('entry_members')
    
    # Remove division_id from events
    op.drop_constraint('fk_events_division', 'events', type_='foreignkey')
    op.drop_index(op.f('ix_events_division_id'), table_name='events')
    op.drop_column('events', 'division_id')
    
    # Drop divisions table
    op.drop_constraint('uq_division_tournament_code', 'divisions', type_='unique')
    op.drop_index('ix_divisions_tournament_gender', table_name='divisions')
    op.drop_index('ix_divisions_tournament_discipline', table_name='divisions')
    op.drop_index(op.f('ix_divisions_tournament_id'), table_name='divisions')
    op.drop_index(op.f('ix_divisions_id'), table_name='divisions')
    op.drop_table('divisions')
    
    # Drop enums (only for PostgreSQL)
    conn = op.get_bind()
    if conn.dialect.name == 'postgresql':
        op.execute("DROP TYPE IF EXISTS entrymemberrole")
        op.execute("DROP TYPE IF EXISTS gendercategory")
        op.execute("DROP TYPE IF EXISTS discipline")
