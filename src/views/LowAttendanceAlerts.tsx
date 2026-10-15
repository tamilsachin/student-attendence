import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import { LowAttendanceAlert, AppSettings } from '../types/index.ts';
import { 
  AlertTriangle, Mail, Phone, Download, 
  Send, ShieldAlert, CheckCircle2, RefreshCw, X
} from 'lucide-react';

export const LowAttendanceAlerts: React.FC<{ settings?: AppSettings }> = ({ settings }) => {
  const [alerts, setAlerts] = useState<LowAttendanceAlert[]>([]);
  const [threshold, setThreshold] = useState<number>(settings?.lowAttendanceThreshold || 75);
  const [loading, setLoading] = useState(true);
  const [selectedStudentForAdvisory, setSelectedStudentForAdvisory] = useState<LowAttendanceAlert | null>(null);
  const [advisorySent, setAdvisorySent] = useState(false);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await api.getLowAttendanceAlerts();
      setAlerts(data.students);
      setThreshold(data.threshold);
    } catch (err) {
      console.error('Failed to load low attendance alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleExportList = () => {
    const headers = [
      'Roll Number', 'Student Name', 'Department', 'Class', 'Total Classes', 
      'Attended', 'Missed', 'Attendance Percentage', 'Required Threshold', 'Classes Needed to Recover', 'Parent Contact'
    ];
    const rows = alerts.map(a => [
      `"${a.rollNumber}"`,
      `"${a.fullName}"`,
      `"${a.departmentName}"`,
      `"${a.className}"`,
      a.totalConducted,
      a.attended,
      a.missed,
      `"${a.attendancePercentage}%"`,
      `"${a.threshold}%"`,
      a.deficit,
      `"${a.parentContact || ''}"`,
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `At_Risk_Attendance_Alerts_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendAdvisory = () => {
    setAdvisorySent(true);
    setTimeout(() => {
      setSelectedStudentForAdvisory(null);
      setAdvisorySent(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Official Disciplinary Separation Banner */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
          <strong className="font-semibold">Academic Advisory Notice:</strong> Low attendance alerts displayed below represent proactive early interventions to assist students and academic advisors. These alerts <span className="underline decoration-amber-400 font-semibold">do not constitute official disciplinary sanctions or examination debarment</span> without prior departmental review and faculty consultation.
        </div>
      </div>

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Low Attendance Early Warnings</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              {alerts.length} Students Flagged
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Current mandatory institutional attendance threshold is <strong className="font-mono text-blue-600">{threshold}%</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadAlerts}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
            title="Refresh List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportList}
            disabled={alerts.length === 0}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Generate Attention List</span>
          </button>
        </div>
      </div>

      {/* Alert Students Roster Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Roll No</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Department & Class</th>
                <th className="py-3 px-4 text-center font-mono">Attended / Total</th>
                <th className="py-3 px-4 text-center">Attendance %</th>
                <th className="py-3 px-4 text-center font-mono">Recovery Deficit</th>
                <th className="py-3 px-4">Parent / Guardian</th>
                <th className="py-3 px-4 text-right">Intervention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Scanning enrolled cohorts against attendance threshold...
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-80" />
                    <p className="font-semibold text-sm">All students currently meet the {threshold}% attendance threshold!</p>
                    <p className="text-xs text-slate-400 mt-1">No low-attendance warnings detected across any classes.</p>
                  </td>
                </tr>
              ) : (
                alerts.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                      {item.rollNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {item.fullName}
                      <div className="text-[11px] text-slate-400 font-normal">{item.email}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {item.departmentName} · {item.className}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                      {item.attended} / {item.totalConducted}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono font-bold px-2 py-0.5 rounded text-xs tabular-nums bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                        {item.attendancePercentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-amber-600 dark:text-amber-400 tabular-nums font-bold">
                      +{item.deficit} lectures
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {item.parentContact || 'No contact registered'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedStudentForAdvisory(item)}
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-md font-medium text-xs transition-colors flex items-center gap-1 ml-auto"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Advisory Notice</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advisory Notice Modal */}
      {selectedStudentForAdvisory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Issue Academic Attendance Advisory</span>
              </h3>
              <button 
                onClick={() => setSelectedStudentForAdvisory(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs mb-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg space-y-1">
                <div>Recipient: <strong>{selectedStudentForAdvisory.fullName}</strong> ({selectedStudentForAdvisory.email})</div>
                <div>Parent Contact: <strong>{selectedStudentForAdvisory.parentContact || 'Not recorded'}</strong></div>
                <div>Current Compliance: <strong className="text-rose-600">{selectedStudentForAdvisory.attendancePercentage}%</strong> (Minimum required: {threshold}%)</div>
                <div>Deficit to Recover: <strong>{selectedStudentForAdvisory.deficit} consecutive sessions</strong></div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Advisory Communication Draft:
                </label>
                <textarea
                  readOnly
                  rows={5}
                  value={`Dear ${selectedStudentForAdvisory.fullName},\n\nThis academic advisory is to notify you that your current attendance standing is ${selectedStudentForAdvisory.attendancePercentage}%, which is currently below the mandatory institutional threshold of ${threshold}%. Please attend upcoming scheduled lectures and contact your academic mentor for support.`}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedStudentForAdvisory(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendAdvisory}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                {advisorySent ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                <span>{advisorySent ? 'Advisory Dispatched' : 'Dispatch Advisory Email'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
