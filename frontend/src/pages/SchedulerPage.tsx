import { useState } from 'react';
import { useScheduleStore } from '../store/scheduleStore';
import { apiClient } from '../services/api';
import type { ScheduleRequest } from '../types/schedule';

import { PlayerForm } from '../components/forms/PlayerForm';
import { MatchForm } from '../components/forms/MatchForm';
import { ConfigForm } from '../components/forms/ConfigForm';
import { SolverOptionsForm } from '../components/forms/SolverOptionsForm';
import { EditableSchedule } from '../components/editor/EditableSchedule';
import { LockControls } from '../components/controls/LockControls';
import { FreezeHorizonControl } from '../components/controls/FreezeHorizonControl';
import { ReOptimizeButton } from '../components/controls/ReOptimizeButton';
import { CourtOrderManager } from '../components/courts/CourtOrderManager';
import { ExportMenu } from '../components/export/ExportMenu';
import { ImportDialog } from '../components/export/ImportDialog';

export function SchedulerPage() {
  const {
    players,
    matches,
    config,
    scheduleResponse,
    isLoading,
    error,
    setScheduleResponse,
    setLoading,
    setError,
    getPreviousAssignments,
  } = useScheduleStore();

  // Debug: Log to verify component is rendering
  console.log('SchedulerPage rendering', { players, matches, config });

  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [editingMatch, setEditingMatch] = useState<string | null>(null);

  const handleGenerateSchedule = async () => {
    if (!config) {
      alert('Please configure the tournament first');
      return;
    }

    if (players.length === 0) {
      alert('Please add at least one player');
      return;
    }

    if (matches.length === 0) {
      alert('Please add at least one match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request: ScheduleRequest = {
        config,
        players,
        matches,
        previousAssignments: scheduleResponse ? getPreviousAssignments() : [],
      };

      const response = await apiClient.generateSchedule(request);
      setScheduleResponse(response);

      if (response.status === 'infeasible') {
        alert(`Schedule is infeasible: ${response.infeasibleReasons.join(', ')}`);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to generate schedule');
      alert(`Error: ${error.message || 'Failed to generate schedule'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Tournament Scheduler</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Input Forms */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Configuration</h2>
              <button
                onClick={() => setShowImportDialog(true)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Import
              </button>
            </div>

            <ConfigForm />
            <SolverOptionsForm />

            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Players</h2>
              <button
                onClick={() => {
                  setEditingPlayer(null);
                  setShowPlayerForm(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Player
              </button>
            </div>

            {showPlayerForm && (
              <PlayerForm
                player={editingPlayer ? players.find((p) => p.id === editingPlayer) : undefined}
                onSave={() => {
                  setShowPlayerForm(false);
                  setEditingPlayer(null);
                }}
                onCancel={() => {
                  setShowPlayerForm(false);
                  setEditingPlayer(null);
                }}
              />
            )}

            <div className="space-y-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="p-3 bg-white rounded-lg shadow flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium">{player.name}</div>
                    <div className="text-sm text-gray-600">ID: {player.id}</div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingPlayer(player.id);
                      setShowPlayerForm(true);
                    }}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Matches</h2>
              <button
                onClick={() => {
                  setEditingMatch(null);
                  setShowMatchForm(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Match
              </button>
            </div>

            {showMatchForm && (
              <MatchForm
                match={editingMatch ? matches.find((m) => m.id === editingMatch) : undefined}
                onSave={() => {
                  setShowMatchForm(false);
                  setEditingMatch(null);
                }}
                onCancel={() => {
                  setShowMatchForm(false);
                  setEditingMatch(null);
                }}
              />
            )}

            <div className="space-y-2">
              {matches.map((match) => (
                <div
                  key={match.id}
                  className="p-3 bg-white rounded-lg shadow flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium">{match.eventCode}</div>
                    <div className="text-sm text-gray-600">ID: {match.id}</div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingMatch(match.id);
                      setShowMatchForm(true);
                    }}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleGenerateSchedule}
              disabled={isLoading || !config || players.length === 0 || matches.length === 0}
              className={`
                w-full px-6 py-3 rounded-lg font-semibold text-white
                ${
                  isLoading || !config || players.length === 0 || matches.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }
              `}
            >
              {isLoading ? 'Generating Schedule...' : 'Generate Schedule'}
            </button>

            {scheduleResponse && (
              <div className="p-4 bg-white rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2">Schedule Status</h3>
                <div className="space-y-1 text-sm">
                  <div>
                    Status: <span className="font-medium">{scheduleResponse.status}</span>
                  </div>
                  {scheduleResponse.objectiveScore !== null && scheduleResponse.objectiveScore !== undefined && (
                    <div>
                      Objective Score: <span className="font-medium">{scheduleResponse.objectiveScore.toFixed(2)}</span>
                    </div>
                  )}
                  <div>
                    Runtime: <span className="font-medium">{scheduleResponse.runtimeMs.toFixed(2)}ms</span>
                  </div>
                  <div>
                    Scheduled: <span className="font-medium">{scheduleResponse.assignments.length}</span> matches
                  </div>
                  {scheduleResponse.softViolations.length > 0 && (
                    <div className="mt-2 text-orange-600">
                      Soft Violations: {scheduleResponse.softViolations.length}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Middle Column - Schedule */}
          <div className="lg:col-span-1 space-y-6">
            {scheduleResponse && scheduleResponse.assignments.length > 0 ? (
              <>
                <EditableSchedule assignments={scheduleResponse.assignments} />
                <ReOptimizeButton />
              </>
            ) : (
              <div className="p-8 bg-white rounded-lg shadow text-center text-gray-500">
                Generate a schedule to see it here
              </div>
            )}
          </div>

          {/* Right Column - Controls */}
          <div className="space-y-6">
            {scheduleResponse && scheduleResponse.assignments.length > 0 && (
              <>
                <LockControls assignments={scheduleResponse.assignments} />
                <FreezeHorizonControl />
              </>
            )}
            <CourtOrderManager />
            <ExportMenu />
          </div>
        </div>
      </div>

      <ImportDialog isOpen={showImportDialog} onClose={() => setShowImportDialog(false)} />
    </div>
  );
}
