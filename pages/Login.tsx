import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Server, Lock, HelpCircle, ArrowLeft, Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
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

  const { login } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  // Ensure DB is init on load
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
        // Retrieve the user to check status immediately after login
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
      
      // Simulate delay
      await new Promise(r => setTimeout(r, 1000));

      if (!user) {
        // Security: Don't reveal if user exists or not, but for this app UI we might want to be explicit
        // or just show success to prevent enumeration. Let's be explicit for admin tool.
        setResetStatus('error');
        setResetMessage('No account found with this email address.');
        setResetLoading(false);
        return;
      }

      // Generate Temp Password
      const tempPass = SecurityService.generateStrongPassword(10);
      
      // Update User in DB
      user.password = SecurityService.hashPassword(tempPass);
      user.forcePasswordChange = true;
      DB.saveUser(user);

      // Send Email
      await EmailService.sendPasswordResetEmail(user, tempPass);

      setResetStatus('success');
      setResetMessage('A temporary password has been sent to your email.');
      setResetEmail(''); // Clear field
      
    } catch (err) {
      setResetStatus('error');
      setResetMessage('Failed to process request. Check system logs.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-slate-200 z-10">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4">
             <Server className="text-white" size={24} />
          </div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-slate-900">
            Sign in to HostMaster
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500">
            Secure Admin & Team Access
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                type="email"
                required
                className="appearance-none relative block w-full px-3 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-lg focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                type="password"
                required
                className="appearance-none relative block w-full px-3 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-lg focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm flex items-start gap-2">
                <Lock size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-70 transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
          
           <div className="text-center mt-4">
              <button 
                  type="button" 
                  onClick={() => setShowForgotModal(true)}
                  className="text-sm font-medium text-primary hover:text-indigo-500 hover:underline"
              >
                Forgot your password?
              </button>
           </div>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in-up">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                   <HelpCircle size={20} className="text-primary"/>
                   Reset Password
                 </h3>
                 <button 
                   onClick={() => {
                     setShowForgotModal(false);
                     setResetStatus('idle');
                     setResetEmail('');
                   }}
                   className="text-slate-400 hover:text-slate-600"
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
                      <h4 className="text-xl font-bold text-slate-900 mb-2">Check your Email</h4>
                      <p className="text-slate-600 text-sm mb-6">{resetMessage}</p>
                      <p className="text-xs text-slate-400 mb-6">(Check the browser console for simulation)</p>
                      <button 
                        onClick={() => {
                            setShowForgotModal(false);
                            setResetStatus('idle');
                        }}
                        className="w-full py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
                      >
                        Return to Login
                      </button>
                   </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                     <p className="text-sm text-slate-600 mb-4">
                       Enter your email address below. We'll verify your account and send a temporary password to your inbox.
                     </p>
                     
                     {resetStatus === 'error' && (
                        <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2 border border-red-100">
                           <AlertCircle size={16} />
                           {resetMessage}
                        </div>
                     )}

                     <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                       <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            type="email" 
                            required
                            placeholder="admin@company.com"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                            disabled={resetLoading}
                          />
                       </div>
                     </div>

                     <div className="pt-2">
                       <button
                         type="submit"
                         disabled={resetLoading}
                         className="w-full flex items-center justify-center gap-2 py-2 bg-primary text-white font-medium rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-70"
                       >
                         {resetLoading && <Loader2 size={18} className="animate-spin" />}
                         {resetLoading ? 'Processing...' : 'Send Reset Link'}
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