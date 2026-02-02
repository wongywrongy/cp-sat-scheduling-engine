import { useAppStore } from '../../store/appStore';

/**
 * RankCoverageDashboard Component
 *
 * At-a-glance rank assignment coverage grid showing:
 * - Schools × Rank Categories (MS, WS, MD, WD, XD)
 * - Color-coded cells: Green (complete), Yellow (partial), Red (empty)
 * - Coverage totals per school
 */
export function RankCoverageDashboard() {
  const { config, groups, players } = useAppStore();

  if (!config?.rankCounts || groups.length === 0) {
    return null;
  }

  const rankCategories = ['MS', 'WS', 'MD', 'WD', 'XD'];

  // Calculate coverage for each school and rank category
  const getCoverage = (schoolId: string, rankCategory: string) => {
    const expected = config.rankCounts?.[rankCategory] || 0;
    if (expected === 0) return { filled: 0, expected: 0, percent: 0 };

    // Count how many ranks of this category are assigned to players in this school
    const assignedRanks = new Set<string>();
    players
      .filter(p => p.groupId === schoolId)
      .forEach(p => {
        (p.ranks || []).forEach(rank => {
          if (rank.startsWith(rankCategory)) {
            assignedRanks.add(rank);
          }
        });
      });

    const filled = assignedRanks.size;
    const percent = (filled / expected) * 100;

    return { filled, expected, percent };
  };

  // Get cell styling based on coverage
  const getCellStyle = (percent: number, expected: number) => {
    if (expected === 0) return 'bg-gray-100 text-gray-400';
    if (percent === 100) return 'bg-green-100 text-green-800 font-semibold';
    if (percent >= 50) return 'bg-yellow-100 text-yellow-800';
    if (percent > 0) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  // Get status text based on coverage
  const getCoverageStatus = (percent: number, expected: number) => {
    if (expected === 0) return '';
    if (percent === 100) return 'Complete';
    if (percent >= 50) return 'Partial';
    return 'Empty';
  };

  // Calculate total coverage for a school
  const getSchoolTotal = (schoolId: string) => {
    let totalFilled = 0;
    let totalExpected = 0;

    rankCategories.forEach(cat => {
      const coverage = getCoverage(schoolId, cat);
      totalFilled += coverage.filled;
      totalExpected += coverage.expected;
    });

    return { filled: totalFilled, expected: totalExpected };
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-blue-200">
        <h3 className="text-sm font-semibold text-gray-800">Rank Coverage by School</h3>
        <p className="text-xs text-gray-600 mt-0.5">
          Track which ranks are assigned to players. Each rank can only be assigned once per school.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-50">
                School
              </th>
              {rankCategories.map(cat => {
                const expected = config.rankCounts?.[cat] || 0;
                return (
                  <th key={cat} className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                    <div>{cat}</div>
                    <div className="text-gray-500 font-normal normal-case mt-0.5">
                      (of {expected})
                    </div>
                  </th>
                );
              })}
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider bg-gray-100">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {groups.map(school => {
              const schoolTotal = getSchoolTotal(school.id);
              const totalPercent = schoolTotal.expected > 0
                ? (schoolTotal.filled / schoolTotal.expected) * 100
                : 0;

              return (
                <tr key={school.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white">
                    {school.name}
                  </td>
                  {rankCategories.map(cat => {
                    const coverage = getCoverage(school.id, cat);
                    const style = getCellStyle(coverage.percent, coverage.expected);
                    const status = getCoverageStatus(coverage.percent, coverage.expected);

                    return (
                      <td key={cat} className={`px-4 py-3 text-center text-sm ${style}`}>
                        {coverage.expected > 0 ? (
                          <div className="flex flex-col items-center justify-center">
                            <span className="font-semibold">{coverage.filled}/{coverage.expected}</span>
                            {status && <span className="text-xs opacity-75">{status}</span>}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className={`px-4 py-3 text-center text-sm font-semibold ${
                    totalPercent === 100 ? 'bg-green-50 text-green-800' :
                    totalPercent >= 75 ? 'bg-yellow-50 text-yellow-800' :
                    totalPercent >= 50 ? 'bg-orange-50 text-orange-800' :
                    'bg-red-50 text-red-800'
                  }`}>
                    <div className="flex flex-col items-center justify-center">
                      <span className="font-bold">{schoolTotal.filled}/{schoolTotal.expected}</span>
                      <span className="text-xs opacity-75">
                        {totalPercent === 100 ? 'Complete' : totalPercent >= 75 ? 'Good' : totalPercent >= 50 ? 'Partial' : 'Low'}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
        <div className="flex gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
            <span>Complete (100%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300"></div>
            <span>Partial (50%+)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-100 border border-red-300"></div>
            <span>Empty (&lt;50%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
