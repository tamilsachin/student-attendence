import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import { AppSettings } from '../types/index.ts';
import { 
  Building2, Image, Shield, Save, 
  CheckCircle2, AlertCircle, RefreshCw, Sliders
} from 'lucide-react';

export const SettingsView: React.FC<{
  currentSettings?: AppSettings;
  onSettingsUpdated: (updated: AppSettings) => void;
}> = ({ currentSettings, onSettingsUpdated }) => {
  const [institutionName, setInstitutionName] = useState(
    currentSettings?.institutionName || 'Apex Institute of Science & Technology'
  );
  const [logoUrl, setLogoUrl] = useState(
    currentSettings?.logoUrl || '/src/assets/images/institution_crest_logo_1792059964094.jpg'
  );
  const [threshold, setThreshold] = useState<number>(
    currentSettings?.lowAttendanceThreshold || 75
  );
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (currentSettings) {
      setInstitutionName(currentSettings.institutionName);
      setLogoUrl(currentSettings.logoUrl || '/src/assets/images/institution_crest_logo_1792059964094.jpg');
      setThreshold(currentSettings.lowAttendanceThreshold);
    }
  }, [currentSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotification(null);
    try {
      const updated = await api.updateSettings({
        institutionName,
        logoUrl,
        lowAttendanceThreshold: Number(threshold),
      });
      onSettingsUpdated(updated);
      setNotification({
        type: 'success',
        message: 'Settings updated successfully. Live institution name and threshold applied.',
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to save settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Notifications */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-xs font-medium border ${
          notification.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Institution & Academic Configuration
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Customize campus identity, seal emblem, and early warning attendance thresholds.
        </p>
      </div>

      <form onSubmit={handleSave} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-5 text-xs">
        {/* Institution Name */}
        <div>
          <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
            College / School Name *
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              required
              value={institutionName}
              onChange={e => setInstitutionName(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Institution Crest Logo Preview & Input */}
        <div>
          <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
            Institutional Crest / Logo Asset Path
          </label>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Crest Preview"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Image className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                placeholder="/src/assets/images/... or URL"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-[11px]"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Collegiate crest generated for campus branding.
              </p>
            </div>
          </div>
        </div>

        {/* Low Attendance Threshold */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="block font-semibold text-slate-800 dark:text-slate-200">
                Minimum Attendance Threshold (%)
              </label>
              <p className="text-[11px] text-slate-400">
                Students below this percentage will be automatically flagged for academic warning notices.
              </p>
            </div>
            <span className="font-mono text-base font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-lg">
              {threshold}%
            </span>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="range"
              min="50"
              max="95"
              step="1"
              value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
            <span>50% (Permissive)</span>
            <span>75% (Standard)</span>
            <span>85% (Strict)</span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Apply & Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
