import express, { Request, Response } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.ts';
import { db } from '../db/index.ts';
import { users, students, teachers, classes, departments, subjects, correctionRequests, settings } from '../db/schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import { 
  getSettings, updateSettings, getDepartments, getClasses, getSubjects, 
  getTeachers, getStudentsList, createStudent, updateStudent, deleteStudent, 
  getDashboardStats, getAuditLogsList, createAuditLog
} from '../db/queries.ts';
import { 
  markClassAttendance, correctAttendanceRecord, getAttendanceReports, 
  getLowAttendanceStudents, getStudentPersonalAttendance, 
  createCorrectionRequest, reviewCorrectionRequest 
} from '../db/attendance-queries.ts';

export const apiRouter = express.Router();
apiRouter.use(express.json());

// --- AUTHENTICATION ---
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user in PostgreSQL
    const matchingUsers = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
    
    if (matchingUsers.length === 0) {
      return res.status(401).json({ error: 'No account found with this email. Try one of the sample accounts below.' });
    }

    const user = matchingUsers[0];

    // For sample/local accounts, we verify password or accept standard sample demo login
    if (password && password !== 'Admin@123' && password !== 'Teacher@123' && password !== 'Student@123' && password !== 'password123') {
      return res.status(401).json({ error: 'Invalid password. Check sample credentials below.' });
    }

    // Generate demo session token (base64 encoded email)
    const token = `demo_token_${Buffer.from(user.email).toString('base64')}`;

    // Fetch student or teacher profile if applicable
    let studentProfile = null;
    let teacherProfile = null;

    if (user.role === 'student') {
      const st = await db.select().from(students).where(eq(students.userId, user.id));
      if (st.length > 0) studentProfile = st[0];
    } else if (user.role === 'teacher') {
      const tch = await db.select().from(teachers).where(eq(teachers.userId, user.id));
      if (tch.length > 0) teacherProfile = tch[0];
    }

    await createAuditLog({
      userId: user.id,
      action: 'USER_LOGIN',
      entityType: 'user',
      entityId: user.id,
      details: `User ${user.email} logged in as ${user.role}`,
    });

    res.json({
      token,
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
      },
      studentProfile,
      teacherProfile,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

apiRouter.get('/auth/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    let studentProfile = null;
    let teacherProfile = null;

    if (user.role === 'student') {
      const st = await db.select().from(students).where(eq(students.userId, user.id));
      if (st.length > 0) studentProfile = st[0];
      else {
        // Fallback by email match
        const stByEmail = await db.select().from(students).where(eq(students.email, user.email));
        if (stByEmail.length > 0) studentProfile = stByEmail[0];
      }
    } else if (user.role === 'teacher') {
      const tch = await db.select().from(teachers).where(eq(teachers.userId, user.id));
      if (tch.length > 0) teacherProfile = tch[0];
      else {
        const tchByEmail = await db.select().from(teachers).where(eq(teachers.email, user.email));
        if (tchByEmail.length > 0) teacherProfile = tchByEmail[0];
      }
    }

    res.json({
      user,
      studentProfile,
      teacherProfile,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch session' });
  }
});

apiRouter.post('/auth/sync-google', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    res.json({ user: req.user });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Sync failed' });
  }
});

// --- DASHBOARD & METRICS ---
apiRouter.get('/attendance/stats', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load stats' });
  }
});

// --- MASTER DATA ---
apiRouter.get('/departments', requireAuth, async (_req: Request, res: Response) => {
  try {
    const depts = await getDepartments();
    res.json(depts);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch departments' });
  }
});

apiRouter.get('/classes', requireAuth, async (_req: Request, res: Response) => {
  try {
    const cls = await getClasses();
    res.json(cls);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch classes' });
  }
});

apiRouter.post('/classes', requireAuth, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { name, departmentId, year, section, academicYear } = req.body;
    const newClass = await db.insert(classes).values({
      name,
      departmentId: Number(departmentId),
      year: Number(year),
      section,
      academicYear: academicYear || '2026-2027',
    }).returning();

    await createAuditLog({
      userId: req.user?.id,
      action: 'CLASS_CREATED',
      entityType: 'class',
      entityId: newClass[0].id,
      details: `Created class ${name}`,
    });

    res.json(newClass[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create class' });
  }
});

apiRouter.get('/subjects', requireAuth, async (_req: Request, res: Response) => {
  try {
    const subs = await getSubjects();
    res.json(subs);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch subjects' });
  }
});

apiRouter.get('/teachers', requireAuth, async (_req: Request, res: Response) => {
  try {
    const tchs = await getTeachers();
    res.json(tchs);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch teachers' });
  }
});

