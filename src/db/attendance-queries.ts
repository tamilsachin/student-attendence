import { db } from './index.ts';
import { 
  attendanceSessions, attendanceRecords, students, classes, subjects, 
  teachers, departments, correctionRequests, settings, users
} from './schema.ts';
import { eq, and, sql, desc, gte, lte, inArray } from 'drizzle-orm';
import { createAuditLog } from './queries.ts';

// Mark class attendance with duplicate prevention
export async function markClassAttendance(data: {
  classId: number;
  subjectId: number;
  teacherId: number;
  sessionDate: string;
  sessionTime: string;
  topic?: string;
  userId: number;
  records: Array<{
    studentId: number;
    status: 'present' | 'absent' | 'on_leave';
    remarks?: string;
  }>;
}) {
  try {
    // 1. Check for duplicate session for the same class, subject, date, and sessionTime
    const existingSessions = await db.select().from(attendanceSessions).where(
      and(
        eq(attendanceSessions.classId, data.classId),
        eq(attendanceSessions.subjectId, data.subjectId),
        eq(attendanceSessions.sessionDate, data.sessionDate),
        eq(attendanceSessions.sessionTime, data.sessionTime)
      )
    );

    let sessionId: number;

    if (existingSessions.length > 0) {
      sessionId = existingSessions[0].id;
      // Update existing records
      for (const rec of data.records) {
        const existingRecord = await db.select().from(attendanceRecords).where(
          and(
            eq(attendanceRecords.sessionId, sessionId),
            eq(attendanceRecords.studentId, rec.studentId)
          )
        );

        if (existingRecord.length > 0) {
          await db.update(attendanceRecords)
            .set({
              status: rec.status,
              remarks: rec.remarks || '',
              markedAt: new Date(),
              markedBy: data.userId,
            })
            .where(eq(attendanceRecords.id, existingRecord[0].id));
        } else {
          await db.insert(attendanceRecords).values({
            sessionId,
            studentId: rec.studentId,
            status: rec.status,
            remarks: rec.remarks || '',
            markedBy: data.userId,
          });
        }
      }
    } else {
      // Create new session
      const newSession = await db.insert(attendanceSessions).values({
        classId: data.classId,
        subjectId: data.subjectId,
        teacherId: data.teacherId,
        sessionDate: data.sessionDate,
        sessionTime: data.sessionTime,
        topic: data.topic || 'Class Lecture',
      }).returning();

      sessionId = newSession[0].id;

      // Insert all student records
      for (const rec of data.records) {
        await db.insert(attendanceRecords).values({
          sessionId,
          studentId: rec.studentId,
          status: rec.status,
          remarks: rec.remarks || '',
          markedBy: data.userId,
        });
      }
    }

    // Audit log
    await createAuditLog({
      userId: data.userId,
      action: existingSessions.length > 0 ? 'ATTENDANCE_UPDATED' : 'ATTENDANCE_RECORDED',
      entityType: 'attendance_session',
      entityId: sessionId,
      details: `Marked attendance for ${data.records.length} students on date ${data.sessionDate} (${data.sessionTime})`,
    });

    return { success: true, sessionId };
  } catch (error) {
    console.error('markClassAttendance error:', error);
    throw new Error('Failed to record class attendance', { cause: error });
  }
}

// Single record correction with audit log
export async function correctAttendanceRecord(data: {
  recordId: number;
  newStatus: 'present' | 'absent' | 'on_leave';
  reason: string;
  reviewerUserId: number;
}) {
  try {
    const existing = await db.select().from(attendanceRecords).where(eq(attendanceRecords.id, data.recordId));
    if (existing.length === 0) {
      throw new Error('Attendance record not found');
    }

    const prevStatus = existing[0].status;
    const updated = await db.update(attendanceRecords)
      .set({
        status: data.newStatus,
        remarks: `Corrected from ${prevStatus}: ${data.reason}`,
        markedAt: new Date(),
        markedBy: data.reviewerUserId,
      })
      .where(eq(attendanceRecords.id, data.recordId))
      .returning();

    await createAuditLog({
      userId: data.reviewerUserId,
      action: 'ATTENDANCE_CORRECTION',
      entityType: 'attendance_record',
      entityId: data.recordId,
      details: `Status altered from '${prevStatus}' to '${data.newStatus}'. Reason: ${data.reason}`,
    });

    return updated[0];
  } catch (error) {
    console.error('correctAttendanceRecord error:', error);
    throw new Error('Failed to correct attendance record', { cause: error });
  }
}

