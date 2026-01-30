import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { TournamentSetupPage } from '../pages/TournamentSetupPage';
import { RosterPage } from '../pages/RosterPage';
import { MatchesPage } from '../pages/MatchesPage';
import { SchedulePage } from '../pages/SchedulePage';

function App() {
  const [backendHealth, setBackendHealth] = useState<'healthy' | 'unhealthy' | 'checking'>('checking');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Check backend health periodically
  useEffect(() => {
    const checkHealth = async () => {
      try {
        // Use /api proxy in dev, direct URL in production
        const healthUrl = import.meta.env.DEV ? '/api/health' : 'http://localhost:8000/health';
        const response = await fetch(healthUrl);
        setBackendHealth(response.ok ? 'healthy' : 'unhealthy');
      } catch {
        setBackendHealth('unhealthy');
      }
    };
    
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const healthColor = backendHealth === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  const healthIcon = backendHealth === 'checking' ? '⏳' : (backendHealth === 'healthy' ? '✓' : '✗');

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <nav className="bg-white border-b border-gray-200">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between h-16">
                <Link to="/" className="text-xl font-semibold text-gray-900 hover:text-gray-700">
                  School Sparring Scheduler
                </Link>
                <div className="flex items-center gap-6">
                  <nav className="hidden md:flex items-center gap-4">
                    <Link to="/setup" className="text-sm text-gray-700 hover:text-gray-900">Setup</Link>
                    <Link to="/roster" className="text-sm text-gray-700 hover:text-gray-900">Players</Link>
                    <Link to="/matches" className="text-sm text-gray-700 hover:text-gray-900">Matches</Link>
                    <Link to="/schedule" className="text-sm text-gray-700 hover:text-gray-900">Schedule</Link>
                  </nav>
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="md:hidden p-2 text-gray-700 hover:text-gray-900"
                    aria-label="Toggle menu"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {mobileMenuOpen ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      )}
                    </svg>
                  </button>
                  <span className={`hidden sm:inline text-xs font-medium px-2 py-1 rounded ${healthColor}`}>
                    {healthIcon} Backend: {backendHealth === 'checking' ? 'Checking...' : backendHealth.charAt(0).toUpperCase()}
                  </span>
                  {backendHealth === 'unhealthy' && (
                    <div className="hidden sm:block ml-2">
                      <button
                        onClick={() => window.location.reload()}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Retry Connection
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {mobileMenuOpen && (
                <div className="md:hidden py-4 border-t border-gray-200">
                  <div className="flex flex-col gap-2">
                    <Link to="/setup" className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded" onClick={() => setMobileMenuOpen(false)}>Setup</Link>
                    <Link to="/roster" className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded" onClick={() => setMobileMenuOpen(false)}>Players</Link>
                    <Link to="/matches" className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded" onClick={() => setMobileMenuOpen(false)}>Matches</Link>
                    <Link to="/schedule" className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded" onClick={() => setMobileMenuOpen(false)}>Schedule</Link>
                    <div className="px-4 py-2 border-t border-gray-200 mt-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${healthColor}`}>
                        {healthIcon} Backend: {backendHealth === 'checking' ? 'Checking...' : backendHealth.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </nav>
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<TournamentSetupPage />} />
              <Route path="/setup" element={<TournamentSetupPage />} />
              <Route path="/roster" element={<RosterPage />} />
              <Route path="/matches" element={<MatchesPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;