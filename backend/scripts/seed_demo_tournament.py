"""Seed script to create a demo tournament with divisions and entries."""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import Tournament
from draws.models import Division, Event, Entry, EntryMember, Discipline, GenderCategory, DrawFormat
from draws.services.division_service import DivisionService
from draws.services.event_service import EventService
from draws.services.entry_service import EntryService
from draws.schemas import DivisionCreate, EventCreate, EntryCreate
import uuid


def create_demo_tournament():
    """Create a demo tournament with multiple divisions and entries."""
    db: Session = SessionLocal()
    
    try:
        # Create tournament
        tournament_id = "demo-tournament-2026"
        tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
        
        if tournament:
            print(f"Tournament {tournament_id} already exists. Deleting and recreating...")
            db.delete(tournament)
            db.commit()
        
        tournament = Tournament(
            id=tournament_id,
            name="Demo Badminton Tournament 2026",
            config={
                "intervalMinutes": 30,
                "dayStart": "09:00",
                "dayEnd": "18:00",
                "breaks": [],
                "courtCount": 4,
                "defaultRestMinutes": 30,
                "freezeHorizonSlots": 2,
            }
        )
        db.add(tournament)
        db.commit()
        print(f"Created tournament: {tournament.name}")
        
        # Create divisions
        divisions_data = [
            {"discipline": Discipline.SINGLES, "gender": GenderCategory.MEN, "level": "A", "code": "MS-A"},
            {"discipline": Discipline.SINGLES, "gender": GenderCategory.MEN, "level": "B", "code": "MS-B"},
            {"discipline": Discipline.SINGLES, "gender": GenderCategory.WOMEN, "level": "A", "code": "WS-A"},
            {"discipline": Discipline.DOUBLES, "gender": GenderCategory.MEN, "level": "B", "code": "MD-B"},
            {"discipline": Discipline.DOUBLES, "gender": GenderCategory.WOMEN, "level": "A", "code": "WD-A"},
            {"discipline": Discipline.MIXED, "gender": GenderCategory.MIXED, "level": "Open", "code": "XD-Open"},
        ]
        
        divisions = {}
        for idx, div_data in enumerate(divisions_data):
            division_create = DivisionCreate(
                discipline=div_data["discipline"],
                genderCategory=div_data["gender"],
                levelLabel=div_data["level"],
                code=div_data["code"],
                sortOrder=idx,
            )
            division = DivisionService.create_division(db, tournament_id, division_create)
            divisions[div_data["code"]] = division
            print(f"Created division: {div_data['code']} - {div_data['gender'].value.title()} {div_data['discipline'].value.title()} {div_data['level']}")
        
        # Create sample players
        players = []
        for i in range(1, 21):  # Create 20 players
            player_id = f"player-{i}"
            from app.models import Player
            player = Player(
                id=player_id,
                tournament_id=tournament_id,
                name=f"Player {i}",
                availability=[],
                min_rest_minutes=30,
            )
            db.add(player)
            players.append(player)
        db.commit()
        print(f"Created {len(players)} players")
        
        # Create events for each division
        events = {}
        for div_code, division in divisions.items():
            event_create = EventCreate(
                divisionId=division.id,
                name=f"{division.gender_category.value.title()} {division.discipline.value.title()} {division.level_label}",
                drawFormat=DrawFormat.ROUND_ROBIN,
            )
            event = EventService.create_event(db, tournament_id, event_create)
            events[div_code] = event
            print(f"Created event: {event.name}")
        
        # Create entries
        # Men's Singles A - 4 players
        ms_a_players = players[:4]
        for i, player in enumerate(ms_a_players):
            entry_create = EntryCreate(
                participantIds=[player.id],
                seed=i+1 if i < 4 else None,
            )
            EntryService.create_entry(db, events["MS-A"].id, entry_create)
        print(f"Created 4 entries for Men's Singles A")
        
        # Men's Singles B - 4 players
        ms_b_players = players[4:8]
        for i, player in enumerate(ms_b_players):
            entry_create = EntryCreate(
                participantIds=[player.id],
                seed=i+1 if i < 4 else None,
            )
            EntryService.create_entry(db, events["MS-B"].id, entry_create)
        print(f"Created 4 entries for Men's Singles B")
        
        # Women's Singles A - 4 players
        ws_a_players = players[8:12]
        for i, player in enumerate(ws_a_players):
            entry_create = EntryCreate(
                participantIds=[player.id],
                seed=i+1 if i < 4 else None,
            )
            EntryService.create_entry(db, events["WS-A"].id, entry_create)
        print(f"Created 4 entries for Women's Singles A")
        
        # Men's Doubles B - 3 pairs
        md_b_pairs = [
            [players[12].id, players[13].id],
            [players[14].id, players[15].id],
            [players[16].id, players[17].id],
        ]
        for i, pair in enumerate(md_b_pairs):
            entry_create = EntryCreate(
                participantIds=pair,
                seed=i+1 if i < 3 else None,
            )
            EntryService.create_entry(db, events["MD-B"].id, entry_create)
        print(f"Created 3 entries for Men's Doubles B")
        
        # Women's Doubles A - 2 pairs
        wd_a_pairs = [
            [players[8].id, players[9].id],
            [players[10].id, players[11].id],
        ]
        for i, pair in enumerate(wd_a_pairs):
            entry_create = EntryCreate(
                participantIds=pair,
                seed=i+1 if i < 2 else None,
            )
            EntryService.create_entry(db, events["WD-A"].id, entry_create)
        print(f"Created 2 entries for Women's Doubles A")
        
        # Mixed Doubles Open - 2 pairs
        xd_pairs = [
            [players[0].id, players[8].id],
            [players[1].id, players[9].id],
        ]
        for i, pair in enumerate(xd_pairs):
            entry_create = EntryCreate(
                participantIds=pair,
                seed=i+1 if i < 2 else None,
            )
            EntryService.create_entry(db, events["XD-Open"].id, entry_create)
        print(f"Created 2 entries for Mixed Doubles Open")
        
        print("\n✅ Demo tournament seeded successfully!")
        print(f"Tournament ID: {tournament_id}")
        print(f"Divisions: {len(divisions)}")
        print(f"Events: {len(events)}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding tournament: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    create_demo_tournament()
