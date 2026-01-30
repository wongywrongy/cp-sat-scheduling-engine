import { SchedulerPage } from './pages/SchedulerPage';
import './App.css';

function App() {
  try {
    return <SchedulerPage />;
  } catch (error) {
    console.error('App error:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading App</h1>
          <p className="text-gray-700">{String(error)}</p>
        </div>
      </div>
    );
  }
}

export default App;