// Get comprehensive attendance reports
export async function getAttendanceReports(filters: {
  classId?: number;
  departmentId?: number;
  subjectId?: number;
  studentId?: number;
  startDate?: string;
  endDate?: string;
}) {
  try {
    // 1. Fetch matching sessions
    let sessions = await db.select().from(attendanceSessions);

    if (filters.classId) {
      sessions = sessions.filter(s => s.classId === filters.classId);
    }
    if (filters.subjectId) {
      sessions = sessions.filter(s => s.subjectId === filters.subjectId);
    }
    if (filters.startDate) {
      sessions = sessions.filter(s => s.sessionDate >= filters.startDate!);
    }
    if (filters.endDate) {
      sessions = sessions.filter(s => s.sessionDate <= filters.endDate!);
    }

    const sessionIds = sessions.map(s => s.id);
    let allRecords = sessionIds.length > 0 
      ? await db.select().from(attendanceRecords).where(inArray(attendanceRecords.sessionId, sessionIds))
      : [];

    // Filter students
    let studentList = await db.select().from(students);
    if (filters.departmentId) {
      studentList = studentList.filter(s => s.departmentId === filters.departmentId);
    }
    if (filters.classId) {
      studentList = studentList.filter(s => s.classId === filters.classId);
    }
    if (filters.studentId) {
      studentList = studentList.filter(s => s.id === filters.studentId);
    }

    const deptMap = new Map((await db.select().from(departments)).map(d => [d.id, d.name]));
    const classMap = new Map((await db.select().from(classes)).map(c => [c.id, c.name]));

    const reportRows = studentList.map(st => {
      const studentRecs = allRecords.filter(r => r.studentId === st.id);
      const totalConducted = studentRecs.length;
      const presentCount = studentRecs.filter(r => r.status === 'present').length;
      const absentCount = studentRecs.filter(r => r.status === 'absent').length;
      const onLeaveCount = studentRecs.filter(r => r.status === 'on_leave').length;

      // Formula: (Classes Attended / Total Classes Conducted) * 100
      const percentage = totalConducted > 0 
        ? Math.round((presentCount / totalConducted) * 1000) / 10 
        : 100.0;

      return {
        studentId: st.id,
        rollNumber: st.rollNumber,
        studentNumber: st.studentId,
        fullName: st.fullName,
        email: st.email,
        departmentName: deptMap.get(st.departmentId) || 'Unknown',
        className: classMap.get(st.classId) || 'Unknown',
        year: st.year,
        section: st.section,
        totalClassesConducted: totalConducted,
        classesAttended: presentCount,
        classesMissed: absentCount,
        classesOnLeave: onLeaveCount,
        attendancePercentage: percentage,
      };
    });

    return reportRows;
  } catch (error) {
    console.error('getAttendanceReports error:', error);
    throw new Error('Failed to generate attendance reports', { cause: error });
  }
}

