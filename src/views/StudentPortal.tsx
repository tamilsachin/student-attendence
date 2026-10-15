import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import { StudentPersonalData, CorrectionRequestItem } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  CheckCircle2, XCircle, Clock, Calendar, 
  BookOpen, AlertTriangle, Send, RefreshCw, X, MessageSquare
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';

export const StudentPortal: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<StudentPersonalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Correction request modal
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [requestedStatus, setRequestedStatus] = useState<'present' | 'on_leave'>('on_leave');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadStudentData = async () => {
    setLoading(true);
    setError(null);
    try {
      const personalData = await api.getStudentPersonalAttendance();
      setData(personalData);
    } catch (err: any) {
      setError(err.message || 'Failed to load personal attendance records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, []);

  const handleOpenCorrection = (sessionId: number) => {
    setSelectedSessionId(sessionId);
    setRequestedStatus('on_leave');
    setReason('');
    setIsRequestModalOpen(true);
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId || !reason.trim()) return;

    setSubmitting(true);
    try {
      await api.submitCorrectionRequest({
        sessionId: selectedSessionId,
        requestedStatus,
        reason,
        studentId: data?.student.id,
      });
      setNotification({
        type: 'success',
        message: 'Attendance correction request submitted to faculty coordinator for review.',
      });
      setIsRequestModalOpen(false);
      loadStudentData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to submit correction request' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
        <span>{error || 'Unable to display student attendance profile.'}</span>
        <button
          onClick={loadStudentData}
          className="px-3 py-1.5 bg-rose-600 text-white rounded-md flex items-center gap-1.5 font-medium hover:bg-rose-700"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const { student, summary, subjectBreakdown, dailyHistory, absentHistory, correctionRequests } = data;
  const isWarning = summary.overallPercentage < 75;

  // Chart data for daily trend
  const chartData = [...dailyHistory].reverse().map(h => ({
    date: h.sessionDate.slice(5),
    status: h.status === 'present' ? 100 : h.status === 'on_leave' ? 50 : 0,
    topic: h.topic || h.subjectName,
    fullDate: h.sessionDate,
  }));

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-xs font-medium border ${
          notification.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Student Profile Header & Overall Gauge */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xl uppercase">
            {student.fullName.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {student.fullName}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">Roll: {student.rollNumber}</span>
              <span>·</span>
              <span>ID: {student.studentId}</span>
              <span>·</span>
              <span>Year {student.year} Sec {student.section}</span>
            </div>
          </div>
        </div>

        {/* Circular Percentage Stat Badge */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Overall Attendance
            </div>
            <div className={`text-3xl font-extrabold font-mono tabular-nums mt-0.5 ${
              isWarning ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {summary.overallPercentage.toFixed(1)}%
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {isWarning ? '⚠ Below 75% Threshold' : '✓ Good Standing'}
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Classes Conducted</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums mt-1">
            {summary.totalConducted}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Classes Attended</div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 font-mono tabular-nums mt-1">
            {summary.attended}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">Classes Missed</div>
          <div className="text-2xl font-bold text-rose-700 dark:text-rose-300 font-mono tabular-nums mt-1">
            {summary.missed}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">Approved Leave</div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 font-mono tabular-nums mt-1">
            {summary.onLeave}
          </div>
        </div>
      </div>

      {/* Subject-Wise Attendance Breakdown */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
          Subject-Wise Attendance Standing
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjectBreakdown.map(sub => {
            const isSubWarning = sub.percentage < 75;
            return (
              <div 
                key={sub.subjectId} 
                className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                      {sub.code}
                    </span>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5 line-clamp-1">
                      {sub.name}
                    </h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs tabular-nums ${
                    isSubWarning ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  }`}>
                    {sub.percentage.toFixed(1)}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isSubWarning ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, sub.percentage)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>Attended: {sub.attended}/{sub.conducted}</span>
                  <span>Missed: {sub.missed}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Absent Dates & Correction Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Absent Dates with Quick Request Button */}
        <div className="lg:col-span-6 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Absent Dates Register
              </h3>
              <p className="text-xs text-slate-500">
                Lectures missed. Submit a correction request if on authorized leave.
              </p>
            </div>
          </div>

          {absentHistory.length === 0 ? (
            <div className="py-8 text-center text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-1.5" />
              <span>Perfect record! Zero absent sessions recorded.</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
              {absentHistory.map(item => (
                <div key={item.recordId} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {item.subjectName}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-rose-600 dark:text-rose-400 font-bold">{item.date}</span>
                      <span>·</span>
                      <span>{item.time}</span>
                    </div>
                    {item.topic && (
                      <div className="text-[11px] text-slate-400 italic mt-0.5">{item.topic}</div>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenCorrection(item.sessionId)}
                    className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-md text-[11px] font-semibold shrink-0 transition-colors flex items-center gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Request Correction</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Correction Requests Status Tracker */}
        <div className="lg:col-span-6 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Correction Requests Status
            </h3>
            <p className="text-xs text-slate-500">
              Track the progress of your submitted attendance dispute requests.
            </p>
          </div>

          {correctionRequests.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              <span>No correction requests filed yet.</span>
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {correctionRequests.map(req => {
                const isPending = req.status === 'pending';
                const isApproved = req.status === 'approved';
                const isRejected = req.status === 'rejected';

                return (
                  <div key={req.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Session #{req.sessionId} Request
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isApproved ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                        isRejected ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <p className="text-slate-600 dark:text-slate-300 text-[11px] mb-1">
                      <strong>Reason:</strong> {req.reason}
                    </p>

                    {req.reviewNote && (
                      <div className="text-[11px] text-blue-600 dark:text-blue-400 italic">
                        <strong>Faculty Note:</strong> {req.reviewNote}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Daily Attendance History List */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
          Daily Attendance Ledger
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Subject</th>
                <th className="py-2.5 px-4">Topic Covered</th>
                <th className="py-2.5 px-4">Time Slot</th>
                <th className="py-2.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {dailyHistory.map(row => (
                <tr key={row.recordId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                    {row.sessionDate}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                    {row.subjectName}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                    {row.topic || 'Class Lecture'}
                  </td>
                  <td className="py-2.5 px-4 text-slate-500">
                    {row.sessionTime}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      row.status === 'present' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                      row.status === 'on_leave' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                      'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      {row.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Correction Request Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Submit Attendance Correction Request
              </h3>
              <button onClick={() => setIsRequestModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCorrection} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Requested Status
                </label>
                <select
                  value={requestedStatus}
                  onChange={e => setRequestedStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="on_leave">Approved Leave (Medical / Official)</option>
                  <option value="present">Mark as Present (Attended Class)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Justification / Document Reference *
                </label>
                <textarea
                  required
                  rows={4}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Explain why this attendance record requires correction (e.g. medical certificate submitted to office on Oct 12th, or symposium attendance)..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-xs"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
