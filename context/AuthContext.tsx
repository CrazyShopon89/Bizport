import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { User, CompanySettings, DataFields } from '../types';
import { DB } from '../services/db';
import { SecurityService } from '../services/security';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  settings: CompanySettings;
  dataFields: DataFields;
  login: (email: string, pass: string) => Promise<{success: boolean, error?: string}>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
  updateCompanySettings: (data: Partial<CompanySettings>) => void;
  updateDataFields: (data: DataFields) => void;
  users: User[];
  formatCurrency: (amount: number) => string;
  refreshData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<CompanySettings>(DB.getSettings());
  const [dataFields, setDataFields] = useState<DataFields>(DB.getDataFields());
  const [loading, setLoading] = useState(true); // Loading state for session check
  
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Init DB and load data
  useEffect(() => {
    DB.init();
    refreshData();
    
    // Check sessionStorage (Persists on reload, clears on close)
    const storedUser = sessionStorage.getItem('hm_active_user');
    
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        const dbUser = DB.findUser(parsedUser.email);
        
        // Ensure user exists and matches stored session state
        if (dbUser && dbUser.id === parsedUser.id) {
          setUser(dbUser);
          applyTheme(DB.getSettings());
          startSessionTimer();
        } else {
          sessionStorage.removeItem('hm_active_user');
        }
      } catch (e) {
        sessionStorage.removeItem('hm_active_user');
      }
    } else {
       applyTheme(DB.getSettings());
    }

    setLoading(false); // Session check complete

    // Events to reset session timer
    const resetTimer = () => startSessionTimer();
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
    };
  }, []);

  const startSessionTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (user) {
        inactivityTimer.current = setTimeout(() => {
            console.log("Session timed out due to inactivity");
            logout();
        }, SESSION_TIMEOUT);
    }
  };

  const refreshData = () => {
    setUsers(DB.getUsers());
    setSettings(DB.getSettings());
    setDataFields(DB.getDataFields());
  };

  const applyTheme = (s: CompanySettings) => {
    const root = document.documentElement;
    // Branding
    root.style.setProperty('--color-primary', s.primaryColor);
    root.style.setProperty('--color-primary-hover', s.primaryHoverColor || '#4338ca');
    root.style.setProperty('--color-disabled', s.disabledColor || '#94a3b8');
    root.style.setProperty('--color-secondary', s.secondaryColor);
    
    // UI/UX Customization
    root.style.setProperty('--font-primary', s.font);
    root.style.setProperty('--ui-font-scale', (s.fontScale || 1).toString());
    root.style.setProperty('--ui-radius', s.borderRadius || '0.75rem');
    root.style.setProperty('--ui-btn-border', s.buttonBorderWidth || '0px');
  };

  const login = async (email: string, pass: string): Promise<{success: boolean, error?: string}> => {
    await new Promise(r => setTimeout(r, 800)); // Fake network delay for security
    
    const foundUser = DB.findUser(email);
    
    if (!foundUser) {
       return { success: false, error: 'Invalid credentials.' };
    }

    // Check Lockout
    if (foundUser.lockUntil && new Date(foundUser.lockUntil) > new Date()) {
        const waitMin = Math.ceil((new Date(foundUser.lockUntil).getTime() - new Date().getTime()) / 60000);
        return { success: false, error: `Account locked. Try again in ${waitMin} minutes.` };
    }

    // Verify Password
    const isValid = SecurityService.verifyPassword(pass, foundUser.password || '');
    const isLegacyValid = !isValid && foundUser.password === pass;

    if (isValid || isLegacyValid) {
      // Success
      foundUser.failedLoginAttempts = 0;
      foundUser.lockUntil = undefined;
      
      if (isLegacyValid) {
         foundUser.password = SecurityService.hashPassword(pass);
      }

      DB.saveUser(foundUser);
      setUser(foundUser);
      
      // Use sessionStorage for session-only persistence (logout on browser close)
      sessionStorage.setItem('hm_active_user', JSON.stringify(foundUser));
      
      startSessionTimer();
      return { success: true };
    } else {
      // Failure
      const attempts = (foundUser.failedLoginAttempts || 0) + 1;
      foundUser.failedLoginAttempts = attempts;
      
      if (attempts >= 5) {
         const lockTime = new Date();
         lockTime.setMinutes(lockTime.getMinutes() + 15);
         foundUser.lockUntil = lockTime.toISOString();
         foundUser.failedLoginAttempts = 0;
         DB.saveUser(foundUser);
         return { success: false, error: 'Too many failed attempts. Account locked for 15 minutes.' };
      }
      
      DB.saveUser(foundUser);
      return { success: false, error: 'Invalid credentials.' };
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('hm_active_user');
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
  };

  const updateProfile = (data: Partial<User>) => {
    if (!user) return;
    
    if (data.password) {
        data.password = SecurityService.hashPassword(data.password);
    }
    
    const updatedUser = { ...user, ...data };
    
    DB.saveUser(updatedUser);
    setUser(updatedUser);
    refreshData();
    sessionStorage.setItem('hm_active_user', JSON.stringify(updatedUser));
  };

  const updateCompanySettings = (data: Partial<CompanySettings>) => {
    const newSettings = { ...settings, ...data };
    DB.saveSettings(newSettings);
    setSettings(newSettings);
    applyTheme(newSettings);
  };

  const updateDataFields = (data: DataFields) => {
    DB.saveDataFields(data);
    setDataFields(data);
  };

  const formatCurrency = (amount: number): string => {
    const formattedNumber = amount.toLocaleString();
    if (settings.currencyPosition === 'left') {
      return `${settings.currencySymbol}${formattedNumber}`;
    }
    return `${formattedNumber}${settings.currencySymbol}`;
  };

  // Prevent rendering until session check is complete to avoid redirect loop on refresh
  if (loading) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
            <Loader2 size={40} className="text-indigo-600 animate-spin" />
            <p className="mt-4 text-sm font-medium text-slate-500 animate-pulse">Initializing System...</p>
        </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      settings, 
      dataFields,
      login, 
      logout, 
      updateProfile, 
      updateCompanySettings, 
      updateDataFields,
      users, 
      formatCurrency,
      refreshData
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};