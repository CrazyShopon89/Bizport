import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { User, CompanySettings, DataFields } from '../types';
import { DB } from '../services/db';
import { SecurityService } from '../services/security';

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
  
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Init DB and load data
  useEffect(() => {
    DB.init();
    refreshData();
    const storedUser = localStorage.getItem('hm_active_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        const dbUser = DB.findUser(parsedUser.email);
        
        // Ensure user exists and matches stored session state (simplified check)
        if (dbUser && dbUser.id === parsedUser.id) {
          setUser(dbUser);
          applyTheme(DB.getSettings());
          startSessionTimer();
        } else {
          localStorage.removeItem('hm_active_user');
        }
      } catch (e) {
        localStorage.removeItem('hm_active_user');
      }
    } else {
       applyTheme(DB.getSettings());
    }

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
    await new Promise(r => setTimeout(r, 800)); // Fake network delay for security (timing attack mitigation)
    
    const foundUser = DB.findUser(email);
    
    if (!foundUser) {
       // Return generic error for security
       return { success: false, error: 'Invalid credentials.' };
    }

    // Check Lockout
    if (foundUser.lockUntil && new Date(foundUser.lockUntil) > new Date()) {
        const waitMin = Math.ceil((new Date(foundUser.lockUntil).getTime() - new Date().getTime()) / 60000);
        return { success: false, error: `Account locked. Try again in ${waitMin} minutes.` };
    }

    // Verify Password (Check hash)
    const isValid = SecurityService.verifyPassword(pass, foundUser.password || '');
    
    // Fallback for legacy plain text users during migration/dev
    const isLegacyValid = !isValid && foundUser.password === pass;

    if (isValid || isLegacyValid) {
      // Success
      
      // Reset failed attempts
      foundUser.failedLoginAttempts = 0;
      foundUser.lockUntil = undefined;
      
      // Migrate legacy password if needed
      if (isLegacyValid) {
         foundUser.password = SecurityService.hashPassword(pass);
      }

      DB.saveUser(foundUser);
      setUser(foundUser);
      localStorage.setItem('hm_active_user', JSON.stringify(foundUser));
      startSessionTimer();
      return { success: true };
    } else {
      // Failure
      const attempts = (foundUser.failedLoginAttempts || 0) + 1;
      foundUser.failedLoginAttempts = attempts;
      
      if (attempts >= 5) {
         const lockTime = new Date();
         lockTime.setMinutes(lockTime.getMinutes() + 15); // Lock for 15 mins
         foundUser.lockUntil = lockTime.toISOString();
         foundUser.failedLoginAttempts = 0; // Reset count so they can try after lock
         DB.saveUser(foundUser);
         return { success: false, error: 'Too many failed attempts. Account locked for 15 minutes.' };
      }
      
      DB.saveUser(foundUser);
      return { success: false, error: 'Invalid credentials.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('hm_active_user');
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
  };

  const updateProfile = (data: Partial<User>) => {
    if (!user) return;
    
    // If updating password, hash it
    if (data.password) {
        data.password = SecurityService.hashPassword(data.password);
    }
    
    const updatedUser = { ...user, ...data };
    
    // Save to DB
    DB.saveUser(updatedUser);
    
    // Update State
    setUser(updatedUser);
    refreshData();
    localStorage.setItem('hm_active_user', JSON.stringify(updatedUser));
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