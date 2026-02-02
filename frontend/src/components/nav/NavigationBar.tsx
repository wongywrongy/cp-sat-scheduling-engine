import { Link, useLocation } from 'react-router-dom';

/**
 * NavigationBar Component
 *
 * Primary navigation for the tournament scheduler app.
 * Shows active page state and provides links to all main pages.
 */
export function NavigationBar() {
  const location = useLocation();

  const navItems = [
    { path: '/setup', label: 'Setup' },
    { path: '/roster', label: 'Roster' },
    { path: '/matches', label: 'Matches' },
    { path: '/schedule', label: 'Schedule' },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* App Title */}
          <div className="flex-shrink-0">
            <h1 className="text-xl font-bold text-gray-800">
              Tournament Scheduler
            </h1>
          </div>

          {/* Navigation Links */}
          <div className="flex space-x-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    px-4 py-2 rounded-md text-sm font-medium transition-colors
                    ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