// Low attendance alert list
export async function getLowAttendanceStudents() {
  try {
    const appSettings = await db.select().from(settings).limit(1);
    const threshold = appSettings[0]?.lowAttendanceThreshold ?? 75;

    const allStudents = await db.select().from(students);
    const allRecords = await db.select().from(attendanceRecords);
    const deptMap = new Map((await db.select().from(departments)).map(d => [d.id, d.name]));
    const classMap = new Map((await db.select().from(classes)).map(c => [c.id, c.name]));

    const lowList = [];

    for (const st of allStudents) {
      const studentRecs = allRecords.filter(r => r.studentId === st.id);
      const total = studentRecs.length;
      if (total === 0) continue;

      const attended = studentRecs.filter(r => r.status === 'present').length;
      const missed = studentRecs.filter(r => r.status === 'absent').length;
      const onLeave = studentRecs.filter(r => r.status === 'on_leave').length;
      const percentage = Math.round((attended / total) * 1000) / 10;

      if (percentage < threshold) {
        lowList.push({
          id: st.id,
          rollNumber: st.rollNumber,
          fullName: st.fullName,
          studentId: st.studentId,
          email: st.email,
          contactDetails: st.contactDetails,
          parentContact: st.parentContact,
          departmentName: deptMap.get(st.departmentId) || 'General',
          className: classMap.get(st.classId) || 'General',
          totalConducted: total,
          attended,
          missed,
          onLeave,
          attendancePercentage: percentage,
          threshold,
          deficit: Math.max(0, Math.ceil((threshold * total - 100 * attended) / (100 - threshold))),
        });
      }
    }

    return {
      threshold,
      students: lowList.sort((a, b) => a.attendancePercentage - b.attendancePercentage),
    };
  } catch (error) {
    console.error('getLowAttendanceStudents error:', error);
    throw new Error('Failed to fetch low attendance alerts', { cause: error });
  }
}

// Student's personal attendance view
export async function getStudentPersonalAttendance(studentId: number) {
  try {
    const student = await db.select().from(students).where(eq(students.id, studentId));
    if (student.length === 0) {
      throw new Error('Student profile not found');
    }
    const st = student[0];

    // Fetch all records for this student with session details
    const records = await db.select({
      recordId: attendanceRecords.id,
      sessionId: attendanceSessions.id,
      sessionDate: attendanceSessions.sessionDate,
      sessionTime: attendanceSessions.sessionTime,
      topic: attendanceSessions.topic,
      subjectId: attendanceSessions.subjectId,
      status: attendanceRecords.status,
      remarks: attendanceRecords.remarks,
    })
    .from(attendanceRecords)
    .innerJoin(attendanceSessions, eq(attendanceRecords.sessionId, attendanceSessions.id))
    .where(eq(attendanceRecords.studentId, studentId))
    .orderBy(desc(attendanceSessions.sessionDate));

    const totalConducted = records.length;
    const attended = records.filter(r => r.status === 'present').length;
    const missed = records.filter(r => r.status === 'absent').length;
    const onLeave = records.filter(r => r.status === 'on_leave').length;
    const overallPercentage = totalConducted > 0 
      ? Math.round((attended / totalConducted) * 1000) / 10 
      : 100.0;

    // Subject-wise attendance
    const allSubjects = await db.select().from(subjects);
    const subjectMap = new Map(allSubjects.map(s => [s.id, s]));

    const subjectStatsMap = new Map<number, { conducted: number; attended: number; missed: number; onLeave: number }>();

    for (const r of records) {
      if (!subjectStatsMap.has(r.subjectId)) {
        subjectStatsMap.set(r.subjectId, { conducted: 0, attended: 0, missed: 0, onLeave: 0 });
      }
      const item = subjectStatsMap.get(r.subjectId)!;
      item.conducted++;
      if (r.status === 'present') item.attended++;
      else if (r.status === 'absent') item.missed++;
      else if (r.status === 'on_leave') item.onLeave++;
    }

    const subjectBreakdown = Array.from(subjectStatsMap.entries()).map(([subId, stats]) => {
      const sub = subjectMap.get(subId);
      const subPct = stats.conducted > 0 
        ? Math.round((stats.attended / stats.conducted) * 1000) / 10 
        : 100;
      return {
        subjectId: subId,
        code: sub?.code || 'N/A',
        name: sub?.name || 'General',
        conducted: stats.conducted,
        attended: stats.attended,
        missed: stats.missed,
        onLeave: stats.onLeave,
        percentage: subPct,
      };
    });

    // Absent dates list
    const absentHistory = records.filter(r => r.status === 'absent').map(r => ({
      recordId: r.recordId,
      sessionId: r.sessionId,
      date: r.sessionDate,
      time: r.sessionTime,
      subjectName: subjectMap.get(r.subjectId)?.name || 'Lecture',
      topic: r.topic,
      remarks: r.remarks,
    }));

    // Correction requests submitted by this student
    const studentRequests = await db.select().from(correctionRequests)
      .where(eq(correctionRequests.studentId, studentId))
      .orderBy(desc(correctionRequests.createdAt));

    return {
      student: {
        id: st.id,
        studentId: st.studentId,
        rollNumber: st.rollNumber,
        fullName: st.fullName,
        email: st.email,
        year: st.year,
        section: st.section,
      },
      summary: {
        totalConducted,
        attended,
        missed,
        onLeave,
        overallPercentage,
      },
      subjectBreakdown,
      dailyHistory: records.map(r => ({
        ...r,
        subjectName: subjectMap.get(r.subjectId)?.name || 'Class',
        subjectCode: subjectMap.get(r.subjectId)?.code || '',
      })),
      absentHistory,
      correctionRequests: studentRequests,
    };
  } catch (error) {
    console.error('getStudentPersonalAttendance error:', error);
    throw new Error('Failed to retrieve student attendance profile', { cause: error });
  }
}

