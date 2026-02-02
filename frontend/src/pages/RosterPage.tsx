import { useState } from 'react';
import { useRoster } from '../hooks/useRoster';
import { useRosterGroups } from '../hooks/useRosterGroups';
import { PlayerForm } from '../features/roster/PlayerForm';
import { RankCoverageDashboard } from '../features/roster/RankCoverageDashboard';
import { PlayerListView } from '../features/roster/components/PlayerListView';
import { BulkActionsToolbar } from '../features/roster/components/BulkActionsToolbar';
import { BulkSchoolAssignDialog } from '../features/roster/components/BulkSchoolAssignDialog';
import { BulkRankAssignDialog } from '../features/roster/components/BulkRankAssignDialog';
import { PlayerImportDialog } from '../features/roster/components/PlayerImportDialog';
import { useBulkOperations } from '../features/roster/hooks/useBulkOperations';
import type { PlayerDTO, RosterGroupDTO } from '../api/dto';
import { v4 as uuidv4 } from 'uuid';

export function RosterPage() {
  const { players, loading, error, createPlayer, updatePlayer, deletePlayer } = useRoster();
  const { groups, createGroup, updateGroup, deleteGroup } = useRosterGroups();
  const { bulkAssignSchool, bulkAssignRanks, bulkDeletePlayers } = useBulkOperations();

  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerDTO | null>(null);
  const [editingGroup, setEditingGroup] = useState<RosterGroupDTO | null>(null);
  const [newGroupName, setNewGroupName] = useState('');

  // Bulk operations state
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [showBulkSchoolDialog, setShowBulkSchoolDialog] = useState(false);
  const [showBulkRankDialog, setShowBulkRankDialog] = useState(false);
  const [pendingSchoolId, setPendingSchoolId] = useState<string | null>(null);

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
        id: uuidv4(),
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

  // Bulk operation handlers
  const handleBulkSchoolAssign = (schoolId: string) => {
    setPendingSchoolId(schoolId);
    setShowBulkSchoolDialog(true);
  };

  const handleBulkSchoolConfirm = (clearConflictingRanks: boolean) => {
    if (pendingSchoolId) {
      bulkAssignSchool(selectedPlayerIds, pendingSchoolId, clearConflictingRanks);
      setSelectedPlayerIds([]);
      setPendingSchoolId(null);
    }
  };

  const handleBulkRankAssign = () => {
    setShowBulkRankDialog(true);
  };

  const handleBulkRankConfirm = (ranks: string[], mode: 'add' | 'set' | 'remove') => {
    bulkAssignRanks(selectedPlayerIds, ranks, mode, true);
    setSelectedPlayerIds([]);
  };

  const handleBulkDelete = () => {
    bulkDeletePlayers(selectedPlayerIds);
    setSelectedPlayerIds([]);
  };

  const handleImport = async (importedPlayers: PlayerDTO[], newGroups: RosterGroupDTO[]) => {
    try {
      // Create new groups first
      for (const group of newGroups) {
        await createGroup(group);
      }

      // Then create all players
      for (const player of importedPlayers) {
        await createPlayer(player);
      }

      setShowImportDialog(false);
    } catch (err) {
      // Error handled by hooks
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
            onClick={() => setShowImportDialog(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
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

      {/* Rank Coverage Dashboard */}
      <RankCoverageDashboard />

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
        <PlayerListView
          players={players}
          schools={groups}
          onSchoolChange={(playerId, schoolId) => updatePlayer(playerId, { groupId: schoolId })}
          onRanksChange={(playerId, ranks) => updatePlayer(playerId, { ranks })}
          onEdit={handlePlayerClick}
          onDelete={handlePlayerDelete}
          onSelectionChange={setSelectedPlayerIds}
        />
      )}

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedPlayerIds.length}
        schools={groups}
        onClearSelection={() => setSelectedPlayerIds([])}
        onBulkSchoolAssign={handleBulkSchoolAssign}
        onBulkRankAssign={handleBulkRankAssign}
        onBulkDelete={handleBulkDelete}
      />

      {/* Bulk School Assign Dialog */}
      {pendingSchoolId && (
        <BulkSchoolAssignDialog
          isOpen={showBulkSchoolDialog}
          selectedPlayerIds={selectedPlayerIds}
          targetSchoolId={pendingSchoolId}
          targetSchoolName={groups.find(g => g.id === pendingSchoolId)?.name || ''}
          onClose={() => {
            setShowBulkSchoolDialog(false);
            setPendingSchoolId(null);
          }}
          onConfirm={handleBulkSchoolConfirm}
        />
      )}

      {/* Bulk Rank Assign Dialog */}
      <BulkRankAssignDialog
        isOpen={showBulkRankDialog}
        selectedPlayerIds={selectedPlayerIds}
        onClose={() => setShowBulkRankDialog(false)}
        onConfirm={handleBulkRankConfirm}
      />

      <PlayerImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImport}
        existingGroups={groups}
      />
    </div>
  );
}
