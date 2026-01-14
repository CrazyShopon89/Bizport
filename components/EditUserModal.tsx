import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Shield, User, Mail, Phone, AlertCircle } from 'lucide-react';
import { User as UserType, UserRole, COUNTRY_CODES } from '../types';

interface EditUserModalProps {
  user: UserType;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedUser: UserType) => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState(user);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFormData(user);
    setError(null);
  }, [user]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
        setError("Please enter a valid email address.");
        return;
    }

    setError(null);
    onSave(formData);
    onClose();
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

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-[1px]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
             <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
               <Shield size={20} className="text-primary"/>
               Edit User
             </h3>
             <p className="text-xs text-slate-500">Update role and contact details.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6">
          <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-6">
            
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl border border-red-200 text-sm flex items-center gap-2 shadow-sm">
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => {
                        setFormData({...formData, email: e.target.value});
                        setError(null);
                    }}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-primary outline-none transition-all ${
                        error ? 'border-red-300 focus:border-red-500' : 'border-slate-300 focus:border-primary'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <div className="flex rounded-lg border border-slate-300 overflow-hidden focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
                    <select
                      value={phoneCode}
                      onChange={(e) => handlePhoneChange(e.target.value, phoneNumber)}
                      className="bg-slate-50 border-r border-slate-300 px-3 py-2 outline-none text-slate-700 text-sm font-medium min-w-[90px]"
                    >
                        {COUNTRY_CODES.map(c => (
                            <option key={c.code} value={c.code}>{c.country} {c.code}</option>
                        ))}
                    </select>
                    <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => handlePhoneChange(phoneCode, e.target.value)}
                          className="w-full pl-10 pr-4 py-2 outline-none"
                          placeholder="123456789"
                        />
                    </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none bg-white appearance-none"
                  >
                    <option value="Team Member">Team Member</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-user-form"
            className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-opacity-90 transition-colors shadow-sm flex items-center gap-2"
          >
            <Save size={18} />
            Save Changes
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EditUserModal;