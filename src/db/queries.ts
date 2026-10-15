import { db } from './index.ts';
import { 
  users, departments, classes, subjects, teachers, students,
  classEnrollments, attendanceSessions, attendanceRecords,
  correctionRequests, auditLogs, settings
} from './schema.ts';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';

// --- SETTINGS ---
export async function getSettings() {
  try {
    const list = await db.select().from(settings).limit(1);
    if (list.length === 0) {
      const defaultSettings = await db.insert(settings).values({
        institutionName: 'Apex Institute of Science & Technology',
        lowAttendanceThreshold: 75,
      }).returning();
      return defaultSettings[0];
    }
    return list[0];
  } catch (error) {
    console.error('getSettings query error:', error);
    throw new Error('Failed to retrieve settings', { cause: error });
  }
}

export async function updateSettings(data: { institutionName?: string; logoUrl?: string; lowAttendanceThreshold?: number }) {
  try {
    const current = await getSettings();
    const updated = await db.update(settings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(settings.id, current.id))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('updateSettings error:', error);
    throw new Error('Failed to update settings', { cause: error });
  }
}

// --- DEPARTMENTS & CLASSES & SUBJECTS ---
export async function getDepartments() {
  try {
    return await db.select().from(departments).orderBy(departments.name);
  } catch (error) {
    console.error('getDepartments error:', error);
    throw new Error('Failed to retrieve departments', { cause: error });
  }
}

export async function getClasses() {
  try {
    return await db.select({
      id: classes.id,
      name: classes.name,
      departmentId: classes.departmentId,
      year: classes.year,
      section: classes.section,
      academicYear: classes.academicYear,
    }).from(classes).orderBy(classes.name);
  } catch (error) {
    console.error('getClasses error:', error);
    throw new Error('Failed to retrieve classes', { cause: error });
  }
}

export async function getSubjects() {
  try {
    return await db.select().from(subjects).orderBy(subjects.code);
  } catch (error) {
    console.error('getSubjects error:', error);
    throw new Error('Failed to retrieve subjects', { cause: error });
  }
}

export async function getTeachers() {
  try {
    return await db.select().from(teachers).orderBy(teachers.fullName);
  } catch (error) {
    console.error('getTeachers error:', error);
    throw new Error('Failed to retrieve teachers', { cause: error });
  }
}

// --- STUDENTS ---
export async function getStudentsList() {
  try {
    const rows = await db.select({
      id: students.id,
      userId: students.userId,
      studentId: students.studentId,
      fullName: students.fullName,
      rollNumber: students.rollNumber,
      departmentId: students.departmentId,
      classId: students.classId,
      year: students.year,
      section: students.section,
      email: students.email,
      contactDetails: students.contactDetails,
      parentContact: students.parentContact,
      createdAt: students.createdAt,
    }).from(students).orderBy(students.rollNumber);
    return rows;
  } catch (error) {
    console.error('getStudentsList error:', error);
    throw new Error('Failed to retrieve students', { cause: error });
  }
}