// --- STUDENTS ---
apiRouter.get('/students', requireAuth, async (req: Request, res: Response) => {
  try {
    const { q, departmentId, classId, year } = req.query;
    let list = await getStudentsList();

    if (q) {
      const search = (q as string).toLowerCase();
      list = list.filter(s => 
        s.fullName.toLowerCase().includes(search) || 
        s.studentId.toLowerCase().includes(search) ||
        s.rollNumber.toLowerCase().includes(search) ||
        s.email.toLowerCase().includes(search)
      );
    }
    if (departmentId && departmentId !== 'all') {
      list = list.filter(s => s.departmentId === Number(departmentId));
    }
    if (classId && classId !== 'all') {
      list = list.filter(s => s.classId === Number(classId));
    }
    if (year && year !== 'all') {
      list = list.filter(s => s.year === Number(year));
    }

    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch students' });
  }
});

apiRouter.post('/students', requireAuth, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, fullName, rollNumber, departmentId, classId, year, section, email, contactDetails, parentContact } = req.body;
    
    if (!studentId || !fullName || !rollNumber || !departmentId || !classId || !email) {
      return res.status(400).json({ error: 'Missing required student details' });
    }

    const created = await createStudent({
      studentId,
      fullName,
      rollNumber,
      departmentId: Number(departmentId),
      classId: Number(classId),
      year: Number(year) || 1,
      section: section || 'A',
      email: email.trim().toLowerCase(),
      contactDetails,
      parentContact,
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'STUDENT_CREATED',
      entityType: 'student',
      entityId: created.id,
      details: `Created student ${fullName} (${rollNumber})`,
    });

    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create student' });
  }
});

apiRouter.put('/students/:id', requireAuth, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const updated = await updateStudent(id, req.body);
    await createAuditLog({
      userId: req.user?.id,
      action: 'STUDENT_UPDATED',
      entityType: 'student',
      entityId: id,
      details: `Updated details for student ID ${id}`,
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update student' });
  }
});

apiRouter.delete('/students/:id', requireAuth, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const deleted = await deleteStudent(id);
    await createAuditLog({
      userId: req.user?.id,
      action: 'STUDENT_DELETED',
      entityType: 'student',
      entityId: id,
      details: `Deleted student ${deleted.fullName} (${deleted.rollNumber})`,
    });
    res.json({ success: true, deleted });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete student' });
  }
});

apiRouter.post('/students/bulk-import', requireAuth, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { studentsList } = req.body; // array of student objects
    if (!Array.isArray(studentsList) || studentsList.length === 0) {
      return res.status(400).json({ error: 'Expected non-empty array of students' });
    }

    const imported = [];
    for (const s of studentsList) {
      try {
        const item = await createStudent({
          studentId: s.studentId || `STU${Date.now()}`,
          fullName: s.fullName,
          rollNumber: s.rollNumber,
          departmentId: Number(s.departmentId) || 1,
          classId: Number(s.classId) || 1,
          year: Number(s.year) || 3,
          section: s.section || 'A',
          email: (s.email || `${s.rollNumber.toLowerCase()}@apex.edu`).trim().toLowerCase(),
          contactDetails: s.contactDetails || '',
          parentContact: s.parentContact || '',
        });
        imported.push(item);
      } catch (itemErr) {
        console.warn('Skipping duplicate or invalid row in CSV:', itemErr);
      }
    }

    await createAuditLog({
      userId: req.user?.id,
      action: 'STUDENTS_BULK_IMPORT',
      entityType: 'student',
      details: `Imported ${imported.length} student records from CSV`,
    });

    res.json({ success: true, count: imported.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Bulk import failed' });
  }
});

// --- ATTENDANCE MARKING ---
apiRouter.get('/attendance/class-students', requireAuth, async (req: Request, res: Response) => {
  try {
    const { classId } = req.query;
    if (!classId) return res.status(400).json({ error: 'classId is required' });

    const studentRows = await db.select().from(students)
      .where(eq(students.classId, Number(classId)))
      .orderBy(students.rollNumber);

    res.json(studentRows);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch class roster' });
  }
});

