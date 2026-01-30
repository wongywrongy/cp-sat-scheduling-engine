import { useState } from 'react';
import { useRoster } from '../hooks/useRoster';
import { useRosterGroups } from '../hooks/useRosterGroups';
import { PlayerForm } from '../features/roster/PlayerForm';
import { RosterImportDialog } from '../features/roster/RosterImportDialog';
import type { PlayerDTO, RosterGroupDTO } from '../api/dto';
import { v4 as uuidv4 } from 'uuid';

export function RosterPage() {
  const { players, loading, error, createPlayer, updatePlayer, deletePlayer, importRoster } = useRoster();
  const { groups, createGroup, updateGroup, deleteGroup } = useRosterGroups();
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerDTO | null>(null);
  const [editingGroup, setEditingGroup] = useState<RosterGroupDTO | null>(null);
  const [newGroupName, setNewGroupName] = useState('');

  const handlePlayerClick = (player: PlayerDTO) => {
    setEditingPlayer(player);
    setShowPlayerForm(true);
  };

  const handlePlayerSave = async (player: PlayerDTO) => {
    try {
      if (editingPlayer) {
        await updatePlayer(editingPlayer.id, player);
      } else {
        await createPlayer(player);
      }
      setShowPlayerForm(false);
      setEditingPlayer(null);
    } catch (err) {
      // Error handled by hook
    }
  };

  const handlePlayerCancel = () => {
    setShowPlayerForm(false);
    setEditingPlayer(null);
  };

  const handlePlayerDelete = async (playerId: string) => {
    if (confirm('Are you sure you want to delete this player?')) {
      try {
        await deletePlayer(playerId);
      } catch (err) {
        // Error handled by hook
      }
    }
  };

  const handleAddPlayer = () => {
    setEditingPlayer(null);
    setShowPlayerForm(true);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await createGroup({
        id: generateId(),
        name: newGroupName.trim(),
      });
      setNewGroupName('');
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleEditGroup = (group: RosterGroupDTO) => {
    setEditingGroup(group);
    setShowGroupForm(true);
  };

  const handleSaveGroup = async () => {
    if (!editingGroup || !editingGroup.name.trim()) return;
    try {
      if (editingGroup.id) {
        await updateGroup(editingGroup.id, { name: editingGroup.name });
      }
      setShowGroupForm(false);
      setEditingGroup(null);
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (confirm('Are you sure you want to delete this group? Players in this group will be ungrouped.')) {
      try {
        await deleteGroup(groupId);
      } catch (err) {
        // Error handled by hook
      }
    }
  };

  // Group players by group
  const playersByGroup = groups.reduce((acc, group) => {
    acc[group.id] = players.filter(p => p.groupId === group.id);
    return acc;
  }, {} as Record<string, PlayerDTO[]>);
  const ungroupedPlayers = players.filter(p => !p.groupId);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Players & Schools</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Import CSV
          </button>
          <button
            onClick={handleAddPlayer}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Player
          </button>
        </div>
      </div>

      {/* Groups Section */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Schools</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateGroup()}
              placeholder="School name"
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <button
              onClick={handleCreateGroup}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Add School
            </button>
          </div>
        </div>
        {showGroupForm && editingGroup && (
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <input
              type="text"
              value={editingGroup.name}
              onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md mr-2"
            />
            <button
              onClick={handleSaveGroup}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mr-2"
            >
              Save
            </button>
            <button
              onClick={() => { setShowGroupForm(false); setEditingGroup(null); }}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <div key={group.id} className="px-3 py-2 bg-blue-100 rounded-md flex items-center gap-2">
              <span className="font-medium">{group.name}</span>
              <span className="text-sm text-gray-600">({playersByGroup[group.id]?.length || 0} players)</span>
              <button
                onClick={() => handleEditGroup(group)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteGroup(group.id)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {showPlayerForm && (
        <div className="mb-6">
          <PlayerForm
            player={editingPlayer || undefined}
            onSave={handlePlayerSave}
            onCancel={handlePlayerCancel}
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading players...</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    School
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank/Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Min Rest (min)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Availability
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {players.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      No players yet. Click "Add Player" to get started.
                    </td>
                  </tr>
                ) : (
                  players.map((player) => (
                    <tr key={player.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {player.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {player.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {player.groupId ? groups.find(g => g.id === player.groupId)?.name || '-' : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {player.rank || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {player.minRestMinutes}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {player.availability.length === 0 ? (
                          <span className="text-gray-400">Always available</span>
                        ) : (
                          <div className="space-y-1">
                            {player.availability.map((av, idx) => (
                              <div key={idx} className="text-xs">
                                {av.start} - {av.end}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {player.notes || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handlePlayerClick(player)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handlePlayerDelete(player.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showImport && (
        <RosterImportDialog
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          onImport={importRoster}
        />
      )}
    </div>
  );
}
