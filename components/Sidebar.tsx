import React from 'react';
import { LayoutDashboard, Server, FileText, Users, LogOut, Globe, X, Shield, Activity, Settings, Database } from 'lucide-react';
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
    { icon: <LayoutDashboard size={18} />, label: 'Dashboard', path: '/' },
    { icon: <Server size={18} />, label: 'Hosting Clients', path: '/clients' },
    { icon: <Globe size={18} />, label: 'Domain Clients', path: '/domains' },
    { icon: <FileText size={18} />, label: 'Invoices', path: '/invoices' },
    { icon: <Users size={18} />, label: 'Team', path: '/team' },
  ];

  // Admin Items
  if (isAdmin) {
      navItems.push({ icon: <Database size={18} />, label: 'Backups', path: '/backups' });
      navItems.push({ icon: <Activity size={18} />, label: 'Email Logs', path: '/logs' });
      navItems.push({ icon: <Settings size={18} />, label: 'Settings', path: '/admin' });
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile/Tablet Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm transition-opacity animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-2xl lg:shadow-none border-r border-slate-800 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/50 bg-slate-900">
          <div 
            onClick={() => handleNavigation('/')}
            className="flex items-center gap-3 cursor-pointer group w-full"
          >
            {settings.iconUrl ? (
              <img src={settings.iconUrl} alt="Icon" className="w-7 h-7 rounded object-contain group-hover:opacity-90 transition-opacity" />
            ) : (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
                <Server size={14} />
              </div>
            )}
            <span className="text-base font-bold tracking-tight text-white truncate group-hover:text-indigo-400 transition-colors">
              {settings.companyName || 'HostMaster'}
            </span>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-6 px-3">
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Main Menu</p>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group text-sm font-medium ${
                  isActive(item.path)
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20'
                    : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className={`${isActive(item.path) ? "text-white" : "text-slate-400 group-hover:text-white transition-colors"}`}>
                  {item.icon}
                </div>
                <span>{item.label}</span>
                {isActive(item.path) && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-300"></div>}
              </button>
            ))}
          </nav>
        </div>

        {/* Footer: Sign Out Button */}
        <div className="p-4 border-t border-slate-800/50 bg-slate-900/50">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-red-500/10 hover:text-red-400 text-slate-400 transition-all duration-200 group border border-slate-700/50 hover:border-red-500/20"
          >
            <LogOut size={18} className="transition-transform group-hover:-translate-x-1" />
            <span className="font-semibold text-sm">Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;