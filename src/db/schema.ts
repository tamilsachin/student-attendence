import { integer, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or system UID
  email: text('email').notNull().unique(),
  role: text('role').notNull().default('student'), // 'admin' | 'teacher' | 'student'
  name: text('name').notNull(),
  phone: text('phone'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Departments Table
export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(), // e.g. 'CSE', 'ECE', 'MECH'
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Classes Table
export const classes = pgTable('classes', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(), // e.g. "B.Tech CSE - 3rd Year - Section A"
  departmentId: integer('department_id').references(() => departments.id).notNull(),
  year: integer('year').notNull(), // 1, 2, 3, 4
  section: text('section').notNull(), // 'A', 'B', 'C'
  academicYear: text('academic_year').notNull(), // e.g. "2026-2027"
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. Subjects Table
export const subjects = pgTable('subjects', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(), // e.g. "CS301"
  name: text('name').notNull(),
  departmentId: integer('department_id').references(() => departments.id).notNull(),
  semester: integer('semester').notNull(),
  credits: integer('credits').default(3),
  createdAt: timestamp('created_at').defaultNow(),
});

// 5. Teachers Table
export const teachers = pgTable('teachers', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  teacherId: text('teacher_id').notNull().unique(), // e.g. "TCH101"
  fullName: text('full_name').notNull(),
  departmentId: integer('department_id').references(() => departments.id).notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  designation: text('designation').default('Assistant Professor'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 6. Students Table
export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  studentId: text('student_id').notNull().unique(), // e.g. "STU2026001"
  fullName: text('full_name').notNull(),
  rollNumber: text('roll_number').notNull().unique(), // e.g. "26CSE01"
  departmentId: integer('department_id').references(() => departments.id).notNull(),
  classId: integer('class_id').references(() => classes.id).notNull(),
  year: integer('year').notNull(),
  section: text('section').notNull(),
  email: text('email').notNull().unique(),
  contactDetails: text('contact_details'),
  parentContact: text('parent_contact'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 7. Class Enrollments Table
export const classEnrollments = pgTable('class_enrollments', {
  id: serial('id').primaryKey(),
  classId: integer('class_id').references(() => classes.id).notNull(),
  studentId: integer('student_id').references(() => students.id).notNull(),
  enrolledAt: timestamp('enrolled_at').defaultNow(),
});

// 8. Attendance Sessions Table
export const attendanceSessions = pgTable('attendance_sessions', {
  id: serial('id').primaryKey(),
  classId: integer('class_id').references(() => classes.id).notNull(),
  subjectId: integer('subject_id').references(() => subjects.id).notNull(),
  teacherId: integer('teacher_id').references(() => teachers.id).notNull(),
  sessionDate: text('session_date').notNull(), // Format: YYYY-MM-DD
  sessionTime: text('session_time').notNull(), // e.g. "09:00 - 10:00 AM"
  topic: text('topic'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 9. Attendance Records Table
export const attendanceRecords = pgTable('attendance_records', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').references(() => attendanceSessions.id).notNull(),
  studentId: integer('student_id').references(() => students.id).notNull(),
  status: text('status').notNull(), // 'present' | 'absent' | 'on_leave'
  remarks: text('remarks'),
  markedAt: timestamp('marked_at').defaultNow(),
  markedBy: integer('marked_by').references(() => users.id),
});

// 10. Correction Requests Table
export const correctionRequests = pgTable('correction_requests', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => students.id).notNull(),
  sessionId: integer('session_id').references(() => attendanceSessions.id).notNull(),
  requestedStatus: text('requested_status').notNull(), // 'present' | 'on_leave'
  reason: text('reason').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
  reviewedBy: integer('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  reviewNote: text('review_note'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 11. Audit Logs Table
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(), // e.g. "ATTENDANCE_MARKED", "ATTENDANCE_CORRECTED", "STUDENT_CREATED"
  entityType: text('entity_type').notNull(), // "attendance_record", "student", "class"
  entityId: integer('entity_id'),
  details: text('details'),
  ipAddress: text('ip_address'),
  timestamp: timestamp('timestamp').defaultNow(),
});

// 12. Settings Table
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  institutionName: text('institution_name').notNull().default('National Institute of Technology'),
  logoUrl: text('logo_url').default(''),
  lowAttendanceThreshold: integer('low_attendance_threshold').notNull().default(75),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relationships
export const usersRelations = relations(users, ({ one, many }) => ({
  teacher: one(teachers, {
    fields: [users.id],
    references: [teachers.userId],
  }),
  student: one(students, {
    fields: [users.id],
    references: [students.userId],
  }),
  auditLogs: many(auditLogs),
}));

export const departmentsRelations = relations(departments, ({ many }) => ({
  classes: many(classes),
  subjects: many(subjects),
  teachers: many(teachers),
  students: many(students),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  department: one(departments, {
    fields: [classes.departmentId],
    references: [departments.id],
  }),
  students: many(students),
  sessions: many(attendanceSessions),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  department: one(departments, {
    fields: [subjects.departmentId],
    references: [departments.id],
  }),
  sessions: many(attendanceSessions),
}));

export const teachersRelations = relations(teachers, ({ one, many }) => ({
  user: one(users, {
    fields: [teachers.userId],
    references: [users.id],
  }),
  department: one(departments, {
    fields: [teachers.departmentId],
    references: [departments.id],
  }),
  sessions: many(attendanceSessions),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  user: one(users, {
    fields: [students.userId],
    references: [users.id],
  }),
  department: one(departments, {
    fields: [students.departmentId],
    references: [departments.id],
  }),
  class: one(classes, {
    fields: [students.classId],
    references: [classes.id],
  }),
  attendanceRecords: many(attendanceRecords),
  correctionRequests: many(correctionRequests),
}));

export const attendanceSessionsRelations = relations(attendanceSessions, ({ one, many }) => ({
  class: one(classes, {
    fields: [attendanceSessions.classId],
    references: [classes.id],
  }),
  subject: one(subjects, {
    fields: [attendanceSessions.subjectId],
    references: [subjects.id],
  }),
  teacher: one(teachers, {
    fields: [attendanceSessions.teacherId],
    references: [teachers.id],
  }),
  records: many(attendanceRecords),
  correctionRequests: many(correctionRequests),
}));

export const attendanceRecordsRelations = relations(attendanceRecords, ({ one }) => ({
  session: one(attendanceSessions, {
    fields: [attendanceRecords.sessionId],
    references: [attendanceSessions.id],
  }),
  student: one(students, {
    fields: [attendanceRecords.studentId],
    references: [students.id],
  }),
  marker: one(users, {
    fields: [attendanceRecords.markedBy],
    references: [users.id],
  }),
}));

export const correctionRequestsRelations = relations(correctionRequests, ({ one }) => ({
  student: one(students, {
    fields: [correctionRequests.studentId],
    references: [students.id],
  }),
  session: one(attendanceSessions, {
    fields: [correctionRequests.sessionId],
    references: [attendanceSessions.id],
  }),
  reviewer: one(users, {
    fields: [correctionRequests.reviewedBy],
    references: [users.id],
  }),
}));
