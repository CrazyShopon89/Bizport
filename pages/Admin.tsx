import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Shield, Trash2, Mail, Plus, Phone, Settings as SettingsIcon, Users, Edit, Activity, Play, RefreshCw } from 'lucide-react';
import { DB } from '../services/db';
import { User } from '../types';
import InviteTeamModal from '../components/InviteTeamModal';
import EditUserModal from '../components/EditUserModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { SettingsForm } from './Settings';
import { SchedulerService } from '../services/schedulerService';
import { useData } from '../context/DataContext';

const Admin: React.FC = () => {
  const { users, user, refreshData: refreshAuth } = useAuth();
  const { refreshData: refreshAppData } = useData();
  const { addNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<'users' | 'settings' | 'system'>('users');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean, userId: string | null}>({ isOpen: false, userId: null });
  const [runningAutomation, setRunningAutomation] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  useEffect(() => {
      setLastRun(SchedulerService.getLastRun());
  }, []);

  if (user?.role !== 'Admin' && user?.role !== 'Super Admin') return null;

  // --- Automation Controls ---
  const handleForceAutomation = async () => {
      setRunningAutomation(true);
      try {
          const result = await SchedulerService.runDailyTasks(true); // Force run
          refreshAppData();
          setLastRun(new Date().toDateString());
          addNotification('System', `Manual run complete. Invoices: ${result.invoices}, Emails: ${result.emails}`, 'system');
      } catch (e) {
          addNotification('Error', 'Automation failed.', 'system');
      } finally {
          setRunningAutomation(false);
      }
  };

  const handleResetAutomation = () => {
      SchedulerService.resetLastRun();
      setLastRun(null);
      addNotification('System', 'Automation timer reset. Will run on next reload.', 'system');
  };

  // --- User Logic ---
  const confirmDeleteUser = (id: string) => {
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) return;
    if (id === user?.id) { addNotification('Action Denied', "You cannot delete your own account.", 'system'); return; }
    if (targetUser.role === 'Super Admin') { addNotification('Action Denied', "The Super Admin account cannot be deleted.", 'system'); return; }
    if (targetUser.role === 'Admin' && user?.role !== 'Super Admin') { addNotification('Permission Denied', "Only the Super Admin can delete other Admin accounts.", 'system'); return; }
    setDeleteConfirmation({ isOpen: true, userId: id });
  };

  const handleExecuteDelete = () => {
    if (deleteConfirmation.userId) {
      DB.deleteUser(deleteConfirmation.userId);
      refreshAuth();
      setDeleteConfirmation({ isOpen: false, userId: null });
    }
  };

  const handleSaveMember = (userData: Omit<User, 'id'>) => {
    if (DB.findUser(userData.email)) { alert('A user with this email already exists.'); return; }
    const newUser: User = { ...userData, id: `u${Date.now()}` };
    DB.saveUser(newUser);
    refreshAuth();
    setIsInviteModalOpen(false);
  };

  const handleUpdateUser = (updatedUser: User) => {
    if (updatedUser.role === 'Super Admin' && user?.role !== 'Super Admin') { addNotification('Permission Denied', 'You cannot promote users to Super Admin.', 'system'); return; }
    DB.saveUser(updatedUser);
    refreshAuth();
    setEditingUser(null);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Admin Portal</h1>
        <p className="text-slate-500">Manage users, roles, and system configuration.</p>
      </div>

      <div className="flex items-center gap-4 border-b border-slate-200 mb-8 overflow-x-auto">
        <button onClick={() => setActiveTab('users')} className={`pb-3 px-1 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          <Users size={18} /> User Management
        </button>
        <button onClick={() => setActiveTab('settings')} className={`pb-3 px-1 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          <SettingsIcon size={18} /> System Settings
        </button>
        <button onClick={() => setActiveTab('system')} className={`pb-3 px-1 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'system' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          <Activity size={18} /> System Health & Automation
        </button>
      </div>

      <div className="animate-fade-in-up">
        {activeTab === 'users' ? (
          <div>
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-800">Team Roster</h2>
                <button onClick={() => setIsInviteModalOpen(true)} className="bg-primary hover:bg-opacity-90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"><Plus size={16} /> Invite User</button>
             </div>
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase">User</th>
                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Role</th>
                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Contact</th>
                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4"><div className="flex items-center gap-3"><img src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}`} alt={member.name} className="w-10 h-10 rounded-full bg-slate-200 object-cover" /><div><div className="font-medium text-slate-900">{member.name}</div>{member.id === user?.id && <span className="text-xs text-primary font-medium">(You)</span>}</div></div></td>
                          <td className="p-4"><span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-50 text-slate-600 border-slate-200">{member.role}</span></td>
                          <td className="p-4 text-sm text-slate-600"><div className="flex flex-col gap-1"><div>{member.email}</div></div></td>
                          <td className="p-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => setEditingUser(member)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><Edit size={16} /></button>{member.role !== 'Super Admin' && member.id !== user?.id && <button onClick={() => confirmDeleteUser(member.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>}</div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
             <InviteTeamModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} onSave={handleSaveMember} />
             {editingUser && <EditUserModal user={editingUser} isOpen={!!editingUser} onClose={() => setEditingUser(null)} onSave={handleUpdateUser} />}
             <ConfirmationModal isOpen={deleteConfirmation.isOpen} title="Remove User" message="Are you sure?" confirmLabel="Remove" isDangerous={true} onConfirm={handleExecuteDelete} onCancel={() => setDeleteConfirmation({ isOpen: false, userId: null })} />
          </div>
        ) : activeTab === 'settings' ? (
          <SettingsForm />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Activity size={20} className="text-primary"/> Automation Status</h3>
                  <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
                          <div>
                              <p className="text-sm font-medium text-slate-700">Last Successful Run</p>
                              <p className="text-xs text-slate-500">{lastRun || 'Never'}</p>
                          </div>
                          <div className={`w-3 h-3 rounded-full ${lastRun === new Date().toDateString() ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                      </div>
                      <p className="text-sm text-slate-600">The system checks for invoices and reminders once every 24 hours automatically when you login.</p>
                      
                      <div className="flex gap-3 pt-2">
                          <button 
                            onClick={handleForceAutomation} 
                            disabled={runningAutomation}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-70"
                          >
                              {runningAutomation ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} />}
                              Force Run Now
                          </button>
                          <button 
                            onClick={handleResetAutomation}
                            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium"
                          >
                              Reset Timer
                          </button>
                      </div>
                  </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4">System Info</h3>
                  <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-2 border-b border-slate-100">
                          <span className="text-slate-500">Version</span>
                          <span className="font-mono text-slate-700">1.0.0 (Production)</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-100">
                          <span className="text-slate-500">Storage</span>
                          <span className="font-mono text-slate-700">LocalStorage (Persistent)</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-100">
                          <span className="text-slate-500">Email Provider</span>
                          <span className="font-mono text-slate-700">Simulation / EmailJS</span>
                      </div>
                  </div>
              </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;