// Correction Requests Management
export async function createCorrectionRequest(data: {
  studentId: number;
  sessionId: number;
  requestedStatus: string;
  reason: string;
}) {
  try {
    const inserted = await db.insert(correctionRequests).values({
      studentId: data.studentId,
      sessionId: data.sessionId,
      requestedStatus: data.requestedStatus,
      reason: data.reason,
      status: 'pending',
    }).returning();

    await createAuditLog({
      action: 'CORRECTION_REQUESTED',
      entityType: 'correction_request',
      entityId: inserted[0].id,
      details: `Student #${data.studentId} requested status '${data.requestedStatus}' for session #${data.sessionId}`,
    });

    return inserted[0];
  } catch (error) {
    console.error('createCorrectionRequest error:', error);
    throw new Error('Failed to submit correction request', { cause: error });
  }
}

export async function reviewCorrectionRequest(data: {
  requestId: number;
  status: 'approved' | 'rejected';
  reviewerUserId: number;
  reviewNote?: string;
}) {
  try {
    const existing = await db.select().from(correctionRequests).where(eq(correctionRequests.id, data.requestId));
    if (existing.length === 0) {
      throw new Error('Request not found');
    }
    const req = existing[0];

    const updated = await db.update(correctionRequests)
      .set({
        status: data.status,
        reviewedBy: data.reviewerUserId,
        reviewedAt: new Date(),
        reviewNote: data.reviewNote || '',
      })
      .where(eq(correctionRequests.id, data.requestId))
      .returning();

    // If approved, update the actual attendance record
    if (data.status === 'approved') {
      await db.update(attendanceRecords)
        .set({
          status: req.requestedStatus,
          remarks: `Approved correction: ${req.reason}`,
          markedAt: new Date(),
          markedBy: data.reviewerUserId,
        })
        .where(
          and(
            eq(attendanceRecords.sessionId, req.sessionId),
            eq(attendanceRecords.studentId, req.studentId)
          )
        );
    }

    await createAuditLog({
      userId: data.reviewerUserId,
      action: `CORRECTION_${data.status.toUpperCase()}`,
      entityType: 'correction_request',
      entityId: data.requestId,
      details: `Correction request #${data.requestId} ${data.status} by reviewer. Note: ${data.reviewNote || 'None'}`,
    });

    return updated[0];
  } catch (error) {
    console.error('reviewCorrectionRequest error:', error);
    throw new Error('Failed to review correction request', { cause: error });
  }
}
