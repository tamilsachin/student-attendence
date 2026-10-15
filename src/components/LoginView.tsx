import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  GraduationCap, Shield, BookOpen, User, 
  Lock, Mail, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff
} from 'lucide-react';

export const LoginView: React.FC<{ institutionName?: string; logoUrl?: string }> = ({
  institutionName = 'Apex Institute of Science & Technology',
  logoUrl,
}) => {
  const { loginWithCredentials, quickLogin, loginWithGoogle, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError('Please provide your academic email address.');
      return;
    }
    try {
      await loginWithCredentials(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials or choose a sample account below.');
    }
  };

  const handleQuick = async (role: 'admin' | 'teacher' | 'student') => {
    setError(null);
    try {
      await quickLogin(role);
    } catch (err: any) {
      setError(err.message || 'Quick login failed.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center px-4 py-8 text-slate-800 dark:text-slate-100 transition-colors">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Left column: Branding & Visual presentation */}
        <div className="md:col-span-5 bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-56 h-56 rounded-full bg-white/5 pointer-events-none blur-xl" />
          
          <div>
            <div className="w-16 h-16 rounded-xl bg-white p-1.5 shadow-md mb-6 flex items-center justify-center">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Institution Crest"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <GraduationCap className="w-10 h-10 text-blue-700" />
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-2 leading-snug">
              {institutionName}
            </h1>
            <p className="text-blue-100/90 text-sm leading-relaxed mb-6">
              Smart Student Attendance Management System with Cloud SQL PostgreSQL backend, role-based workflows, and automated threshold alerts.
            </p>
          </div>

          <div className="space-y-3 pt-4 border-t border-blue-500/30 text-xs text-blue-100/90">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Real-time attendance recording with duplicate prevention</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Audit-logged mistake corrections & approval queue</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Sub-75% attendance early warning monitoring</span>
            </div>
          </div>
        </div>

        {/* Right column: Login form & Demo roles */}
        <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Account Sign In
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter your institutional credentials or select an evaluation role.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Quick Demo Role Selector */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Sample Test Accounts (Click to test role):
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuick('admin')}
                  disabled={isLoading}
                  className="p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors text-left group"
                >
                  <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 font-semibold text-xs">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Admin</span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                    Dr. Vance
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuick('teacher')}
                  disabled={isLoading}
                  className="p-2.5 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-left group"
                >
                  <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-semibold text-xs">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Teacher</span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                    Prof. Chen
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuick('student')}
                  disabled={isLoading}
                  className="p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors text-left group"
                >
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Student</span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                    Alex Morgan
                  </div>
                </button>
              </div>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-white dark:bg-slate-900 px-2 text-slate-400">
                  Or enter credentials
                </span>
              </div>
            </div>

            {/* Credential Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Academic Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g. admin@apex.edu"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="e.g. Admin@123 or password123"
                    className="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                <span>{isLoading ? 'Signing In...' : 'Sign In to Campus System'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Google OAuth Login option */}
            <div className="mt-3">
              <button
                type="button"
                onClick={loginWithGoogle}
                disabled={isLoading}
                className="w-full py-2 px-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google Workspace</span>
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            <strong>Sample Testing Credentials:</strong> Admin (<code className="text-blue-600">admin@apex.edu</code>), Teacher (<code className="text-blue-600">sarah.chen@apex.edu</code>), Student (<code className="text-blue-600">alex.morgan@apex.edu</code>). Password: <code className="text-slate-700 dark:text-slate-300">Admin@123</code> / <code className="text-slate-700 dark:text-slate-300">password123</code>.
          </div>
        </div>
      </div>
    </div>
  );
};
