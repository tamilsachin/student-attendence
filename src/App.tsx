/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { LoginView } from './components/LoginView.tsx';
import { AdminDashboard } from './views/AdminDashboard.tsx';
import { StudentManagement } from './views/StudentManagement.tsx';
import { AttendanceRegister } from './views/AttendanceRegister.tsx';
import { AttendanceReports } from './views/AttendanceReports.tsx';
import { LowAttendanceAlerts } from './views/LowAttendanceAlerts.tsx';
import { StudentPortal } from './views/StudentPortal.tsx';
import { CorrectionRequestsView } from './views/CorrectionRequestsView.tsx';
import { AuditLogsView } from './views/AuditLogsView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { api } from './lib/api.ts';
import { AppSettings } from './types/index.ts';

const MainLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings | undefined>(undefined);
  const [alertsCount, setAlertsCount] = useState(0);
  const [correctionsCount, setCorrectionsCount] = useState(0);

  // Sync default active tab depending on role
  useEffect(() => {
    if (user?.role === 'student') {
      setActiveTab('my_attendance');
    } else {
      setActiveTab('dashboard');
    }
  }, [user?.role]);

  // Load app settings and notification counts
  useEffect(() => {
    if (!user) return;
    async function loadAppMeta() {
      try {
        const [settingsData, alertsData, requestsData] = await Promise.all([
          api.getSettings(),
          api.getLowAttendanceAlerts().catch(() => ({ students: [] })),
          api.getCorrectionRequests().catch(() => []),
        ]);
        setSettings(settingsData);
        setAlertsCount(alertsData.students.length);
        setCorrectionsCount(requestsData.filter(r => r.status === 'pending').length);
      } catch (err) {
        console.warn('Could not load global app metadata:', err);
      }
    }
    loadAppMeta();
  }, [user, activeTab]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-500">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-medium">Connecting to campus attendance system...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginView
        institutionName={settings?.institutionName}
        logoUrl={settings?.logoUrl || '/src/assets/images/institution_crest_logo_1792059964094.jpg'}
      />
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return user.role === 'student' ? (
          <StudentPortal />
        ) : (
          <AdminDashboard onNavigate={setActiveTab} settings={settings} />
        );
      case 'students':
        return <StudentManagement />;
      case 'attendance':
        return <AttendanceRegister />;
      case 'reports':
        return <AttendanceReports />;
      case 'alerts':
        return <LowAttendanceAlerts settings={settings} />;
      case 'corrections':
        return user.role === 'student' ? <StudentPortal /> : <CorrectionRequestsView />;
      case 'my_attendance':
        return <StudentPortal />;
      case 'audit':
        return <AuditLogsView />;
      case 'settings':
        return (
          <SettingsView
            currentSettings={settings}
            onSettingsUpdated={updated => setSettings(updated)}
          />
        );
      default:
        return <AdminDashboard onNavigate={setActiveTab} settings={settings} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex text-slate-900 dark:text-slate-100 font-sans transition-colors">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        pendingAlertsCount={alertsCount}
        pendingCorrectionsCount={correctionsCount}
        institutionName={settings?.institutionName}
        logoUrl={settings?.logoUrl || '/src/assets/images/institution_crest_logo_1792059964094.jpg'}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          activeTab={activeTab}
          institutionName={settings?.institutionName}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
