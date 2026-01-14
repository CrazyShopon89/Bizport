import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Server, Lock, HelpCircle, ArrowLeft, Mail, CheckCircle, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import { DB } from '../services/db';
import { useNotification } from '../context/NotificationContext';
import { SecurityService } from '../services/security';
import { EmailService } from '../services/emailService';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetStatus, setResetStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [resetMessage, setResetMessage] = useState('');

  const { login, settings } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    DB.init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        const loggedInUser = DB.findUser(email);
        if (loggedInUser && loggedInUser.forcePasswordChange) {
            addNotification('Security Alert', 'You are using a temporary password. Please change it immediately.', 'system');
            navigate('/profile');
        } else {
            navigate('/');
        }
      } else {
        setError(result.error || 'Invalid email or password');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetStatus('idle');
    try {
      const user = DB.findUser(resetEmail);
      await new Promise(r => setTimeout(r, 1000));
      if (!user) {
        setResetStatus('error');
        setResetMessage('No account found with this email address.');
        setResetLoading(false);
        return;
      }
      const tempPass = SecurityService.generateStrongPassword(10);
      user.password = SecurityService.hashPassword(tempPass);
      user.forcePasswordChange = true;
      DB.saveUser(user);
      await EmailService.sendPasswordResetEmail(user, tempPass);
      setResetStatus('success');
      setResetMessage('A temporary password has been sent to your email.');
      setResetEmail('');
    } catch (err) {
      setResetStatus('error');
      setResetMessage('Failed to process request.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-600 to-slate-50 opacity-10 pointer-events-none"></div>
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-md p-4 relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          
          <div className="p-8 sm:p-10">
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mb-6">
                 {settings.iconUrl ? (
                    <img src={settings.iconUrl} alt="Logo" className="w-10 h-10 object-contain" />
                 ) : (
                    <Server className="text-white" size={32} />
                 )}
              </div>
              <h2 className="text-2xl font-bold text-slate-900 text-center tracking-tight">
                {settings.companyName || 'HostMaster Pro'}
              </h2>
              <p className="text-slate-500 text-sm mt-2 text-center font-medium">
                Sign in to your management dashboard
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Work Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                      type="email"
                      required
                      className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5 ml-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Password</label>
                    <button 
                        type="button" 
                        onClick={() => setShowForgotModal(true)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                      type="password"
                      required
                      className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-start gap-2 animate-fade-in-up">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span className="font-medium">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:shadow-none transition-all transform active:scale-[0.98]"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <span className="flex items-center gap-2">Sign In <ChevronRight size={16}/></span>}
              </button>
            </form>
          </div>
          
          <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex justify-center">
             <p className="text-xs text-slate-400 font-medium">Protected by Enterprise Security</p>
          </div>
        </div>
        
        <p className="text-center text-xs text-slate-400 mt-8">
          &copy; {new Date().getFullYear()} {settings.companyName}. All rights reserved.
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                   <HelpCircle size={20} className="text-indigo-600"/>
                   Reset Password
                 </h3>
                 <button 
                   onClick={() => {
                     setShowForgotModal(false);
                     setResetStatus('idle');
                     setResetEmail('');
                   }}
                   className="text-slate-400 hover:text-slate-600 transition-colors"
                 >
                   <ArrowLeft size={20} />
                 </button>
              </div>

              <div className="p-6">
                {resetStatus === 'success' ? (
                   <div className="text-center py-4">
                      <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={32} />
                      </div>
                      <h4 className="text-xl font-bold text-slate-900 mb-2">Check your inbox</h4>
                      <p className="text-slate-600 text-sm mb-6 leading-relaxed">{resetMessage}</p>
                      <button 
                        onClick={() => {
                            setShowForgotModal(false);
                            setResetStatus('idle');
                        }}
                        className="w-full py-2.5 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors"
                      >
                        Back to Login
                      </button>
                   </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                     <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                       Enter your email address and we'll send you a temporary password to regain access to your account.
                     </p>
                     
                     {resetStatus === 'error' && (
                        <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2 border border-red-100">
                           <AlertCircle size={16} />
                           {resetMessage}
                        </div>
                     )}

                     <div>
                       <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                       <input 
                            type="email" 
                            required
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                            placeholder="name@company.com"
                            disabled={resetLoading}
                          />
                     </div>

                     <div className="pt-2">
                       <button
                         type="submit"
                         disabled={resetLoading}
                         className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-70 shadow-md shadow-indigo-200"
                       >
                         {resetLoading && <Loader2 size={18} className="animate-spin" />}
                         {resetLoading ? 'Sending...' : 'Send Reset Link'}
                       </button>
                     </div>
                  </form>
                )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Login;