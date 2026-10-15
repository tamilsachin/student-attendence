import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  Sun, Moon, LogOut, User as UserIcon, Shield, 
  GraduationCap, BookOpen, Menu, Bell
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
  activeTab: string;
  institutionName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, activeTab, institutionName }) => {
  const { user, logout, theme, toggleTheme, quickLogin } = useAuth();

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Administrator', icon: Shield, style: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800' };
      case 'teacher':
        return { label: 'Faculty Member', icon: BookOpen, style: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800' };
      case 'student':
        return { label: 'Student', icon: GraduationCap, style: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800' };
      default:
        return { label: role, icon: UserIcon, style: 'text-slate-600 bg-slate-50 border-slate-200' };
    }
  };

  const badge = user ? getRoleBadge(user.role) : null;
  const RoleIcon = badge ? badge.icon : UserIcon;

  const tabTitleMap: Record<string, string> = {
    dashboard: 'Dashboard Overview',
    students: 'Student Records Directory',
    attendance: 'Class Attendance Register',
    reports: 'Attendance Analytics & Reports',
    alerts: 'Low Attendance Early Warnings',
    corrections: 'Correction Requests Queue',
    my_attendance: 'My Personal Attendance',
    audit: 'System Audit Logs',
    settings: 'Campus & Academic Settings',
  };

  return (
    <header className="h-16 px-4 md:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 sticky top-0 z-30 transition-colors">
      {/* Left zone: Mobile trigger & Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500 dark:text-slate-400 truncate">
          <span className="font-semibold text-slate-800 dark:text-slate-200 hidden sm:inline">
            {institutionName || 'Apex Institute'}
          </span>
          <span className="hidden sm:inline" aria-hidden="true">/</span>
          <span className="font-medium text-blue-600 dark:text-blue-400">
            {tabTitleMap[activeTab] || 'Attendance Portal'}
          </span>
        </div>
      </div>

      {/* Right zone: Switch Demo Role, Theme Toggle, Profile & Logout */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Quick Role Tester Pills */}
        <div className="hidden lg:flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium">
          <span className="px-2 text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
            Test Role:
          </span>
          <button
            onClick={() => quickLogin('admin')}
            className={`px-2.5 py-1 rounded transition-colors ${
              user?.role === 'admin'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => quickLogin('teacher')}
            className={`px-2.5 py-1 rounded transition-colors ${
              user?.role === 'teacher'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Teacher
          </button>
          <button
            onClick={() => quickLogin('student')}
            className={`px-2.5 py-1 rounded transition-colors ${
              user?.role === 'student'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Student
          </button>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* User Card */}
        {user && (
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs uppercase">
              {user.name ? user.name.charAt(0) : 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[130px]">
                {user.name}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 capitalize">
                <span>{user.role}</span>
              </div>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          title="Sign out"
          className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors ml-1"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
