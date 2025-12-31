import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Domains from './pages/Domains';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Team from './pages/Team';
import Invoices from './pages/Invoices';
import Setup from './pages/Setup';
import NotificationCenter from './components/NotificationCenter';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Menu } from 'lucide-react';
import { DB } from './services/db';

// Define props interface for ProtectedRoute to resolve children prop error
interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Protected Route Wrapper
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Guard: If no admin exists, force setup
  if (!DB.hasAdmin()) {
    return <Navigate to="/setup" replace />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Force Password Change Guard
  if (user.forcePasswordChange && location.pathname !== '/profile') {
     return <Navigate to="/profile" replace />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 flex flex-col h-full relative transition-all duration-300 w-full md:ml-64">
        
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shrink-0 z-20">
             <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Menu size={24} />
                </button>
                {/* Placeholder for Breadcrumbs or Page Title if needed later */}
                <div className="text-sm font-medium text-slate-400 hidden sm:block">
                  {/* Space reserved for potential future breadcrumbs */}
                </div>
             </div>

             <div className="flex items-center gap-4">
                <NotificationCenter />
             </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-0 relative z-10">
            {children}
        </div>
      </main>
    </div>
  );
};

// Admin Only Route Wrapper
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    if (user?.role !== 'Admin' && user?.role !== 'Super Admin') {
        return <Navigate to="/" replace />;
    }
    return <>{children}</>;
};

const AppRoutes = () => {
  // Use useAuth hook to ensure the state is reactive. 
  // DB.hasAdmin() alone is static and might not trigger re-render on navigation if cached.
  const { users } = useAuth();
  const hasAdmin = users.some(u => u.role === 'Admin' || u.role === 'Super Admin');

  return (
    <Routes>
      <Route path="/setup" element={hasAdmin ? <Navigate to="/login" replace /> : <Setup />} />
      <Route path="/login" element={!hasAdmin ? <Navigate to="/setup" replace /> : <Login />} />
      
      {/* Protected Routes */}
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
      <Route path="/domains" element={<ProtectedRoute><Domains /></ProtectedRoute>} />
      <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
      <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      
      {/* Admin Only Route */}
      <Route path="/settings" element={
          <ProtectedRoute>
              <AdminRoute>
                  <Settings />
              </AdminRoute>
          </ProtectedRoute>
      } />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <AppRoutes />
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;