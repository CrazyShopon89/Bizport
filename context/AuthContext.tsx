import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, CompanySettings, DataFields } from '../types';
import { DB } from '../services/db';

interface AuthContextType {
  user: User | null;
  settings: CompanySettings;
  dataFields: DataFields;
  login: (email: string, pass: string) => Promise<boolean>;
  signup: (name: string, email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
  updateCompanySettings: (data: Partial<CompanySettings>) => void;
  updateDataFields: (data: DataFields) => void;
  users: User[]; // exposing all users for Team page
  formatCurrency: (amount: number) => string;
  refreshData: () => void; // method to trigger re-fetch of shared data
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<CompanySettings>(DB.getSettings());
  const [dataFields, setDataFields] = useState<DataFields>(DB.getDataFields());

  // Init DB and load data
  useEffect(() => {
    DB.init();
    refreshData();

    // Check for logged in user
    const storedUser = localStorage.getItem('hm_active_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      // Verify user still exists in DB
      const dbUser = DB.findUser(parsedUser.email);
      if (dbUser && dbUser.password === parsedUser.password) {
        setUser(dbUser);
        applyTheme(DB.getSettings());
      } else {
        localStorage.removeItem('hm_active_user');
      }
    } else {
       applyTheme(DB.getSettings());
    }
  }, []);

  const refreshData = () => {
    setUsers(DB.getUsers());
    setSettings(DB.getSettings());
    setDataFields(DB.getDataFields());
  };

  const applyTheme = (s: CompanySettings) => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', s.primaryColor);
    root.style.setProperty('--color-secondary', s.secondaryColor);
    root.style.setProperty('--font-primary', s.font);
  };

  const login = async (email: string, pass: string): Promise<boolean> => {
    await new Promise(r => setTimeout(r, 500)); // Fake network delay
    const foundUser = DB.findUser(email);
    
    if (foundUser && foundUser.password === pass) {
      setUser(foundUser);
      localStorage.setItem('hm_active_user', JSON.stringify(foundUser));
      return true;
    }
    return false;
  };

  const signup = async (name: string, email: string, pass: string): Promise<boolean> => {
    await new Promise(r => setTimeout(r, 500));
    if (DB.findUser(email)) return false;

    const newUser: User = {
      id: `u${Date.now()}`,
      name,
      email,
      role: 'Team Member',
      password: pass,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`
    };
    
    DB.saveUser(newUser);
    setUser(newUser);
    refreshData();
    localStorage.setItem('hm_active_user', JSON.stringify(newUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('hm_active_user');
  };

  const updateProfile = (data: Partial<User>) => {
    if (!user) return;
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
      signup, 
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