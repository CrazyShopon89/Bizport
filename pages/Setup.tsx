import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Server, CheckCircle, ArrowRight, Building2, User, Loader2, AlertCircle } from 'lucide-react';
import { DB } from '../services/db';
import { User as UserType } from '../types';
import { SecurityService } from '../services/security';
import { EmailService } from '../services/emailService';
import { useAuth } from '../context/AuthContext';

const Setup: React.FC = () => {
  const navigate = useNavigate();
  const { refreshData } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Step 1: Admin
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  
  // Step 2: Company
  const [companyName, setCompanyName] = useState('HostMaster Pro');
  const [companyEmail, setCompanyEmail] = useState('');
  
  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!SecurityService.validatePasswordStrength(adminPassword)) {
        alert("Password must be at least 8 characters long and contain uppercase, lowercase, and numbers.");
        return;
    }
    setStep(2);
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create Super Admin with Hashed Password
      const superAdmin: UserType = {
        id: 'super-admin',
        name: adminName,
        email: adminEmail,
        password: SecurityService.hashPassword(adminPassword),
        role: 'Super Admin',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=0f172a&color=fff`,
        forcePasswordChange: false,
        failedLoginAttempts: 0
      };
      
      DB.saveUser(superAdmin);

      // 2. Update Company Settings
      const currentSettings = DB.getSettings();
      DB.saveSettings({
        ...currentSettings,
        companyName: companyName,
        contactEmail: companyEmail || adminEmail
      });

      // 3. Trigger context update so AppRoutes knows an admin exists
      refreshData();

      // 4. Attempt to send Welcome Email (Optional / Best Effort)
      try {
        // Note: This might fail if SMTP isn't configured in default DB, 
        // but we catch it so it doesn't block the setup process.
        await EmailService.sendWelcomeEmail(superAdmin, adminPassword);
      } catch (emailError) {
        console.warn("Setup email skipped (SMTP not configured yet):", emailError);
      }

      // 5. Success State & Redirect
      setSuccess(true);
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error) {
      console.error(error);
      alert('Setup failed. Please try again.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center animate-fade-in-up">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
             <CheckCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Setup Complete!</h2>
          <p className="text-slate-500 mb-6">Your Super Admin account has been created. Redirecting you to login...</p>
          <div className="flex justify-center">
             <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Sidebar / Progress */}
        <div className="bg-slate-900 text-white p-8 md:w-1/3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-8">
               <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                 <Server size={18} className="text-white" />
               </div>
               <span className="font-bold text-lg">HostMaster</span>
            </div>
            
            <div className="space-y-6">
               <div className={`flex items-center gap-3 ${step >= 1 ? 'text-white' : 'text-slate-500'}`}>
                 <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-colors ${step > 1 ? 'bg-green-500 border-green-500' : step === 1 ? 'border-primary text-primary' : 'border-slate-600'}`}>
                    {step > 1 ? <CheckCircle size={16} /> : '1'}
                 </div>
                 <span className="font-medium">Admin Account</span>
               </div>
               <div className={`flex items-center gap-3 ${step >= 2 ? 'text-white' : 'text-slate-500'}`}>
                 <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-colors ${step > 2 ? 'bg-green-500 border-green-500' : step === 2 ? 'border-primary text-primary' : 'border-slate-600'}`}>
                    {step > 2 ? <CheckCircle size={16} /> : '2'}
                 </div>
                 <span className="font-medium">Company Details</span>
               </div>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-8">
            System Installation Wizard v1.0
          </div>
        </div>

        {/* Right Content */}
        <div className="p-8 md:w-2/3">
           {step === 1 ? (
             <form onSubmit={handleNext} className="h-full flex flex-col">
                <div className="mb-6">
                   <h2 className="text-2xl font-bold text-slate-900">Welcome!</h2>
                   <p className="text-slate-500 mt-1">Let's set up your Super Admin account.</p>
                </div>
                
                <div className="space-y-4 flex-1">
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                     <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text" 
                          required
                          value={adminName} 
                          onChange={e => setAdminName(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                          placeholder="Super Admin"
                        />
                     </div>
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                     <input 
                       type="email" 
                       required
                       value={adminEmail} 
                       onChange={e => setAdminEmail(e.target.value)}
                       className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                       placeholder="admin@example.com"
                     />
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                     <input 
                       type="password" 
                       required
                       minLength={8}
                       value={adminPassword} 
                       onChange={e => setAdminPassword(e.target.value)}
                       className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                       placeholder="••••••••"
                     />
                     <p className="text-xs text-slate-500 mt-1">Min 8 chars, mixed case & numbers.</p>
                   </div>
                </div>

                <div className="mt-8 flex justify-end">
                   <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors flex items-center gap-2">
                     Next Step <ArrowRight size={18} />
                   </button>
                </div>
             </form>
           ) : (
             <form onSubmit={handleFinish} className="h-full flex flex-col">
                <div className="mb-6">
                   <h2 className="text-2xl font-bold text-slate-900">Organization</h2>
                   <p className="text-slate-500 mt-1">Basic details for your dashboard.</p>
                </div>

                <div className="space-y-4 flex-1">
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                     <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text" 
                          required
                          value={companyName} 
                          onChange={e => setCompanyName(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                          placeholder="HostMaster Pro"
                        />
                     </div>
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Support Email</label>
                     <input 
                       type="email" 
                       value={companyEmail} 
                       onChange={e => setCompanyEmail(e.target.value)}
                       className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                       placeholder={adminEmail || "support@example.com"}
                     />
                     <p className="text-xs text-slate-500 mt-1">Used for outgoing invoices (optional).</p>
                   </div>
                   
                   <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-xs text-blue-800 flex items-start gap-2">
                      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Note:</strong> SMTP is not configured yet. The welcome email will be skipped. You can configure email settings in the dashboard later.
                      </div>
                   </div>
                </div>

                <div className="mt-8 flex justify-between items-center">
                   <button 
                     type="button" 
                     onClick={() => setStep(1)}
                     className="text-slate-500 hover:text-slate-800 font-medium"
                   >
                     Back
                   </button>
                   <button 
                     type="submit" 
                     disabled={loading}
                     className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-70"
                   >
                     {loading ? 'Installing...' : 'Finish Setup'}
                     {!loading && <CheckCircle size={18} />}
                   </button>
                </div>
             </form>
           )}
        </div>
      </div>
    </div>
  );
};

export default Setup;