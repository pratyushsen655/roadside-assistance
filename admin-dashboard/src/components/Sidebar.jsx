import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

export default function Sidebar() {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: '📊' },
    { name: 'Customers', path: '/customers', icon: '👥' },
    { name: 'Mechanics', path: '/mechanics', icon: '🔧' },
    { name: 'Jobs', path: '/jobs', icon: '📋' },
    { name: 'Earnings', path: '/earnings', icon: '💰' },
    { name: 'Notifications', path: '/notifications', icon: '🔔' }
  ];

  return (
    <aside className="w-64 bg-primary text-gray-300 flex flex-col h-full shadow-2xl z-20">
      {/* Brand Header */}
      <div className="p-6 border-b border-gray-800 flex items-center gap-3">
        <span className="text-2xl">🚗🔧</span>
        <span className="font-bold text-white text-lg tracking-wider">Roadside Admin</span>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:text-white hover:bg-gray-800/50 ${
                isActive
                  ? 'bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/20'
                  : 'text-gray-400'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Admin User info & Logout */}
      <div className="p-6 border-t border-gray-800 bg-gray-900/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-accent/25 flex items-center justify-center border border-accent/30 text-white font-bold">
            A
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white text-left">System Admin</h4>
            <p className="text-xs text-gray-500">admin@roadside.com</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-900/20 text-red-400 border border-red-900/30 hover:bg-red-950/40 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
