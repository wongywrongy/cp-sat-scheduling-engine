import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSchedule } from '../hooks/useSchedule';
import { useTournament } from '../hooks/useTournament';
import { ScheduleView } from '../features/schedule/ScheduleView';
import { ScheduleDiagnostics } from '../features/schedule/ScheduleDiagnostics';
import { ScheduleActions } from '../features/schedule/ScheduleActions';

export function SchedulePage() {
  const { config, loading: configLoading, error: configError } = useTournament();
  const {
    schedule,
    loading,
    error,
    view,
    setView,
    generateSchedule,
    reoptimizeSchedule,
  } = useSchedule();

  const [generating, setGenerating] = useState(false);
  const [reoptimizing, setReoptimizing] = useState(false);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      await generateSchedule();
    } finally {
      setGenerating(false);
    }
  };

  const handleReoptimize = async () => {
    try {
      setReoptimizing(true);
      await reoptimizeSchedule();
    } finally {
      setReoptimizing(false);
    }
  };

  if (configLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading tournament configuration...</div>
      </div>
    );
  }

  const needsConfig = !config || (configError && configError.includes("not found"));

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Schedule</h2>
        <ScheduleActions
          onGenerate={handleGenerate}
          onReoptimize={handleReoptimize}
          generating={generating}
          reoptimizing={reoptimizing}
          hasSchedule={!!schedule}
        />
      </div>

      {needsConfig && (
        <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          <p className="font-semibold">Tournament configuration needed</p>
          <p className="text-sm">Please configure your tournament settings in <Link to="/setup" className="underline">Tournament Setup</Link> to generate schedules.</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {schedule && config && (
        <>
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setView('timeslot')}
              className={`px-4 py-2 rounded-md ${
                view === 'timeslot'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Time-Slot Grouped (Primary)
            </button>
            <button
              onClick={() => setView('court')}
              className={`px-4 py-2 rounded-md ${
                view === 'court'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Court-Grouped (Secondary)
            </button>
          </div>

          <ScheduleView
            schedule={schedule}
            view={view}
            config={config}
          />

          <ScheduleDiagnostics schedule={schedule} />
        </>
      )}

      {!schedule && !loading && (
        <div className="p-8 bg-white rounded-lg shadow text-center text-gray-500">
          {needsConfig ? (
            <p>Configure tournament settings first, then click "Generate Schedule" to create a schedule</p>
          ) : (
            <p>Click "Generate Schedule" to create a schedule</p>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading schedule...</div>
        </div>
      )}
    </div>
  );
}
