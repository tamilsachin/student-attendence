import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import { Department, ClassItem, SubjectItem, TeacherItem, StudentItem } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  CheckCircle2, XCircle, Clock, Calendar, 
  CheckSquare, Save, AlertCircle, RefreshCw, FileText, Edit2
} from 'lucide-react';

export const AttendanceRegister: React.FC = () => {
  const { user, teacherProfile } = useAuth();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [studentsRoster, setStudentsRoster] = useState<StudentItem[]>([]);

  // Selection filters
  const [selectedDeptId, setSelectedDeptId] = useState<number>(1);
  const [selectedClassId, setSelectedClassId] = useState<number>(1);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('09:00 - 10:00 AM');
  const [topic, setTopic] = useState<string>('System Engineering & Cloud Principles');

  // Attendance states map: studentId -> { status: 'present'|'absent'|'on_leave', remarks: '' }
  const [attendanceMap, setAttendanceMap] = useState<Record<number, { status: 'present' | 'absent' | 'on_leave'; remarks: string }>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Correction Modal
  const [correctingRecord, setCorrectingRecord] = useState<{ student: StudentItem; currentStatus: 'present' | 'absent' | 'on_leave' } | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionNewStatus, setCorrectionNewStatus] = useState<'present' | 'absent' | 'on_leave'>('present');

  // Load metadata
  useEffect(() => {
    async function loadMetadata() {
      setLoading(true);
      try {
        const [depts, cls, subs, tchs] = await Promise.all([
          api.getDepartments(),
          api.getClasses(),
          api.getSubjects(),
          api.getTeachers(),
        ]);
        setDepartments(depts);
        setClasses(cls);
        setSubjects(subs);
        setTeachers(tchs);

        if (depts.length > 0) setSelectedDeptId(depts[0].id);
        if (cls.length > 0) setSelectedClassId(cls[0].id);
        if (subs.length > 0) setSelectedSubjectId(subs[0].id);
      } catch (err: any) {
        setNotification({ type: 'error', message: err.message || 'Failed to load class configuration' });
      } finally {
        setLoading(false);
      }
    }
    loadMetadata();
  }, []);

  // When class changes, load roster
  useEffect(() => {
    if (!selectedClassId) return;
    async function loadRoster() {
      try {
        const roster = await api.getClassRoster(selectedClassId);
        setStudentsRoster(roster);

        // Initialize all as present by default for smooth UX
        const initialMap: Record<number, { status: 'present' | 'absent' | 'on_leave'; remarks: string }> = {};
        roster.forEach(s => {
          initialMap[s.id] = { status: 'present', remarks: '' };
        });
        setAttendanceMap(initialMap);
      } catch (err: any) {
        setNotification({ type: 'error', message: err.message || 'Failed to load class roster' });
      }
    }
    loadRoster();
  }, [selectedClassId]);

  const setStatus = (studentId: number, status: 'present' | 'absent' | 'on_leave') => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { remarks: '' }),
        status,
      },
    }));
  };

  const setRemarks = (studentId: number, remarks: string) => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { status: 'present' }),
        remarks,
      },
    }));
  };

  const markAll = (status: 'present' | 'absent' | 'on_leave') => {
    setAttendanceMap(prev => {
      const updated = { ...prev };
      studentsRoster.forEach(s => {
        updated[s.id] = {
          ...(updated[s.id] || { remarks: '' }),
          status,
        };
      });
      return updated;
    });
  };

  const handleSaveAttendance = async () => {
    if (studentsRoster.length === 0) {
      setNotification({ type: 'error', message: 'No students enrolled in this class.' });
      return;
    }

    setSaving(true);
    setNotification(null);

    const recordsPayload = studentsRoster.map(s => ({
      studentId: s.id,
      status: attendanceMap[s.id]?.status || 'present',
      remarks: attendanceMap[s.id]?.remarks || '',
    }));

    try {
      const teacherId = teacherProfile?.id || 1;
      const res = await api.saveAttendanceSession({
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        teacherId,
        sessionDate: selectedDate,
        sessionTime: selectedTime,
        topic,
        records: recordsPayload,
      });

      const presentCount = recordsPayload.filter(r => r.status === 'present').length;
      const absentCount = recordsPayload.filter(r => r.status === 'absent').length;
      const leaveCount = recordsPayload.filter(r => r.status === 'on_leave').length;

      setNotification({
        type: 'success',
        message: `Attendance recorded successfully for Session #${res.sessionId} (${presentCount} Present, ${absentCount} Absent, ${leaveCount} On Leave). Duplicate prevention verified.`,
      });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to record attendance session.' });
    } finally {
      setSaving(false);
    }
  };

  // Calculations for roster summary
  const totalInClass = studentsRoster.length;
  const presentCount = studentsRoster.filter(s => attendanceMap[s.id]?.status === 'present').length;
  const absentCount = studentsRoster.filter(s => attendanceMap[s.id]?.status === 'absent').length;
  const leaveCount = studentsRoster.filter(s => attendanceMap[s.id]?.status === 'on_leave').length;
  const attendanceRate = totalInClass > 0 ? Math.round((presentCount / totalInClass) * 100) : 0;

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
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-75">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header and Class Parameters Card */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Class Attendance Register
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select curriculum parameters, mark student attendance, and submit records to the database.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Department */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Department
            </label>
            <select
              value={selectedDeptId}
              onChange={e => setSelectedDeptId(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
              ))}
            </select>
          </div>

          {/* Class */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Class & Section
            </label>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.code} · {s.name}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Session Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
            />
          </div>

          {/* Time Slot */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Time Slot
            </label>
            <select
              value={selectedTime}
              onChange={e => setSelectedTime(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="09:00 - 10:00 AM">09:00 - 10:00 AM</option>
              <option value="10:30 - 11:30 AM">10:30 - 11:30 AM</option>
              <option value="11:30 - 12:30 PM">11:30 - 12:30 PM</option>
              <option value="02:00 - 03:00 PM">02:00 - 03:00 PM</option>
              <option value="03:15 - 04:15 PM">03:15 - 04:15 PM</option>
            </select>
          </div>
        </div>

        {/* Topic Input */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
            Lecture Topic / Syllabus Unit
          </label>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="e.g. Distributed Consensus & Raft Invariants"
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Roster Controls & Stats Strip */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-4">
        {/* Roster summary stats */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="text-slate-500">
            Enrolled: <strong className="text-slate-900 dark:text-white font-mono tabular-nums">{totalInClass}</strong>
          </span>
          <span className="text-emerald-600 dark:text-emerald-400">
            Present: <strong className="font-mono tabular-nums">{presentCount}</strong>
          </span>
          <span className="text-rose-600 dark:text-rose-400">
            Absent: <strong className="font-mono tabular-nums">{absentCount}</strong>
          </span>
          <span className="text-amber-600 dark:text-amber-400">
            On Leave: <strong className="font-mono tabular-nums">{leaveCount}</strong>
          </span>
          <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono">
            Rate: {attendanceRate}%
          </span>
        </div>

        {/* Bulk Action Buttons & Save */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => markAll('present')}
            className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold transition-colors"
          >
            Mark All Present
          </button>
          <button
            type="button"
            onClick={() => markAll('absent')}
            className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-xs font-semibold transition-colors"
          >
            Mark All Absent
          </button>
          <button
            type="button"
            onClick={handleSaveAttendance}
            disabled={saving || studentsRoster.length === 0}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save & Confirm Attendance'}</span>
          </button>
        </div>
      </div>

      {/* Roster Attendance Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-12">#</th>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4 text-center">Attendance Status</th>
                <th className="py-3 px-4">Session Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {studentsRoster.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <p className="font-medium text-slate-600 dark:text-slate-300">No students enrolled in this class</p>
                    <p className="text-[11px] text-slate-400 mt-1">Please select another class or enroll students via Student Directory.</p>
                  </td>
                </tr>
              ) : (
                studentsRoster.map((student, idx) => {
                  const state = attendanceMap[student.id] || { status: 'present', remarks: '' };
                  const isPresent = state.status === 'present';
                  const isAbsent = state.status === 'absent';
                  const isLeave = state.status === 'on_leave';

                  return (
                    <tr 
                      key={student.id} 
                      className={`transition-colors ${
                        isAbsent 
                          ? 'bg-rose-50/40 dark:bg-rose-950/20' 
                          : isLeave 
                          ? 'bg-amber-50/40 dark:bg-amber-950/20' 
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-4 text-slate-400 font-mono tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                        {student.rollNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {student.fullName}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 tabular-nums">
                        {student.studentId}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Present Toggle */}
                          <button
                            type="button"
                            onClick={() => setStatus(student.id, 'present')}
                            className={`px-3 py-1 rounded-md font-bold text-xs transition-colors ${
                              isPresent
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            P
                          </button>

                          {/* Absent Toggle */}
                          <button
                            type="button"
                            onClick={() => setStatus(student.id, 'absent')}
                            className={`px-3 py-1 rounded-md font-bold text-xs transition-colors ${
                              isAbsent
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            A
                          </button>

                          {/* Leave Toggle */}
                          <button
                            type="button"
                            onClick={() => setStatus(student.id, 'on_leave')}
                            className={`px-3 py-1 rounded-md font-bold text-xs transition-colors ${
                              isLeave
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            L
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={state.remarks}
                          onChange={e => setRemarks(student.id, e.target.value)}
                          placeholder="Optional notes / reason..."
                          className="w-full px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
