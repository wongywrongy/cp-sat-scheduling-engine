import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { TournamentSetupPage } from '../pages/TournamentSetupPage';
import { RosterPage } from '../pages/RosterPage';
import { MatchesPage } from '../pages/MatchesPage';
import { SchedulePage } from '../pages/SchedulePage';
import { MatchControlCenterPage } from '../pages/MatchControlCenterPage';
import { PublicDisplayPage } from '../pages/PublicDisplayPage';

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to === '/setup' && location.pathname === '/');
  return (
    <Link
      to={to}
      className={`px-3 py-1 text-sm rounded transition-colors ${
        isActive
          ? 'bg-gray-100 text-gray-900 font-medium'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      {children}
    </Link>
  );
}

// Layout wrapper that conditionally shows nav
function AppLayout({ children, showNav }: { children: React.ReactNode; showNav: boolean }) {
  const [backendHealth, setBackendHealth] = useState<'healthy' | 'unhealthy' | 'checking'>('checking');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const healthUrl = import.meta.env.DEV ? '/api/health' : 'http://localhost:8000/health';
        const response = await fetch(healthUrl);
        setBackendHealth(response.ok ? 'healthy' : 'unhealthy');
      } catch {
        setBackendHealth('unhealthy');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const healthStatus = backendHealth === 'checking'
    ? { text: 'Checking...', dot: 'bg-yellow-500 animate-pulse', bg: 'bg-yellow-50 text-yellow-700' }
    : backendHealth === 'healthy'
    ? { text: 'Online', dot: 'bg-green-500', bg: 'bg-green-50 text-green-700' }
    : { text: 'Offline', dot: 'bg-red-500', bg: 'bg-red-50 text-red-700' };

  if (!showNav) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact nav bar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-center h-10 px-2 gap-1">
          {/* Centered menu */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink to="/setup">Setup</NavLink>
            <NavLink to="/roster">Players</NavLink>
            <NavLink to="/matches">Matches</NavLink>
            <NavLink to="/schedule">Schedule</NavLink>
            <Link
              to="/control"
              className="px-3 py-1 text-sm font-medium text-purple-700 hover:text-purple-900 hover:bg-purple-50 rounded transition-colors"
            >
              Control
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-gray-600 hover:text-gray-900"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Backend status - positioned right */}
          <div className="absolute right-2">
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${healthStatus.bg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${healthStatus.dot}`} />
              {healthStatus.text}
            </span>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-2 border-t border-gray-200">
            <div className="flex flex-col gap-1 px-2">
              <Link to="/setup" className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded" onClick={() => setMobileMenuOpen(false)}>Setup</Link>
              <Link to="/roster" className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded" onClick={() => setMobileMenuOpen(false)}>Players</Link>
              <Link to="/matches" className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded" onClick={() => setMobileMenuOpen(false)}>Matches</Link>
              <Link to="/schedule" className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded" onClick={() => setMobileMenuOpen(false)}>Schedule</Link>
              <Link to="/control" className="px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-50 rounded" onClick={() => setMobileMenuOpen(false)}>Control</Link>
            </div>
          </div>
        )}
      </nav>

      <main className="px-2 py-2">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public display page - no nav bar */}
          <Route path="/display" element={<PublicDisplayPage />} />

          {/* All other routes with nav bar */}
          <Route path="/*" element={
            <AppLayout showNav={true}>
              <Routes>
                <Route path="/" element={<TournamentSetupPage />} />
                <Route path="/setup" element={<TournamentSetupPage />} />
                <Route path="/roster" element={<RosterPage />} />
                <Route path="/matches" element={<MatchesPage />} />
                <Route path="/schedule" element={<SchedulePage />} />
                <Route path="/control" element={<MatchControlCenterPage />} />
                <Route path="/tracking" element={<Navigate to="/control" replace />} />
                <Route path="/live-ops" element={<Navigate to="/control" replace />} />
              </Routes>
            </AppLayout>
          } />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
