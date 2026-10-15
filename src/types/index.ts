export interface User {
  id: number;
  uid: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  name: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface Department {
  id: number;
  code: string;
  name: string;
  description?: string | null;
}

export interface ClassItem {
  id: number;
  name: string;
  departmentId: number;
  year: number;
  section: string;
  academicYear: string;
}

export interface SubjectItem {
  id: number;
  code: string;
  name: string;
  departmentId: number;
  semester: number;
  credits: number;
}

export interface TeacherItem {
  id: number;
  userId?: number | null;
  teacherId: string;
  fullName: string;
  departmentId: number;
  email: string;
  phone?: string | null;
  designation?: string | null;
}

export interface StudentItem {
  id: number;
  userId?: number | null;
  studentId: string;
  fullName: string;
  rollNumber: string;
  departmentId: number;
  classId: number;
  year: number;
  section: string;
  email: string;
  contactDetails?: string | null;
  parentContact?: string | null;
  createdAt?: string | null;
}

export interface AttendanceRecord {
  id?: number;
  sessionId?: number;
  studentId: number;
  status: 'present' | 'absent' | 'on_leave';
  remarks?: string;
  markedAt?: string;
}

export interface AttendanceSession {
  id: number;
  classId: number;
  subjectId: number;
  teacherId: number;
  sessionDate: string;
  sessionTime: string;
  topic?: string;
  createdAt?: string;
}

export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalDepartments: number;
  todayPercentage: number;
  todayPresent: number;
  todayAbsent: number;
  todayOnLeave: number;
  dailyTrend: Array<{
    date: string;
    percentage: number;
    present: number;
    absent: number;
    onLeave: number;
    total: number;
  }>;
  departmentDistribution: Array<{
    name: string;
    fullName: string;
    studentCount: number;
  }>;
}

export interface ReportItem {
  studentId: number;
  rollNumber: string;
  studentNumber: string;
  fullName: string;
  email: string;
  departmentName: string;
  className: string;
  year: number;
  section: string;
  totalClassesConducted: number;
  classesAttended: number;
  classesMissed: number;
  classesOnLeave: number;
  attendancePercentage: number;
}

export interface LowAttendanceAlert {
  id: number;
  rollNumber: string;
  fullName: string;
  studentId: string;
  email: string;
  contactDetails?: string | null;
  parentContact?: string | null;
  departmentName: string;
  className: string;
  totalConducted: number;
  attended: number;
  missed: number;
  onLeave: number;
  attendancePercentage: number;
  threshold: number;
  deficit: number;
}

export interface StudentPersonalData {
  student: {
    id: number;
    studentId: string;
    rollNumber: string;
    fullName: string;
    email: string;
    year: number;
    section: string;
  };
  summary: {
    totalConducted: number;
    attended: number;
    missed: number;
    onLeave: number;
    overallPercentage: number;
  };
  subjectBreakdown: Array<{
    subjectId: number;
    code: string;
    name: string;
    conducted: number;
    attended: number;
    missed: number;
    onLeave: number;
    percentage: number;
  }>;
  dailyHistory: Array<{
    recordId: number;
    sessionId: number;
    sessionDate: string;
    sessionTime: string;
    topic: string;
    subjectId: number;
    subjectName: string;
    subjectCode: string;
    status: 'present' | 'absent' | 'on_leave';
    remarks?: string;
  }>;
  absentHistory: Array<{
    recordId: number;
    sessionId: number;
    date: string;
    time: string;
    subjectName: string;
    topic?: string;
    remarks?: string;
  }>;
  correctionRequests: Array<CorrectionRequestItem>;
}

export interface CorrectionRequestItem {
  id: number;
  studentId: number;
  sessionId: number;
  requestedStatus: 'present' | 'on_leave';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: number | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  studentName?: string;
  studentRoll?: string;
  studentEmail?: string;
}

export interface AuditLogItem {
  id: number;
  userId?: number | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  details?: string | null;
  ipAddress?: string | null;
  timestamp: string;
  userName?: string | null;
  userEmail?: string | null;
}

export interface AppSettings {
  id: number;
  institutionName: string;
  logoUrl?: string;
  lowAttendanceThreshold: number;
}
