import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Shield, Trash2, Mail, Plus, Phone, Settings as SettingsIcon, Users, Edit } from 'lucide-react';
import { DB } from '../services/db';
import { User, UserRole } from '../types';
import InviteTeamModal from '../components/InviteTeamModal';
import EditUserModal from '../components/EditUserModal';
import { SettingsForm } from './Settings';

const Admin: React.FC = () => {
  const { users, user, refreshData } = useAuth();
  const { addNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<'users' | 'settings'>('users');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Security check handled by AdminRoute in App.tsx, but good to be safe
  if (user?.role !== 'Admin' && user?.role !== 'Super Admin') return null;

  // --- USER MANAGEMENT LOGIC ---

  const handleDeleteUser = (id: string) => {
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) return;

    if (id === user?.id) {
        addNotification('Action Denied', "You cannot delete your own account.", 'system');
        return;
    }

    if (targetUser.role === 'Super Admin') {
        addNotification('Action Denied', "The Super Admin account cannot be deleted.", 'system');
        return;
    }

    if (targetUser.role === 'Admin' && user?.role !== 'Super Admin') {
        addNotification('Permission Denied', "Only the Super Admin can delete other Admin accounts.", 'system');
        return;
    }

    if (window.confirm(`Are you sure you want to remove ${targetUser.name}? This action cannot be undone.`)) {
      DB.deleteUser(id);
      refreshData();
      addNotification('Team Member Removed', `${targetUser.name} has been removed from the team.`, 'team');
    }
  };

  const handleSaveMember = (userData: Omit<User, 'id'>) => {
    if (DB.findUser(userData.email)) {
      alert('A user with this email already exists.');
      return;
    }

    const newUser: User = {
      ...userData,
      id: `u${Date.now()}`
    };

    DB.saveUser(newUser);
    refreshData();
    setIsInviteModalOpen(false);
    addNotification('New Team Member', `${userData.name} has been invited to the team as a ${userData.role}.`, 'team');
  };

  const handleUpdateUser = (updatedUser: User) => {
    // Basic validation
    if (updatedUser.role === 'Super Admin' && user?.role !== 'Super Admin') {
        addNotification('Permission Denied', 'You cannot promote users to Super Admin.', 'system');
        return;
    }
    
    DB.saveUser(updatedUser);
    refreshData();
    setEditingUser(null);
    addNotification('User Updated', `${updatedUser.name}'s details have been updated.`, 'team');
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Admin Portal</h1>
        <p className="text-slate-500">Manage users, roles, and system configuration.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-200 mb-8">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-1 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'users' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Users size={18} />
          User Management
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-1 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'settings' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <SettingsIcon size={18} />
          System Settings
        </button>
      </div>

      {/* Content */}
      <div className="animate-fade-in-up">
        {activeTab === 'users' ? (
          <div>
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-800">Team Roster</h2>
                <button 
                    onClick={() => setIsInviteModalOpen(true)}
                    className="bg-primary hover:bg-opacity-90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                    <Plus size={16} />
                    Invite User
                </button>
             </div>

             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img 
                                src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}`} 
                                alt={member.name} 
                                className="w-10 h-10 rounded-full bg-slate-200 object-cover" 
                              />
                              <div>
                                <div className="font-medium text-slate-900">{member.name}</div>
                                {member.id === user?.id && <span className="text-xs text-primary font-medium">(You)</span>}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border
                              ${member.role === 'Super Admin' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                member.role === 'Admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 
                                member.role === 'Manager' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                'bg-slate-50 text-slate-600 border-slate-200'}`}>
                              {(member.role === 'Admin' || member.role === 'Super Admin') && <Shield size={10} />}
                              {member.role}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-slate-600">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <Mail size={14} className="text-slate-400" />
                                {member.email}
                              </div>
                              {member.phone && (
                                <div className="flex items-center gap-2 text-slate-500 text-xs">
                                  <Phone size={12} className="text-slate-400" />
                                  {member.phone}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                             <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => setEditingUser(member)}
                                  className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                  title="Edit User"
                                >
                                   <Edit size={16} />
                                </button>
                                {member.role !== 'Super Admin' && member.id !== user?.id && (
                                    <button 
                                      onClick={() => handleDeleteUser(member.id)}
                                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" 
                                      title="Remove User"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                )}
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
             
             <InviteTeamModal 
               isOpen={isInviteModalOpen}
               onClose={() => setIsInviteModalOpen(false)}
               onSave={handleSaveMember}
             />
             
             {editingUser && (
                <EditUserModal 
                   user={editingUser}
                   isOpen={!!editingUser}
                   onClose={() => setEditingUser(null)}
                   onSave={handleUpdateUser}
                />
             )}
          </div>
        ) : (
          <div>
            <SettingsForm />
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;