apiRouter.post('/attendance/session', requireAuth, requireRole(['admin', 'teacher']), async (req: AuthRequest, res: Response) => {
  try {
    const { classId, subjectId, teacherId, sessionDate, sessionTime, topic, records } = req.body;
    
    if (!classId || !subjectId || !sessionDate || !sessionTime || !records) {
      return res.status(400).json({ error: 'Missing mandatory session parameters or student records' });
    }

    const result = await markClassAttendance({
      classId: Number(classId),
      subjectId: Number(subjectId),
      teacherId: Number(teacherId) || 1,
      sessionDate,
      sessionTime,
      topic,
      userId: req.user!.id,
      records,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save attendance session' });
  }
});

apiRouter.put('/attendance/record/:id', requireAuth, requireRole(['admin', 'teacher']), async (req: AuthRequest, res: Response) => {
  try {
    const recordId = Number(req.params.id);
    const { newStatus, reason } = req.body;
    if (!newStatus || !reason) {
      return res.status(400).json({ error: 'newStatus and reason are required for attendance correction' });
    }

    const updated = await correctAttendanceRecord({
      recordId,
      newStatus,
      reason,
      reviewerUserId: req.user!.id,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to correct attendance record' });
  }
});

// --- REPORTS ---
apiRouter.get('/attendance/reports', requireAuth, async (req: Request, res: Response) => {
  try {
    const { classId, departmentId, subjectId, studentId, startDate, endDate } = req.query;
    const reports = await getAttendanceReports({
      classId: classId ? Number(classId) : undefined,
      departmentId: departmentId ? Number(departmentId) : undefined,
      subjectId: subjectId ? Number(subjectId) : undefined,
      studentId: studentId ? Number(studentId) : undefined,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate reports' });
  }
});

// --- LOW ATTENDANCE ALERTS ---
apiRouter.get('/alerts/low-attendance', requireAuth, async (_req: Request, res: Response) => {
  try {
    const alerts = await getLowAttendanceStudents();
    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch low attendance alerts' });
  }
});

// --- STUDENT PORTAL ---
apiRouter.get('/student/my-attendance', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // If student, find their studentId; if admin/teacher passed ?studentId=..., inspect that student
    let studentId: number | undefined;

    if (req.user?.role === 'student') {
      const st = await db.select().from(students).where(eq(students.userId, req.user.id));
      if (st.length > 0) studentId = st[0].id;
      else {
        const stByEmail = await db.select().from(students).where(eq(students.email, req.user.email));
        if (stByEmail.length > 0) studentId = stByEmail[0].id;
      }
    } else if (req.query.studentId) {
      studentId = Number(req.query.studentId);
    }

    if (!studentId) {
      // Default to first student in demo
      const first = await db.select().from(students).limit(1);
      if (first.length > 0) studentId = first[0].id;
      else return res.status(404).json({ error: 'No student record found' });
    }

    const data = await getStudentPersonalAttendance(studentId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch student attendance profile' });
  }
});

apiRouter.post('/student/correction-requests', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId, requestedStatus, reason, studentId: explicitStudentId } = req.body;
    let studentId = explicitStudentId;

    if (!studentId && req.user?.role === 'student') {
      const st = await db.select().from(students).where(eq(students.userId, req.user.id));
      if (st.length > 0) studentId = st[0].id;
      else {
        const stByEmail = await db.select().from(students).where(eq(students.email, req.user.email));
        if (stByEmail.length > 0) studentId = stByEmail[0].id;
      }
    }

    if (!studentId || !sessionId || !requestedStatus || !reason) {
      return res.status(400).json({ error: 'Missing required correction request data' });
    }

    const reqRecord = await createCorrectionRequest({
      studentId: Number(studentId),
      sessionId: Number(sessionId),
      requestedStatus,
      reason,
    });

    res.json(reqRecord);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to submit correction request' });
  }
});

apiRouter.get('/correction-requests', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const requests = await db.select({
      id: correctionRequests.id,
      studentId: correctionRequests.studentId,
      sessionId: correctionRequests.sessionId,
      requestedStatus: correctionRequests.requestedStatus,
      reason: correctionRequests.reason,
      status: correctionRequests.status,
      reviewedBy: correctionRequests.reviewedBy,
      reviewedAt: correctionRequests.reviewedAt,
      reviewNote: correctionRequests.reviewNote,
      createdAt: correctionRequests.createdAt,
      studentName: students.fullName,
      studentRoll: students.rollNumber,
      studentEmail: students.email,
    })
    .from(correctionRequests)
    .innerJoin(students, eq(correctionRequests.studentId, students.id))
    .orderBy(desc(correctionRequests.createdAt));

    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch correction requests' });
  }
});

apiRouter.put('/correction-requests/:id/review', requireAuth, requireRole(['admin', 'teacher']), async (req: AuthRequest, res: Response) => {
  try {
    const requestId = Number(req.params.id);
    const { status, reviewNote } = req.body;
    if (!status || (status !== 'approved' && status !== 'rejected')) {
      return res.status(400).json({ error: 'status must be approved or rejected' });
    }

    const updated = await reviewCorrectionRequest({
      requestId,
      status,
      reviewerUserId: req.user!.id,
      reviewNote,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to review correction request' });
  }
});

// --- SETTINGS ---
apiRouter.get('/settings', requireAuth, async (_req: Request, res: Response) => {
  try {
    const s = await getSettings();
    res.json(s);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch settings' });
  }
});

apiRouter.put('/settings', requireAuth, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const updated = await updateSettings(req.body);
    await createAuditLog({
      userId: req.user?.id,
      action: 'SETTINGS_UPDATED',
      entityType: 'settings',
      entityId: updated.id,
      details: `Updated settings: Threshold ${updated.lowAttendanceThreshold}%, Name: ${updated.institutionName}`,
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update settings' });
  }
});

// --- AUDIT LOGS ---
apiRouter.get('/audit-logs', requireAuth, requireRole(['admin']), async (_req: Request, res: Response) => {
  try {
    const logs = await getAuditLogsList(100);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch audit logs' });
  }
});
