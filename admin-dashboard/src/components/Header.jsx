import React from 'react';
import { useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Overview Dashboard';
      case '/customers':
        return 'Customer Database';
      case '/mechanics':
        return 'Mechanic Network';
      case '/jobs':
        return 'Job Management';
      case '/earnings':
        return 'Financial Center';
      case '/notifications':
        return 'Notification Control';
      default:
        return 'Admin Portal';
    }
  };

  return (
    <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-10">
      <h1 className="text-xl font-bold text-gray-800">{getPageTitle()}</h1>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-green-200">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          System Live
        </span>
      </div>
    </header>
  );
}
