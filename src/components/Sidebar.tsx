import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  LayoutDashboard, Users, CheckSquare, BarChart3, 
  AlertTriangle, MessageSquare, ClipboardList, Settings, 
  GraduationCap, X, CalendarCheck
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  pendingAlertsCount?: number;
  pendingCorrectionsCount?: number;
  institutionName?: string;
  logoUrl?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
  pendingAlertsCount = 0,
  pendingCorrectionsCount = 0,
  institutionName = 'Apex Institute',
  logoUrl,
}) => {
  const { user } = useAuth();
  const role = user?.role || 'student';

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'teacher', 'student'],
    },
    {
      id: 'students',
      label: 'Student Directory',
      icon: Users,
      roles: ['admin'],
    },
    {
      id: 'attendance',
      label: 'Mark Attendance',
      icon: CheckSquare,
      roles: ['admin', 'teacher'],
    },
    {
      id: 'my_attendance',
      label: 'My Attendance',
      icon: CalendarCheck,
      roles: ['student', 'admin'],
    },
    {
      id: 'reports',
      label: 'Attendance Reports',
      icon: BarChart3,
      roles: ['admin', 'teacher'],
    },
    {
      id: 'alerts',
      label: 'Low Attendance Alerts',
      icon: AlertTriangle,
      roles: ['admin', 'teacher'],
      badge: pendingAlertsCount > 0 ? pendingAlertsCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'corrections',
      label: role === 'student' ? 'Correction Requests' : 'Requests Review',
      icon: MessageSquare,
      roles: ['admin', 'teacher', 'student'],
      badge: role !== 'student' && pendingCorrectionsCount > 0 ? pendingCorrectionsCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      icon: ClipboardList,
      roles: ['admin'],
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      roles: ['admin'],
    },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(role));

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-slate-900 text-slate-200 border-r border-slate-800 z-50 flex flex-col transition-transform duration-200 ease-in-out shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-950/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-white/20">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="College Crest"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <GraduationCap className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white tracking-tight truncate leading-tight">
                {institutionName}
              </h1>
              <p className="text-[11px] text-blue-400 font-medium truncate">
                Smart Attendance
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {role === 'admin' ? 'Administration' : role === 'teacher' ? 'Faculty Portal' : 'Student Portal'}
          </div>

          {filteredNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`px-1.5 py-0.5 text-[11px] font-bold rounded-full ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/30 text-xs text-slate-400">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-slate-400">Academic Year</span>
            <span className="font-mono text-[11px] text-blue-300">2026-2027</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Cloud SQL PostgreSQL · AIS Dev
          </div>
        </div>
      </aside>
    </>
  );
};
