import { 
  User, Department, ClassItem, SubjectItem, TeacherItem, StudentItem, 
  DashboardStats, ReportItem, LowAttendanceAlert, StudentPersonalData, 
  CorrectionRequestItem, AuditLogItem, AppSettings 
} from '../types/index.ts';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('attendance_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || `HTTP error ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  async login(email: string, password?: string, role?: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role }),
    });
    return handleResponse<{ token: string; user: User; studentProfile: any; teacherProfile: any }>(res);
  },

  async getMe() {
    const res = await fetch('/api/auth/me', {
      headers: getAuthHeader(),
    });
    return handleResponse<{ user: User; studentProfile: any; teacherProfile: any }>(res);
  },

  // Stats
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch('/api/attendance/stats', {
      headers: getAuthHeader(),
    });
    return handleResponse<DashboardStats>(res);
  },

  // Metadata
  async getDepartments(): Promise<Department[]> {
    const res = await fetch('/api/departments', { headers: getAuthHeader() });
    return handleResponse<Department[]>(res);
  },

  async getClasses(): Promise<ClassItem[]> {
    const res = await fetch('/api/classes', { headers: getAuthHeader() });
    return handleResponse<ClassItem[]>(res);
  },

  async createClass(data: { name: string; departmentId: number; year: number; section: string; academicYear: string }) {
    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<ClassItem>(res);
  },

  async getSubjects(): Promise<SubjectItem[]> {
    const res = await fetch('/api/subjects', { headers: getAuthHeader() });
    return handleResponse<SubjectItem[]>(res);
  },

  async getTeachers(): Promise<TeacherItem[]> {
    const res = await fetch('/api/teachers', { headers: getAuthHeader() });
    return handleResponse<TeacherItem[]>(res);
  },

  // Students
  async getStudents(params?: { q?: string; departmentId?: string; classId?: string; year?: string }): Promise<StudentItem[]> {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.departmentId) query.set('departmentId', params.departmentId);
    if (params?.classId) query.set('classId', params.classId);
    if (params?.year) query.set('year', params.year);

    const res = await fetch(`/api/students?${query.toString()}`, { headers: getAuthHeader() });
    return handleResponse<StudentItem[]>(res);
  },

  async createStudent(student: Omit<StudentItem, 'id'>) {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(student),
    });
    return handleResponse<StudentItem>(res);
  },

  async updateStudent(id: number, student: Partial<StudentItem>) {
    const res = await fetch(`/api/students/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(student),
    });
    return handleResponse<StudentItem>(res);
  },

  async deleteStudent(id: number) {
    const res = await fetch(`/api/students/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return handleResponse<{ success: boolean }>(res);
  },

  async bulkImportStudents(studentsList: any[]) {
    const res = await fetch('/api/students/bulk-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ studentsList }),
    });
    return handleResponse<{ success: boolean; count: number }>(res);
  },

  // Attendance
  async getClassRoster(classId: number): Promise<StudentItem[]> {
    const res = await fetch(`/api/attendance/class-students?classId=${classId}`, {
      headers: getAuthHeader(),
    });
    return handleResponse<StudentItem[]>(res);
  },

  async saveAttendanceSession(payload: {
    classId: number;
    subjectId: number;
    teacherId?: number;
    sessionDate: string;
    sessionTime: string;
    topic?: string;
    records: Array<{ studentId: number; status: 'present' | 'absent' | 'on_leave'; remarks?: string }>;
  }) {
    const res = await fetch('/api/attendance/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse<{ success: boolean; sessionId: number }>(res);
  },

  async correctRecord(recordId: number, newStatus: 'present' | 'absent' | 'on_leave', reason: string) {
    const res = await fetch(`/api/attendance/record/${recordId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ newStatus, reason }),
    });
    return handleResponse<any>(res);
  },

  // Reports
  async getReports(filters?: { classId?: number; departmentId?: number; subjectId?: number; studentId?: number; startDate?: string; endDate?: string }): Promise<ReportItem[]> {
    const query = new URLSearchParams();
    if (filters?.classId) query.set('classId', filters.classId.toString());
    if (filters?.departmentId) query.set('departmentId', filters.departmentId.toString());
    if (filters?.subjectId) query.set('subjectId', filters.subjectId.toString());
    if (filters?.studentId) query.set('studentId', filters.studentId.toString());
    if (filters?.startDate) query.set('startDate', filters.startDate);
    if (filters?.endDate) query.set('endDate', filters.endDate);

    const res = await fetch(`/api/attendance/reports?${query.toString()}`, {
      headers: getAuthHeader(),
    });
    return handleResponse<ReportItem[]>(res);
  },

  // Low Attendance Alerts
  async getLowAttendanceAlerts(): Promise<{ threshold: number; students: LowAttendanceAlert[] }> {
    const res = await fetch('/api/alerts/low-attendance', {
      headers: getAuthHeader(),
    });
    return handleResponse<{ threshold: number; students: LowAttendanceAlert[] }>(res);
  },

  // Student Portal
  async getStudentPersonalAttendance(studentId?: number): Promise<StudentPersonalData> {
    const url = studentId ? `/api/student/my-attendance?studentId=${studentId}` : '/api/student/my-attendance';
    const res = await fetch(url, { headers: getAuthHeader() });
    return handleResponse<StudentPersonalData>(res);
  },

  async submitCorrectionRequest(data: { sessionId: number; requestedStatus: string; reason: string; studentId?: number }) {
    const res = await fetch('/api/student/correction-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<CorrectionRequestItem>(res);
  },

  async getCorrectionRequests(): Promise<CorrectionRequestItem[]> {
    const res = await fetch('/api/correction-requests', {
      headers: getAuthHeader(),
    });
    return handleResponse<CorrectionRequestItem[]>(res);
  },

  async reviewCorrectionRequest(requestId: number, status: 'approved' | 'rejected', reviewNote?: string) {
    const res = await fetch(`/api/correction-requests/${requestId}/review`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status, reviewNote }),
    });
    return handleResponse<CorrectionRequestItem>(res);
  },

  // Settings
  async getSettings(): Promise<AppSettings> {
    const res = await fetch('/api/settings', { headers: getAuthHeader() });
    return handleResponse<AppSettings>(res);
  },

  async updateSettings(settingsData: Partial<AppSettings>): Promise<AppSettings> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(settingsData),
    });
    return handleResponse<AppSettings>(res);
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLogItem[]> {
    const res = await fetch('/api/audit-logs', { headers: getAuthHeader() });
    return handleResponse<AuditLogItem[]>(res);
  },
};
