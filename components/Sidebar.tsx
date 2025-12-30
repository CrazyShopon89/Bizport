import React from 'react';
import { LayoutDashboard, Server, FileText, Users, Settings, LogOut, Globe, X } from 'lucide-react';
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

  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/' },
    { icon: <Server size={20} />, label: 'Hosting Clients', path: '/clients' },
    { icon: <Globe size={20} />, label: 'Domain Clients', path: '/domains' },
    { icon: <FileText size={20} />, label: 'Invoices', path: '/invoices' },
    { icon: <Users size={20} />, label: 'Team', path: '/team' },
    { icon: <Settings size={20} />, label: 'Settings', path: '/settings' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 shadow-xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.iconUrl ? (
              <img src={settings.iconUrl} alt="Icon" className="w-8 h-8 rounded object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary text-white">
                <Server size={18} />
              </div>
            )}
            <span className="text-xl font-bold tracking-tight truncate max-w-[140px]">{settings.companyName}</span>
          </div>
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-primary text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className={isActive(item.path) ? "text-white" : ""}>{item.icon}</div>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User Mini Profile */}
        <div className="p-4 border-t border-slate-800 bg-slate-900">
          <div 
            onClick={() => handleNavigation('/profile')}
            className="flex items-center gap-3 mb-4 p-2 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <img 
              src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}`} 
              alt="Profile" 
              className="w-10 h-10 rounded-full border border-slate-600"
            />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.role}</p>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;