import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus, User, Mail, Phone, Shield, Loader2, AlertCircle } from 'lucide-react';
import { User as UserType, UserRole, COUNTRY_CODES } from '../types';
import { EmailService } from '../services/emailService';
import { useAuth } from '../context/AuthContext';
import { SecurityService } from '../services/security';

interface InviteTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: Omit<UserType, 'id'>) => void;
}

const InviteTeamModal: React.FC<InviteTeamModalProps> = ({ isOpen, onClose, onSave }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Team Member' as UserRole
  });
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'error' | 'success', message: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
        setStatus({ type: 'error', message: 'Please enter a valid email address.' });
        return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // 1. Generate Secure Password
      const tempPassword = SecurityService.generateStrongPassword(12);

      // 2. Prepare User Object
      const newUser: Omit<UserType, 'id'> = {
        ...formData,
        password: SecurityService.hashPassword(tempPassword), // Store hash
        forcePasswordChange: true,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random&color=fff`,
        failedLoginAttempts: 0
      };

      // 3. Send Email via Service
      // Construct a temporary user object solely for the email service interface
      const emailUserMock = { ...newUser, id: 'temp' } as UserType;
      // Note: We send the tempPassword (plain) via email, but store the hash.
      await EmailService.sendWelcomeEmail(emailUserMock, tempPassword);

      // 4. Save User (Delegate to Parent)
      onSave(newUser);
      
      // 5. Reset and Close
      setFormData({ name: '', email: '', phone: '', role: 'Team Member' });
      onClose();

    } catch (error: any) {
      console.error(error);
      setStatus({ 
        type: 'error', 
        message: error.message || 'Failed to send invite email. Please check SMTP settings.' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Logic to split/combine phone number and code
  const splitPhone = (phone: string = '') => {
    const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
    const found = sortedCodes.find(c => phone.startsWith(c.code));
    return found 
      ? { code: found.code, number: phone.slice(found.code.length) } 
      : { code: '+1', number: phone };
  };

  const { code: phoneCode, number: phoneNumber } = splitPhone(formData.phone || '');

  const handlePhoneChange = (code: string, number: string) => {
    setFormData({ ...formData, phone: `${code}${number}` });
  };

  // Determine available roles based on current user's role
  const isSuperAdmin = user?.role === 'Super Admin';
  const isAdmin = user?.role === 'Admin';
  
  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-[1px]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
             <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
               <UserPlus size={20} className="text-primary"/>
               Invite Team Member
             </h3>
             <p className="text-xs text-slate-500">Auto-generates credentials and emails the user.</p>
          </div>
          <button onClick={onClose} disabled={loading} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-5">
          <form id="invite-team-form" onSubmit={handleSubmit} className="space-y-3">
            
            {status && (
              <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${status.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                {status.message}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none text-sm"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="email"
                  required
                  placeholder="john@company.com"
                  value={formData.email}
                  onChange={(e) => {
                      setFormData({...formData, email: e.target.value});
                      if (status?.type === 'error' && status.message.includes('email')) {
                          setStatus(null);
                      }
                  }}
                  className={`w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-primary outline-none text-sm transition-all ${
                      status?.type === 'error' && status.message.includes('email') ? 'border-red-300 focus:border-red-500' : 'border-slate-300 focus:border-primary'
                  }`}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
              <div className="flex rounded-lg border border-slate-300 overflow-hidden focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
                  <select
                    value={phoneCode}
                    onChange={(e) => handlePhoneChange(e.target.value, phoneNumber)}
                    className="bg-slate-50 border-r border-slate-300 px-2 py-2 outline-none text-slate-700 text-sm font-medium min-w-[80px]"
                    disabled={loading}
                  >
                      {COUNTRY_CODES.map(c => (
                          <option key={c.code} value={c.code}>{c.country} {c.code}</option>
                      ))}
                  </select>
                  <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="tel"
                        placeholder="123456789"
                        value={phoneNumber}
                        onChange={(e) => handlePhoneChange(phoneCode, e.target.value)}
                        className="w-full pl-9 pr-4 py-2 outline-none text-sm"
                        disabled={loading}
                      />
                  </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Role</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none bg-white appearance-none text-sm"
                  disabled={loading}
                >
                  <option value="Team Member">Team Member</option>
                  <option value="Manager">Manager</option>
                  {(isSuperAdmin || isAdmin) && <option value="Admin">Admin</option>}
                </select>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-[11px] text-blue-700 leading-snug">
               <p><strong>Note:</strong> A strong temporary password will be generated automatically. The user will receive an email with login credentials and will be forced to change their password upon first login.</p>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
          <button
            onClick={onClose}
            type="button"
            disabled={loading}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-white transition-colors disabled:opacity-50 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="invite-team-form"
            disabled={loading}
            className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-opacity-90 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-sm"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Sending Invite...' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InviteTeamModal;