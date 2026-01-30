import type { MatchDTO } from '../../api/dto';

interface MatchesListProps {
  matches: MatchDTO[];
  onEdit: (match: MatchDTO) => void;
  onDelete: (matchId: string) => void;
}

export function MatchesList({ matches, onEdit, onDelete }: MatchesListProps) {
  if (matches.length === 0) {
    return (
      <div className="p-8 bg-white rounded-lg shadow text-center text-gray-500">
        No matches. Add matches to get started.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Event/Rank
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Side A
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Side B
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Side C
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Duration (slots)
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Preferred Court
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tags
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {matches.map((match) => (
            <tr key={match.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {match.eventRank || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className={`px-2 py-1 rounded text-xs ${
                  match.matchType === 'tri' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {match.matchType === 'tri' ? 'Tri-Meet' : 'Dual'}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {match.sideA.join(', ') || '-'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {match.sideB.join(', ') || '-'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {match.sideC ? match.sideC.join(', ') : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {match.durationSlots}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {match.preferredCourt || '-'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {match.tags && match.tags.length > 0 ? match.tags.join(', ') : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => onEdit(match)}
                  className="text-blue-600 hover:text-blue-900 mr-4"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(match.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