export async function createStudent(data: {
  studentId: string;
  fullName: string;
  rollNumber: string;
  departmentId: number;
  classId: number;
  year: number;
  section: string;
  email: string;
  contactDetails?: string;
  parentContact?: string;
}) {
  try {
    // 1. Check if user account exists or create a student user account
    let userRecord = await db.select().from(users).where(eq(users.email, data.email));
    let userId: number;
    if (userRecord.length === 0) {
      const newUser = await db.insert(users).values({
        uid: `stu_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        email: data.email,
        name: data.fullName,
        role: 'student',
        phone: data.contactDetails || '',
      }).returning();
      userId = newUser[0].id;
    } else {
      userId = userRecord[0].id;
    }

    const inserted = await db.insert(students).values({
      userId,
      studentId: data.studentId,
      fullName: data.fullName,
      rollNumber: data.rollNumber,
      departmentId: data.departmentId,
      classId: data.classId,
      year: data.year,
      section: data.section,
      email: data.email,
      contactDetails: data.contactDetails,
      parentContact: data.parentContact,
    }).returning();

    // Auto-enroll in class
    await db.insert(classEnrollments).values({
      classId: data.classId,
      studentId: inserted[0].id,
    });

    return inserted[0];
  } catch (error) {
    console.error('createStudent error:', error);
    throw new Error('Failed to create student record', { cause: error });
  }
}

export async function updateStudent(id: number, data: {
  fullName?: string;
  rollNumber?: string;
  departmentId?: number;
  classId?: number;
  year?: number;
  section?: string;
  email?: string;
  contactDetails?: string;
  parentContact?: string;
}) {
  try {
    const updated = await db.update(students)
      .set(data)
      .where(eq(students.id, id))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('updateStudent error:', error);
    throw new Error('Failed to update student record', { cause: error });
  }
}

export async function deleteStudent(id: number) {
  try {
    // Clean up dependent child records
    await db.delete(correctionRequests).where(eq(correctionRequests.studentId, id));
    await db.delete(attendanceRecords).where(eq(attendanceRecords.studentId, id));
    await db.delete(classEnrollments).where(eq(classEnrollments.studentId, id));
    const deleted = await db.delete(students).where(eq(students.id, id)).returning();
    return deleted[0];
  } catch (error) {
    console.error('deleteStudent error:', error);
    throw new Error('Failed to delete student record', { cause: error });
  }
}

// --- AUDIT LOGS ---
export async function createAuditLog(entry: {
  userId?: number;
  action: string;
  entityType: string;
  entityId?: number;
  details?: string;
  ipAddress?: string;
}) {
  try {
    return await db.insert(auditLogs).values(entry).returning();
  } catch (error) {
    console.error('createAuditLog error:', error);
  }
}

export async function getAuditLogsList(limitCount = 50) {
  try {
    return await db.select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      details: auditLogs.details,
      ipAddress: auditLogs.ipAddress,
      timestamp: auditLogs.timestamp,
      userName: users.name,
      userEmail: users.email,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .orderBy(desc(auditLogs.timestamp))
    .limit(limitCount);
  } catch (error) {
    console.error('getAuditLogsList error:', error);
    throw new Error('Failed to fetch audit logs', { cause: error });
  }
}

// --- ATTENDANCE STATS & SESSIONS ---
export async function getDashboardStats() {
  try {
    const totalStudentsResult = await db.select({ count: sql<number>`count(*)::int` }).from(students);
    const totalTeachersResult = await db.select({ count: sql<number>`count(*)::int` }).from(teachers);
    const totalClassesResult = await db.select({ count: sql<number>`count(*)::int` }).from(classes);
    const totalDepartmentsResult = await db.select({ count: sql<number>`count(*)::int` }).from(departments);

    const todayDate = new Date().toISOString().split('T')[0];

    // Find sessions for today
    const todaySessions = await db.select().from(attendanceSessions).where(eq(attendanceSessions.sessionDate, todayDate));
    
    let todayPresent = 0;
    let todayAbsent = 0;
    let todayOnLeave = 0;

    if (todaySessions.length > 0) {
      const sessionIds = todaySessions.map(s => s.id);
      const records = await db.select().from(attendanceRecords).where(inArray(attendanceRecords.sessionId, sessionIds));
      todayPresent = records.filter(r => r.status === 'present').length;
      todayAbsent = records.filter(r => r.status === 'absent').length;
      todayOnLeave = records.filter(r => r.status === 'on_leave').length;
    } else {
      // Look at the latest date with sessions if today has none yet
      const latestSessions = await db.select().from(attendanceSessions).orderBy(desc(attendanceSessions.sessionDate)).limit(2);
      if (latestSessions.length > 0) {
        const sessionIds = latestSessions.map(s => s.id);
        const records = await db.select().from(attendanceRecords).where(inArray(attendanceRecords.sessionId, sessionIds));
        todayPresent = records.filter(r => r.status === 'present').length;
        todayAbsent = records.filter(r => r.status === 'absent').length;
        todayOnLeave = records.filter(r => r.status === 'on_leave').length;
      }
    }

    const todayTotal = todayPresent + todayAbsent + todayOnLeave;
    const todayPercentage = todayTotal > 0 ? Math.round((todayPresent / todayTotal) * 100) : 0;

    // Daily attendance trend over the last 7 dates
    const allSessions = await db.select().from(attendanceSessions).orderBy(desc(attendanceSessions.sessionDate)).limit(30);
    const dateMap = new Map<string, { present: number; absent: number; onLeave: number }>();

    for (const session of allSessions) {
      if (!dateMap.has(session.sessionDate)) {
        dateMap.set(session.sessionDate, { present: 0, absent: 0, onLeave: 0 });
      }
      const records = await db.select().from(attendanceRecords).where(eq(attendanceRecords.sessionId, session.id));
      const entry = dateMap.get(session.sessionDate)!;
      for (const r of records) {
        if (r.status === 'present') entry.present++;
        else if (r.status === 'absent') entry.absent++;
        else if (r.status === 'on_leave') entry.onLeave++;
      }
    }

    const dailyTrend = Array.from(dateMap.entries())
      .map(([date, counts]) => {
        const total = counts.present + counts.absent + counts.onLeave;
        const rate = total > 0 ? Math.round((counts.present / total) * 100) : 0;
        return {
          date,
          percentage: rate,
          present: counts.present,
          absent: counts.absent,
          onLeave: counts.onLeave,
          total,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // Department-wise distribution
    const allStudents = await db.select().from(students);
    const deptList = await db.select().from(departments);
    const departmentDistribution = deptList.map(d => ({
      name: d.code,
      fullName: d.name,
      studentCount: allStudents.filter(s => s.departmentId === d.id).length,
    }));

    return {
      totalStudents: totalStudentsResult[0].count,
      totalTeachers: totalTeachersResult[0].count,
      totalClasses: totalClassesResult[0].count,
      totalDepartments: totalDepartmentsResult[0].count,
      todayPercentage,
      todayPresent,
      todayAbsent,
      todayOnLeave,
      dailyTrend,
      departmentDistribution,
    };
  } catch (error) {
    console.error('getDashboardStats error:', error);
    throw new Error('Failed to calculate dashboard statistics', { cause: error });
  }
}
