import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import { ReportItem, Department, ClassItem, SubjectItem, StudentItem } from '../types/index.ts';
import { 
  Download, Printer, Filter, Search, Calendar, 
  BarChart3, CheckCircle2, AlertTriangle, FileSpreadsheet
} from 'lucide-react';

export const AttendanceReports: React.FC = () => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [deptFilter, setDeptFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [studentFilter, setStudentFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  // Load initial dropdowns
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [depts, cls, subs, stus] = await Promise.all([
          api.getDepartments(),
          api.getClasses(),
          api.getSubjects(),
          api.getStudents(),
        ]);
        setDepartments(depts);
        setClasses(cls);
        setSubjects(subs);
        setStudents(stus);
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    }
    loadMetadata();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await api.getReports({
        departmentId: deptFilter !== 'all' ? Number(deptFilter) : undefined,
        classId: classFilter !== 'all' ? Number(classFilter) : undefined,
        subjectId: subjectFilter !== 'all' ? Number(subjectFilter) : undefined,
        studentId: studentFilter !== 'all' ? Number(studentFilter) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setReports(data);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [deptFilter, classFilter, subjectFilter, studentFilter, startDate, endDate]);

  const filteredReports = reports.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.fullName.toLowerCase().includes(q) ||
      r.rollNumber.toLowerCase().includes(q) ||
      r.studentNumber.toLowerCase().includes(q)
    );
  });

  // Calculate aggregates
  const totalStudents = filteredReports.length;
  const avgAttendance = totalStudents > 0 
    ? Math.round((filteredReports.reduce((acc, r) => acc + r.attendancePercentage, 0) / totalStudents) * 10) / 10 
    : 0;
  const aboveThresholdCount = filteredReports.filter(r => r.attendancePercentage >= 75).length;
  const belowThresholdCount = filteredReports.filter(r => r.attendancePercentage < 75).length;

  const handleExportCSV = () => {
    const headers = [
      'Roll Number', 'Student Name', 'Student ID', 'Department', 'Class', 'Year', 'Section',
      'Total Conducted', 'Classes Attended', 'Classes Missed', 'On Leave', 'Attendance Percentage'
    ];
    const rows = filteredReports.map(r => [
      `"${r.rollNumber}"`,
      `"${r.fullName}"`,
      `"${r.studentNumber}"`,
      `"${r.departmentName}"`,
      `"${r.className}"`,
      r.year,
      `"${r.section}"`,
      r.totalClassesConducted,
      r.classesAttended,
      r.classesMissed,
      r.classesOnLeave,
      `"${r.attendancePercentage}%"`,
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const setPresetRange = (preset: 'all' | 'week' | 'month') => {
    const today = new Date();
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'week') {
      const past = new Date(today);
      past.setDate(today.getDate() - 7);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === 'month') {
      const past = new Date(today);
      past.setDate(today.getDate() - 30);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Academic Attendance Reports
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Attendance Percentage = (Classes Attended / Total Classes Conducted) × 100
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Aggregate KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Students Filtered</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums mt-1">
            {totalStudents}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cohort Average Rate</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums mt-1">
            {avgAttendance}%
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Compliant (≥ 75%)</span>
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 font-mono tabular-nums mt-1">
            {aboveThresholdCount}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Below Threshold (&lt; 75%)</span>
          </div>
          <div className="text-2xl font-bold text-rose-700 dark:text-rose-300 font-mono tabular-nums mt-1">
            {belowThresholdCount}
          </div>
        </div>
      </div>

      {/* Filter Parameters Toolbar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Department */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Department
            </label>
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="all">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.code}</option>
              ))}
            </select>
          </div>

          {/* Class */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Class & Section
            </label>
            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="all">All Classes</option>
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
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="all">All Subjects</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.code} · {s.name}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
            />
          </div>
        </div>

        {/* Quick presets and student search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px]">Range Presets:</span>
            <button
              onClick={() => setPresetRange('all')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                !startDate && !endDate ? 'bg-slate-200 dark:bg-slate-700 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setPresetRange('week')}
              className="px-2 py-1 rounded text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setPresetRange('month')}
              className="px-2 py-1 rounded text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Last 30 Days
            </button>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search student or roll number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Roll No</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Department / Class</th>
                <th className="py-3 px-4 text-center font-mono">Conducted</th>
                <th className="py-3 px-4 text-center font-mono text-emerald-600 dark:text-emerald-400">Attended</th>
                <th className="py-3 px-4 text-center font-mono text-rose-600 dark:text-rose-400">Missed</th>
                <th className="py-3 px-4 text-center font-mono text-amber-600 dark:text-amber-400">Leave</th>
                <th className="py-3 px-4 text-right">Attendance %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Calculating attendance metrics...
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No matching attendance records found for these parameters.
                  </td>
                </tr>
              ) : (
                filteredReports.map(item => {
                  const isWarning = item.attendancePercentage < 75;
                  return (
                    <tr 
                      key={item.studentId}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isWarning ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                        {item.rollNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {item.fullName}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {item.departmentName} · {item.className}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                        {item.totalClassesConducted}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {item.classesAttended}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                        {item.classesMissed}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                        {item.classesOnLeave}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-xs tabular-nums ${
                          isWarning
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}>
                          {item.attendancePercentage.toFixed(1)}%
                        </span>
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
