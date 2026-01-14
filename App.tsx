import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Domains from './pages/Domains';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Team from './pages/Team';
import Invoices from './pages/Invoices';
import EmailLogs from './pages/EmailLogs';
import Backups from './pages/Backups'; // Import New Page
import NotificationCenter from './components/NotificationCenter';
import ProfileDropdown from './components/ProfileDropdown';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { DataProvider } from './context/DataContext';
import { Menu } from 'lucide-react';

// Define props interface for ProtectedRoute to resolve children prop error
interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Protected Route Wrapper
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
      
      <main className="flex-1 flex flex-col h-full relative transition-all duration-300 w-full lg:ml-64">
        
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shrink-0 z-20">
             <div className="flex items-center gap-4">
                {/* Hamburger visible on screens smaller than LG (Tablet/Mobile) */}
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Menu size={24} />
                </button>
             </div>

             <div className="flex items-center gap-3 sm:gap-5">
                <NotificationCenter />
                <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
                <ProfileDropdown />
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

// Component to handle dynamic Branding updates (Favicon & Title)
const BrandingManager: React.FC = () => {
  const { settings } = useAuth();

  useEffect(() => {
    // 1. Sync Favicon
    if (settings.iconUrl) {
      const link = document.getElementById('app-favicon') as HTMLLinkElement || document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (link) {
        link.href = settings.iconUrl;
      } else {
        // Fallback if link tag doesn't exist
        const newLink = document.createElement('link');
        newLink.id = 'app-favicon';
        newLink.rel = 'icon';
        newLink.href = settings.iconUrl;
        document.head.appendChild(newLink);
      }
    }

    // 2. Sync Page Title
    if (settings.companyName) {
      document.title = `${settings.companyName} - Management Dashboard`;
    }
  }, [settings.iconUrl, settings.companyName]);

  return null;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Default Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/setup" element={<Navigate to="/login" replace />} />
      
      {/* Protected Routes */}
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
      <Route path="/domains" element={<ProtectedRoute><Domains /></ProtectedRoute>} />
      <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
      <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      
      {/* Admin Only Route */}
      <Route path="/admin" element={
          <ProtectedRoute>
              <AdminRoute>
                  <Admin />
              </AdminRoute>
          </ProtectedRoute>
      } />

      <Route path="/logs" element={
          <ProtectedRoute>
              <AdminRoute>
                  <EmailLogs />
              </AdminRoute>
          </ProtectedRoute>
      } />

      <Route path="/backups" element={
          <ProtectedRoute>
              <AdminRoute>
                  <Backups />
              </AdminRoute>
          </ProtectedRoute>
      } />
      
      <Route path="/settings" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrandingManager />
      <NotificationProvider>
        <DataProvider>
          <Router>
            <AppRoutes />
          </Router>
        </DataProvider>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;