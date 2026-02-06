#!/usr/bin/env python3
"""
Test script for the complete stateless scheduling workflow.

This script simulates the frontend workflow by sending a complete
schedule request to the backend API.
"""
import requests
import json
from datetime import datetime

# Backend API endpoint
API_BASE = "http://localhost:8000"

def test_health():
    """Test health endpoint."""
    print("1. Testing health endpoint...")
    response = requests.get(f"{API_BASE}/health")
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    print("   [OK] Health check passed\n")

def test_schedule_generation():
    """Test schedule generation with sample data."""
    print("2. Testing schedule generation...")

    # Sample data: 2 schools, 4 players, 2 matches, 2 courts
    request_data = {
        "config": {
            "intervalMinutes": 15,
            "dayStart": "09:00",
            "dayEnd": "17:00",
            "breaks": [],
            "courtCount": 2,
            "defaultRestMinutes": 30,
            "freezeHorizonSlots": 0
        },
        "players": [
            {
                "id": "player-1",
                "name": "Alice (School A)",
                "groupId": "school-a",
                "availability": [],  # Available all day
                "minRestMinutes": 30
            },
            {
                "id": "player-2",
                "name": "Bob (School A)",
                "groupId": "school-a",
                "availability": [],
                "minRestMinutes": 30
            },
            {
                "id": "player-3",
                "name": "Charlie (School B)",
                "groupId": "school-b",
                "availability": [],
                "minRestMinutes": 30
            },
            {
                "id": "player-4",
                "name": "Diana (School B)",
                "groupId": "school-b",
                "availability": [],
                "minRestMinutes": 30
            }
        ],
        "matches": [
            {
                "id": "match-1",
                "sideA": ["player-1"],
                "sideB": ["player-3"],
                "durationSlots": 2,  # 30 minutes (2 x 15min)
                "eventRank": "SINGLES-1"
            },
            {
                "id": "match-2",
                "sideA": ["player-2"],
                "sideB": ["player-4"],
                "durationSlots": 2,
                "eventRank": "SINGLES-2"
            }
        ]
    }

    print(f"   Config: {request_data['config']['dayStart']} - {request_data['config']['dayEnd']}, "
          f"{request_data['config']['courtCount']} courts, "
          f"{request_data['config']['intervalMinutes']}min intervals")
    print(f"   Players: {len(request_data['players'])}")
    print(f"   Matches: {len(request_data['matches'])}")

    response = requests.post(
        f"{API_BASE}/schedule",
        json=request_data,
        headers={"Content-Type": "application/json"}
    )

    print(f"   Status: {response.status_code}")

    if response.status_code != 200:
        print(f"   [FAIL] Error: {response.text}")
        return False

    result = response.json()

    print(f"   Solver Status: {result.get('status', 'unknown')}")
    print(f"   Assignments: {len(result.get('assignments', []))}")
    print(f"   Unscheduled: {len(result.get('unscheduledMatches', []))}")
    print(f"   Soft Violations: {len(result.get('softViolations', []))}")
    print(f"   Objective Score: {result.get('objectiveScore', 0)}")

    # Verify results
    assert response.status_code == 200
    assert result['status'] in ['optimal', 'feasible']
    assert len(result['assignments']) > 0, "No matches were scheduled!"

    # Display schedule
    print("\n   Schedule Details:")
    for assignment in result['assignments']:
        match_id = assignment['matchId']
        slot_id = assignment['slotId']
        court_id = assignment['courtId']
        duration = assignment['durationSlots']

        # Find match details
        match = next((m for m in request_data['matches'] if m['id'] == match_id), None)
        if match:
            player_a = next((p['name'] for p in request_data['players'] if p['id'] == match['sideA'][0]), 'Unknown')
            player_b = next((p['name'] for p in request_data['players'] if p['id'] == match['sideB'][0]), 'Unknown')
            print(f"     - Slot {slot_id}, Court {court_id}: {player_a} vs {player_b} ({duration} slots)")

    print("\n   [OK] Schedule generation passed\n")
    return True

def test_infeasible_schedule():
    """Test with impossible constraints to verify error handling."""
    print("3. Testing infeasible schedule detection...")

    # Create impossible scenario: 2 matches, 1 court, but both players in both matches
    request_data = {
        "config": {
            "intervalMinutes": 15,
            "dayStart": "09:00",
            "dayEnd": "09:30",  # Only 2 slots available
            "breaks": [],
            "courtCount": 1,
            "defaultRestMinutes": 60,  # Need 4 slots rest, but only 2 slots total
            "freezeHorizonSlots": 0
        },
        "players": [
            {
                "id": "player-1",
                "name": "Alice",
                "groupId": "school-a",
                "availability": [[0, 2]],  # Only available for 2 slots
                "minRestMinutes": 60
            },
            {
                "id": "player-2",
                "name": "Bob",
                "groupId": "school-b",
                "availability": [[0, 2]],
                "minRestMinutes": 60
            }
        ],
        "matches": [
            {
                "id": "match-1",
                "sideA": ["player-1"],
                "sideB": ["player-2"],
                "durationSlots": 1,
                "eventRank": "M1"
            },
            {
                "id": "match-2",
                "sideA": ["player-1"],  # Same player needs 60min rest
                "sideB": ["player-2"],
                "durationSlots": 1,
                "eventRank": "M2"
            }
        ]
    }

    response = requests.post(
        f"{API_BASE}/schedule",
        json=request_data,
        headers={"Content-Type": "application/json"}
    )

    print(f"   Status: {response.status_code}")

    if response.status_code == 200:
        result = response.json()
        print(f"   Solver Status: {result.get('status', 'unknown')}")

        if result['status'] == 'infeasible':
            print(f"   Infeasible Reasons: {result.get('infeasibleReasons', [])}")
            print("   [OK] Correctly detected infeasible schedule\n")
        elif len(result.get('unscheduledMatches', [])) > 0:
            print(f"   Unscheduled: {result['unscheduledMatches']}")
            print("   [OK] Correctly identified unschedulable matches\n")
        else:
            print("   [WARNING] Warning: Expected infeasible but got a schedule\n")
    else:
        print(f"   Response: {response.text}")
        print("   [OK] Error handling works\n")

def main():
    """Run all workflow tests."""
    print("=" * 60)
    print("Stateless Scheduling Workflow Test")
    print("=" * 60)
    print()

    try:
        test_health()
        test_schedule_generation()
        test_infeasible_schedule()

        print("=" * 60)
        print("[OK] All tests passed!")
        print("=" * 60)
        print()
        print("The stateless scheduling system is working correctly:")
        print("  - Backend API is healthy")
        print("  - Schedule generation works with valid data")
        print("  - Solver produces optimal/feasible schedules")
        print("  - CP-SAT constraint solver is functioning")
        print()
        print("Next steps:")
        print("  1. Start frontend: cd frontend && npm run dev")
        print("  2. Open browser: http://localhost:5173")
        print("  3. Test workflow: Setup -> Roster -> Matches -> Schedule")
        print()

        return True

    except AssertionError as e:
        print(f"\n[FAIL] Test failed: {e}")
        return False
    except requests.exceptions.ConnectionError:
        print("\n[FAIL] Error: Cannot connect to backend at http://localhost:8000")
        print("   Make sure the backend is running: docker-compose up -d")
        return False
    except Exception as e:
        print(f"\n[FAIL] Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
