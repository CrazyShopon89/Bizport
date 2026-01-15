import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, X, Info, CreditCard, Server, User, Settings as SettingsIcon, Users } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { AppNotification } from '../types';

const NotificationCenter: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotification();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    setSelectedNotification(notification);
    setIsOpen(false); // Close dropdown when viewing detail
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'invoice': return <CreditCard size={16} className="text-blue-500" />;
      case 'payment': return <Check size={16} className="text-green-500" />;
      case 'hosting': return <Server size={16} className="text-indigo-500" />;
      case 'profile': return <User size={16} className="text-purple-500" />;
      case 'team': return <Users size={16} className="text-orange-500" />;
      case 'system': return <SettingsIcon size={16} className="text-slate-500" />;
      default: return <Info size={16} className="text-slate-500" />;
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg transition-all relative"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-fade-in-up origin-top-right">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              Notifications 
              {unreadCount > 0 && <span className="bg-primary text-white text-[11px] px-2 py-0.5 rounded-full font-bold">{unreadCount} New</span>}
            </h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs text-primary hover:underline font-medium"
              >
                Mark all read
              </button>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                <Bell size={32} className="mb-2 opacity-20" />
                <p className="text-sm">No notifications yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.map(notif => (
                  <div 
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors flex gap-3 ${!notif.isRead ? 'bg-blue-50/50' : ''}`}
                  >
                    <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${!notif.isRead ? 'bg-white shadow-sm' : 'bg-slate-100'}`}>
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <p className={`text-sm truncate pr-2 ${!notif.isRead ? 'font-semibold text-slate-800' : 'font-medium text-slate-700'}`}>
                          {notif.title}
                        </p>
                        {!notif.isRead && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5"></span>}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-1.5 leading-relaxed">{notif.message}</p>
                      <p className="text-xs text-slate-400 font-medium">{formatDate(notif.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
             <button onClick={() => setIsOpen(false)} className="text-xs text-slate-500 hover:text-slate-800 font-medium">Close</button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      {getIcon(selectedNotification.type)}
                    </div>
                    <div>
                       <h3 className="font-bold text-lg text-slate-900">{selectedNotification.title}</h3>
                       <p className="text-xs text-slate-500">{formatDate(selectedNotification.timestamp)}</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedNotification(null)} className="text-slate-400 hover:text-slate-600">
                   <X size={24} />
                 </button>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-6">
                 <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedNotification.message}</p>
              </div>

              <div className="flex justify-end gap-3">
                 <button 
                   onClick={() => {
                     deleteNotification(selectedNotification.id);
                     setSelectedNotification(null);
                   }}
                   className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                 >
                   <Trash2 size={16} />
                   Delete
                 </button>
                 <button 
                   onClick={() => setSelectedNotification(null)}
                   className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-opacity-90 transition-colors"
                 >
                   Close
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;