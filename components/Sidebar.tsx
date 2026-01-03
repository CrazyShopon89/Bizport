import React from 'react';
import { LayoutDashboard, Server, FileText, Users, Settings, LogOut, Globe, X, Shield } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, settings } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const isAdmin = user?.role === 'Admin' || user?.role === 'Super Admin';

  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/' },
    { icon: <Server size={20} />, label: 'Hosting Clients', path: '/clients' },
    { icon: <Globe size={20} />, label: 'Domain Clients', path: '/domains' },
    { icon: <FileText size={20} />, label: 'Invoices', path: '/invoices' },
    { icon: <Users size={20} />, label: 'Team', path: '/team' },
  ];

  if (isAdmin) {
      navItems.push({ icon: <Shield size={20} />, label: 'Admin Panel', path: '/admin' });
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    // Close sidebar on navigation if screen is smaller than Large (Laptop/Tablet Landscape)
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile/Tablet Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-20 lg:hidden backdrop-blur-[2px] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.iconUrl ? (
              <img src={settings.iconUrl} alt="Icon" className="w-8 h-8 rounded object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary text-white shadow-lg shadow-primary/30">
                <Server size={18} />
              </div>
            )}
            <span className="text-lg font-bold tracking-tight truncate max-w-[140px] text-slate-100">{settings.companyName}</span>
          </div>
          {/* Close button only visible on mobile/tablet */}
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition-colors">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive(item.path)
                  ? 'bg-primary text-white shadow-lg shadow-primary/20 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <div className={`transition-transform duration-200 ${isActive(item.path) ? "text-white scale-110" : "group-hover:scale-110"}`}>
                {item.icon}
              </div>
              <span className="tracking-wide text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User Mini Profile */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div 
            onClick={() => handleNavigation('/profile')}
            className="flex items-center gap-3 mb-4 p-2 rounded-xl hover:bg-slate-800 cursor-pointer transition-colors group"
          >
            <img 
              src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}`} 
              alt="Profile" 
              className="w-10 h-10 rounded-full border-2 border-slate-700 group-hover:border-primary transition-colors"
            />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-slate-200 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate group-hover:text-slate-400 transition-colors">{user?.role}</p>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-red-500/10 hover:border-red-500/20 border border-transparent rounded-lg transition-all text-sm font-medium"
          >
            <LogOut size={18} className="group-hover:text-red-400 transition-colors" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;