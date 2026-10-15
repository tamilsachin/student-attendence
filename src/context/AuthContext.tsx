import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.ts';
import { api } from '../lib/api.ts';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { signInWithPopup } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  studentProfile: any | null;
  teacherProfile: any | null;
  token: string | null;
  isLoading: boolean;
  loginWithCredentials: (email: string, password?: string) => Promise<void>;
  quickLogin: (role: 'admin' | 'teacher' | 'student') => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [studentProfile, setStudentProfile] = useState<any | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('attendance_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('attendance_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('attendance_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    async function initSession() {
      const storedToken = localStorage.getItem('attendance_token');
      if (storedToken) {
        try {
          const res = await api.getMe();
          setUser(res.user);
          setStudentProfile(res.studentProfile);
          setTeacherProfile(res.teacherProfile);
        } catch (err) {
          console.warn('Session verification expired, prompting login:', err);
          localStorage.removeItem('attendance_token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    }
    initSession();
  }, []);

  const loginWithCredentials = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      const data = await api.login(email, password);
      localStorage.setItem('attendance_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setStudentProfile(data.studentProfile);
      setTeacherProfile(data.teacherProfile);
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (role: 'admin' | 'teacher' | 'student') => {
    setIsLoading(true);
    let sampleEmail = 'admin@apex.edu';
    if (role === 'teacher') sampleEmail = 'sarah.chen@apex.edu';
    if (role === 'student') sampleEmail = 'alex.morgan@apex.edu';

    try {
      const data = await api.login(sampleEmail, undefined, role);
      localStorage.setItem('attendance_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setStudentProfile(data.studentProfile);
      setTeacherProfile(data.teacherProfile);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken();
      localStorage.setItem('attendance_token', idToken);
      setToken(idToken);

      const me = await api.getMe();
      setUser(me.user);
      setStudentProfile(me.studentProfile);
      setTeacherProfile(me.teacherProfile);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('attendance_token');
    setToken(null);
    setUser(null);
    setStudentProfile(null);
    setTeacherProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        studentProfile,
        teacherProfile,
        token,
        isLoading,
        loginWithCredentials,
        quickLogin,
        loginWithGoogle,
        logout,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
