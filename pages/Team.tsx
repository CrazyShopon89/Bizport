import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Shield, Trash2, Mail, Plus, Phone } from 'lucide-react';
import { DB } from '../services/db';
import { User } from '../types';
import InviteTeamModal from '../components/InviteTeamModal';

const Team: React.FC = () => {
  const { users, user, refreshData } = useAuth();
  const { addNotification } = useNotification();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const canManage = user?.role === 'Admin' || user?.role === 'Manager';

  const handleDeleteUser = (id: string) => {
    if (window.confirm('Are you sure you want to remove this team member?')) {
      const targetUser = users.find(u => u.id === id);
      DB.deleteUser(id);
      refreshData();
      if (targetUser) {
        addNotification('Team Member Removed', `${targetUser.name} has been removed from the team.`, 'team');
      }
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

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Members</h1>
          <p className="text-slate-500">View your organization's team structure.</p>
        </div>
        {canManage && (
          <button 
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-primary hover:bg-opacity-90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            Invite Member
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Member</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                {canManage && <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50 transition-colors">
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
                      ${member.role === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                        member.role === 'Manager' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                        'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      {member.role === 'Admin' && <Shield size={10} />}
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
                  {canManage && (
                    <td className="p-4 text-right">
                      {member.role !== 'Admin' && member.id !== user?.id && (
                         <button 
                           onClick={() => handleDeleteUser(member.id)}
                           className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" 
                           title="Remove User"
                         >
                           <Trash2 size={16} />
                         </button>
                      )}
                    </td>
                  )}
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
    </div>
  );
};

export default Team;