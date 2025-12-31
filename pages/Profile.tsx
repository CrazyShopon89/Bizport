import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { User, Lock, Mail, Camera, AlertCircle, Upload } from 'lucide-react';
import { DB } from '../services/db';

const Profile: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { addNotification } = useNotification();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    avatar: user?.avatar || '',
    password: ''
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If user is forced to change password, scroll to security section or highlight it
  useEffect(() => {
    if (user?.forcePasswordChange) {
        // Optional: Could focus the password input
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // 1. Validate Email Uniqueness if changed
    if (formData.email !== user?.email) {
      const existingUser = DB.findUser(formData.email);
      if (existingUser && existingUser.id !== user?.id) {
        setError('This email address is already in use by another team member.');
        return;
      }
    }

    const updates: any = {
      name: formData.name,
      email: formData.email, // Now updateable
      avatar: formData.avatar,
    };

    // Only update password if field is not empty
    if (formData.password && formData.password.trim() !== '') {
      updates.password = formData.password;
      updates.forcePasswordChange = false; // Clear the flag on password change
    } else if (user?.forcePasswordChange) {
        // If they need to change it but didn't enter one
        setError("You must change your password to continue using the account securely.");
        return;
    }

    updateProfile(updates);
    addNotification('Profile Updated', 'Your profile details have been successfully saved.', 'profile');
    
    setSaved(true);
    setFormData(prev => ({ ...prev, password: '' })); // Clear password field after save
    setTimeout(() => setSaved(false), 3000);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Validate File Type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file format. Allowed: JPG, PNG, WEBP.');
      return;
    }

    // 2. Validate File Size (Max 50KB)
    const maxSize = 50 * 1024; // 50KB
    if (file.size > maxSize) {
      setError(`File size too large (${(file.size / 1024).toFixed(1)}KB). Max 50KB allowed.`);
      return;
    }

    // 3. Validate Dimensions
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const width = img.naturalWidth;
      const height = img.naturalHeight;

      if (width < 150 || height < 150) {
        setError(`Image too small (${width}x${height}). Min 150x150 px required.`);
        return;
      }

      // Convert to Base64 for storage
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setError('Failed to load image validation.');
    };

    img.src = objectUrl;
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Your Profile</h1>
      
      {user?.forcePasswordChange && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-2">
            <AlertCircle className="mt-0.5 flex-shrink-0" size={18} />
            <div>
                <p className="font-semibold">Security Alert</p>
                <p className="text-sm">You are logged in with a temporary password. You must update your password below to secure your account.</p>
            </div>
        </div>
      )}

      {error && !user?.forcePasswordChange && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-2 animate-fade-in-up">
            <AlertCircle className="mt-0.5 flex-shrink-0" size={18} />
            <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center gap-8 border-b border-slate-100 pb-8">
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
              <img 
                src={formData.avatar || `https://ui-avatars.com/api/?name=${formData.name}`} 
                alt="Profile" 
                className="w-32 h-32 rounded-full object-cover border-4 border-slate-50 shadow-sm"
              />
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                <Camera className="text-white" size={32} />
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="image/jpeg, image/png, image/webp"
                onChange={handleFileChange}
              />
            </div>
            
            <div className="flex-1 text-center sm:text-left">
               <h3 className="text-lg font-semibold text-slate-800">Profile Photo</h3>
               <p className="text-sm text-slate-500 mb-4">
                 Update your photo to recognize your account.
               </p>
               
               <div className="flex flex-col gap-2">
                 <button 
                   type="button" 
                   onClick={handleAvatarClick}
                   className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors w-fit mx-auto sm:mx-0"
                 >
                   <Upload size={16} />
                   Upload New Image
                 </button>

                 <div className="text-xs text-slate-400 mt-2 space-y-1">
                    <p>• Recommended: 300×300 px (Min: 150×150 px)</p>
                    <p>• Max size: 50KB</p>
                    <p>• Formats: JPG, PNG, WEBP</p>
                 </div>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                />
              </div>
            </div>

            <div className={`bg-yellow-50 p-4 rounded-lg border border-yellow-100 md:col-span-2 ${user?.forcePasswordChange ? 'ring-2 ring-red-500 animate-pulse-slow' : ''}`}>
              <h3 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                <Lock size={16} /> Security Settings
              </h3>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                 {user?.forcePasswordChange ? "Set New Password (Required)" : "Reset Password"}
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder={user?.forcePasswordChange ? "Enter new secure password" : "Enter new password to reset"}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                  required={!!user?.forcePasswordChange}
                />
              </div>
              {user?.forcePasswordChange && error && (
                 <p className="text-xs text-red-600 mt-1 font-medium">{error}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                 {user?.forcePasswordChange ? "You cannot proceed without updating this." : "Leave blank if you do not want to change your password."}
              </p>
            </div>
            
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <div className="w-full px-4 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500">
                {user?.role}
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
             <div className="text-sm text-green-600 font-medium h-6">
               {saved && "Profile updated successfully!"}
             </div>
            <button
              type="submit"
              className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-opacity-90 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;