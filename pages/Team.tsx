import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Mail, Phone } from 'lucide-react';

const Team: React.FC = () => {
  const { users, user } = useAuth();

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Members</h1>
          <p className="text-slate-500">View your organization's team structure.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Member</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Team;