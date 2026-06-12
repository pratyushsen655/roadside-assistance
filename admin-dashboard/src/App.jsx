import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import Customers from './pages/Customers';
import Mechanics from './pages/Mechanics';
import Jobs from './pages/Jobs';
import Earnings from './pages/Earnings';
import Notifications from './pages/Notifications';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

function ProtectedLayout({ children }) {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar Navigation */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        <Header />
        <main className="p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<ProtectedLayout><Home /></ProtectedLayout>} />
        <Route path="/customers" element={<ProtectedLayout><Customers /></ProtectedLayout>} />
        <Route path="/mechanics" element={<ProtectedLayout><Mechanics /></ProtectedLayout>} />
        <Route path="/jobs" element={<ProtectedLayout><Jobs /></ProtectedLayout>} />
        <Route path="/earnings" element={<ProtectedLayout><Earnings /></ProtectedLayout>} />
        <Route path="/notifications" element={<ProtectedLayout><Notifications /></ProtectedLayout>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
