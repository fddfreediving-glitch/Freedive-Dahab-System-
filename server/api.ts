import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from './db.js';
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  requireAuth,
  requireRole,
  logAudit,
  maskStudentData,
} from './auth.js';

export const apiRouter = Router();

// ==========================================
// 1. AUTHENTICATION & SESSION MANAGEMENT
// ==========================================

apiRouter.post('/auth/login', (req: Request, res: Response): void => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) as any;
  if (!user) {
    logAudit({
      userEmail: email,
      action: 'LOGIN_FAILED',
      entityType: 'AUTH',
      details: { reason: 'User not found' },
      ip: req.ip,
    });
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  if (!user.is_active) {
    res.status(403).json({ error: 'This account has been disabled. Please contact the Dahab center owner.' });
    return;
  }

  const isValid = verifyPassword(password, user.password_hash, user.salt);
  if (!isValid) {
    logAudit({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'LOGIN_FAILED',
      entityType: 'AUTH',
      details: { reason: 'Incorrect password' },
      ip: req.ip,
    });
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  // Create session (valid for 7 days)
  const token = generateSessionToken();
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO sessions (token, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).run(token, user.id, expiresAt, now);

  // Set HTTP-only cookie
  res.cookie('freedive_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  logAudit({
    userId: user.id,
    userEmail: user.email,
    userRole: user.role,
    action: 'LOGIN_SUCCESS',
    entityType: 'AUTH',
    details: { loginMethod: 'credentials' },
    ip: req.ip,
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone,
      languages: JSON.parse(user.languages || '[]'),
      certifications: JSON.parse(user.certifications || '[]'),
    },
  });
});

apiRouter.post('/auth/logout', requireAuth, (req: Request, res: Response): void => {
  if (req.sessionToken) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(req.sessionToken);
  }
  res.clearCookie('freedive_session');
  logAudit({
    userId: req.user?.id,
    userEmail: req.user?.email,
    userRole: req.user?.role,
    action: 'LOGOUT',
    entityType: 'AUTH',
    ip: req.ip,
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

apiRouter.get('/auth/me', requireAuth, (req: Request, res: Response): void => {
  res.json({
    user: {
      ...req.user,
      languages: typeof req.user?.languages === 'string' ? JSON.parse(req.user.languages) : req.user?.languages,
      certifications: typeof req.user?.certifications === 'string' ? JSON.parse(req.user.certifications) : req.user?.certifications,
    },
  });
});

// Role switcher helper for demonstration & evaluation of permissions
apiRouter.post('/auth/switch-demo', (req: Request, res: Response): void => {
  const { role, email } = req.body;
  let targetUser: any;

  if (email) {
    targetUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  } else if (role) {
    targetUser = db.prepare('SELECT * FROM users WHERE role = ? AND is_active = 1 LIMIT 1').get(role);
  }

  if (!targetUser) {
    res.status(404).json({ error: 'Target user role not found' });
    return;
  }

  const token = generateSessionToken();
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  db.prepare(`
    INSERT INTO sessions (token, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).run(token, targetUser.id, expiresAt, new Date().toISOString());

  res.cookie('freedive_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  logAudit({
    userId: targetUser.id,
    userEmail: targetUser.email,
    userRole: targetUser.role,
    action: 'ROLE_SWITCHED_DEMO',
    entityType: 'AUTH',
    details: { switchedTo: targetUser.role },
    ip: req.ip,
  });

  res.json({
    token,
    user: {
      id: targetUser.id,
      email: targetUser.email,
      full_name: targetUser.full_name,
      role: targetUser.role,
      phone: targetUser.phone,
      languages: JSON.parse(targetUser.languages || '[]'),
      certifications: JSON.parse(targetUser.certifications || '[]'),
    },
  });
});

// ==========================================
// 2. STAFF & EMPLOYEE MANAGEMENT
// ==========================================

apiRouter.get('/users', requireAuth, (req: Request, res: Response): void => {
  // If instructor or front desk, only return public staff directory (name, email, role, certs, phone)
  const isPrivileged = ['owner', 'operations_manager', 'hr', 'finance'].includes(req.user!.role);
  
  if (isPrivileged) {
    const users = db.prepare(`
      SELECT id, email, full_name, role, is_active, phone, emergency_contact, languages, certifications,
             hourly_rate, session_commission, monthly_salary, created_at
      FROM users ORDER BY full_name ASC
    `).all();
    res.json(users.map((u: any) => ({
      ...u,
      languages: JSON.parse(u.languages || '[]'),
      certifications: JSON.parse(u.certifications || '[]'),
    })));
  } else {
    // Limited directory for instructors / gear team
    const users = db.prepare(`
      SELECT id, email, full_name, role, phone, languages, certifications
      FROM users WHERE is_active = 1 ORDER BY full_name ASC
    `).all();
    res.json(users.map((u: any) => ({
      ...u,
      languages: JSON.parse(u.languages || '[]'),
      certifications: JSON.parse(u.certifications || '[]'),
    })));
  }
});

apiRouter.post('/users', requireAuth, requireRole(['owner', 'hr']), (req: Request, res: Response): void => {
  const {
    email,
    password,
    full_name,
    role,
    phone,
    emergency_contact,
    languages,
    certifications,
    monthly_salary,
    hourly_rate,
    session_commission,
  } = req.body;

  if (!email || !password || !full_name || !role) {
    res.status(400).json({ error: 'Email, password, full name, and role are required' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    res.status(400).json({ error: 'A staff user with this email already exists' });
    return;
  }

  const { hash, salt } = hashPassword(password);
  const id = 'usr_' + crypto.randomUUID().slice(0, 10);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, full_name, role, is_active, phone, emergency_contact, languages, certifications, monthly_salary, hourly_rate, session_commission, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    email.toLowerCase().trim(),
    hash,
    salt,
    full_name,
    role,
    phone || null,
    emergency_contact || null,
    JSON.stringify(languages || ['English']),
    JSON.stringify(certifications || []),
    monthly_salary || 0,
    hourly_rate || 0,
    session_commission || 0,
    now,
    now
  );

  logAudit({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: 'CREATE_USER',
    entityType: 'USER',
    entityId: id,
    details: { email, role, full_name },
    ip: req.ip,
  });

  res.status(201).json({ id, message: 'Staff member account created successfully' });
});

apiRouter.patch('/users/:id', requireAuth, requireRole(['owner', 'hr']), (req: Request, res: Response): void => {
  const { id } = req.params;
  const {
    full_name,
    role,
    is_active,
    phone,
    emergency_contact,
    languages,
    certifications,
    monthly_salary,
    hourly_rate,
    session_commission,
    password,
  } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Prevent disabling the last owner
  if (user.role === 'owner' && is_active === 0) {
    const ownerCount = (db.prepare('SELECT COUNT(*) as count FROM users WHERE role = "owner" AND is_active = 1').get() as any).count;
    if (ownerCount <= 1) {
      res.status(400).json({ error: 'Cannot deactivate the sole system owner account.' });
      return;
    }
  }

  const updates: string[] = ['updated_at = ?'];
  const values: any[] = [new Date().toISOString()];

  if (full_name !== undefined) { updates.push('full_name = ?'); values.push(full_name); }
  if (role !== undefined) { updates.push('role = ?'); values.push(role); }
  if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
  if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
  if (emergency_contact !== undefined) { updates.push('emergency_contact = ?'); values.push(emergency_contact); }
  if (languages !== undefined) { updates.push('languages = ?'); values.push(JSON.stringify(languages)); }
  if (certifications !== undefined) { updates.push('certifications = ?'); values.push(JSON.stringify(certifications)); }
  if (monthly_salary !== undefined) { updates.push('monthly_salary = ?'); values.push(Number(monthly_salary)); }
  if (hourly_rate !== undefined) { updates.push('hourly_rate = ?'); values.push(Number(hourly_rate)); }
  if (session_commission !== undefined) { updates.push('session_commission = ?'); values.push(Number(session_commission)); }
  if (password) {
    const { hash, salt } = hashPassword(password);
    updates.push('password_hash = ?', 'salt = ?');
    values.push(hash, salt);
  }

  values.push(id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  // If user was deactivated, terminate all their active sessions immediately
  if (is_active === 0) {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  }

  logAudit({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: 'UPDATE_USER',
    entityType: 'USER',
    entityId: id,
    details: { updatedFields: Object.keys(req.body) },
    ip: req.ip,
  });

  res.json({ message: 'User updated successfully' });
});

// ==========================================
// 3. STUDENTS & CRM MODULE
// ==========================================

apiRouter.get('/students', requireAuth, (req: Request, res: Response): void => {
  const { search, agency, status } = req.query;
  let query = 'SELECT * FROM students WHERE 1=1';
  const params: any[] = [];

  if (search) {
    query += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  if (agency) {
    query += ' AND certification_agency = ?';
    params.push(agency);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const rows = db.prepare(query).all(...params) as any[];

  // Apply server-side medical data restriction for non-authorized roles
  const masked = rows.map((s) => maskStudentData(s, req.user!.role));
  res.json(masked);
});

apiRouter.get('/students/:id', requireAuth, (req: Request, res: Response): void => {
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id) as any;
  if (!student) {
    res.status(404).json({ error: 'Student not found' });
    return;
  }

  // Get student's bookings
  const bookings = db.prepare(`
    SELECT b.*, c.title as course_title, c.code as course_code
    FROM bookings b
    JOIN courses c ON b.course_id = c.id
    WHERE b.student_id = ?
    ORDER BY b.booking_date DESC
  `).all(student.id);

  // Get student's inquiries
  const inquiries = db.prepare(`
    SELECT * FROM inquiries WHERE student_id = ? ORDER BY created_at DESC
  `).all(student.id);

  // Invoices (only for owner & finance)
  let invoices: any[] = [];
  if (['owner', 'finance'].includes(req.user!.role)) {
    invoices = db.prepare(`
      SELECT * FROM invoices WHERE student_id = ? ORDER BY issue_date DESC
    `).all(student.id);
  }

  const masked = maskStudentData(student, req.user!.role);
  res.json({
    student: masked,
    bookings,
    inquiries,
    invoices,
  });
});

apiRouter.post('/students', requireAuth, (req: Request, res: Response): void => {
  const {
    first_name,
    last_name,
    email,
    phone,
    nationality,
    date_of_birth,
    certification_agency,
    certification_level,
    total_depth_pb,
    static_apnea_pb,
    medical_waiver_signed,
    medical_waiver_date,
    medical_notes,
    emergency_contact_name,
    emergency_contact_phone,
    insurance_details,
    source_channel,
    status,
    notes,
  } = req.body;

  if (!first_name || !last_name || !email) {
    res.status(400).json({ error: 'First name, last name, and email are required' });
    return;
  }

  const existing = db.prepare('SELECT id FROM students WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    res.status(400).json({ error: 'A student with this email already exists' });
    return;
  }

  const id = 'std_' + crypto.randomUUID().slice(0, 10);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO students (
      id, first_name, last_name, email, phone, nationality, date_of_birth,
      certification_agency, certification_level, total_depth_pb, static_apnea_pb,
      medical_waiver_signed, medical_waiver_date, medical_notes,
      emergency_contact_name, emergency_contact_phone, insurance_details,
      source_channel, status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    first_name.trim(),
    last_name.trim(),
    email.toLowerCase().trim(),
    phone || null,
    nationality || null,
    date_of_birth || null,
    certification_agency || 'None',
    certification_level || 'Beginner',
    Number(total_depth_pb) || 0,
    static_apnea_pb || '00:00',
    medical_waiver_signed ? 1 : 0,
    medical_waiver_date || null,
    medical_notes || null,
    emergency_contact_name || null,
    emergency_contact_phone || null,
    insurance_details || null,
    source_channel || 'Walk-in',
    status || 'active',
    notes || null,
    now,
    now
  );

  logAudit({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: 'CREATE_STUDENT',
    entityType: 'STUDENT',
    entityId: id,
    details: { name: `${first_name} ${last_name}`, email },
    ip: req.ip,
  });

  res.status(201).json({ id, message: 'Student registered successfully' });
});

apiRouter.patch('/students/:id', requireAuth, (req: Request, res: Response): void => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'Student not found' });
    return;
  }

  const allowedFields = [
    'first_name', 'last_name', 'phone', 'nationality', 'date_of_birth',
    'certification_agency', 'certification_level', 'total_depth_pb',
    'static_apnea_pb', 'medical_waiver_signed', 'medical_waiver_date',
    'medical_notes', 'emergency_contact_name', 'emergency_contact_phone',
    'insurance_details', 'source_channel', 'status', 'notes'
  ];

  const updates: string[] = ['updated_at = ?'];
  const values: any[] = [new Date().toISOString()];

  // If role is instructor or front desk, restrict updating medical_notes
  const isHealthAuthorized = ['owner', 'operations_manager', 'hr'].includes(req.user!.role);

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      if (field === 'medical_notes' && !isHealthAuthorized) {
        continue; // Disallow medical note editing by unauthorized roles
      }
      updates.push(`${field} = ?`);
      let val = req.body[field];
      if (field === 'medical_waiver_signed') val = val ? 1 : 0;
      values.push(val);
    }
  }

  values.push(id);
  db.prepare(`UPDATE students SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  logAudit({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: 'UPDATE_STUDENT',
    entityType: 'STUDENT',
    entityId: id,
    details: { updatedFields: Object.keys(req.body) },
    ip: req.ip,
  });

  res.json({ message: 'Student updated successfully' });
});

// Update medical waiver status with confirmation and audit
apiRouter.post('/students/:id/waiver', requireAuth, (req: Request, res: Response): void => {
  const { id } = req.params;
  const { signed, date, notes } = req.body;

  const student = db.prepare('SELECT id, first_name, last_name FROM students WHERE id = ?').get(id) as any;
  if (!student) {
    res.status(404).json({ error: 'Student not found' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE students
    SET medical_waiver_signed = ?, medical_waiver_date = ?, medical_notes = COALESCE(?, medical_notes), updated_at = ?
    WHERE id = ?
  `).run(signed ? 1 : 0, date || now.slice(0, 10), notes || null, now, id);

  logAudit({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: signed ? 'MEDICAL_WAIVER_SIGNED' : 'MEDICAL_WAIVER_REVOKED',
    entityType: 'STUDENT_HEALTH',
    entityId: id,
    details: { studentName: `${student.first_name} ${student.last_name}`, date: date || now },
    ip: req.ip,
  });

  res.json({ success: true, message: 'Medical waiver status updated' });
});

// ==========================================
// 4. CRM INQUIRIES & LEADS PIPELINE
// ==========================================

apiRouter.get('/inquiries', requireAuth, (req: Request, res: Response): void => {
  const inquiries = db.prepare(`
    SELECT i.*, u.full_name as assigned_to_name
    FROM inquiries i
    LEFT JOIN users u ON i.assigned_to = u.id
    ORDER BY i.created_at DESC
  `).all();
  res.json(inquiries);
});

apiRouter.post('/inquiries', requireAuth, (req: Request, res: Response): void => {
  const {
    student_id,
    lead_name,
    lead_email,
    lead_phone,
    course_interest,
    channel,
    status,
    message,
    follow_up_date,
    assigned_to,
  } = req.body;

  if (!lead_name) {
    res.status(400).json({ error: 'Lead name is required' });
    return;
  }

  const id = 'inq_' + crypto.randomUUID().slice(0, 10);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO inquiries (
      id, student_id, lead_name, lead_email, lead_phone, course_interest,
      channel, status, message, follow_up_date, assigned_to, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    student_id || null,
    lead_name,
    lead_email || null,
    lead_phone || null,
    course_interest || null,
    channel || 'WhatsApp',
    status || 'new',
    message || null,
    follow_up_date || null,
    assigned_to || req.user!.id,
    now,
    now
  );

  res.status(201).json({ id, message: 'Inquiry logged successfully' });
});

apiRouter.patch('/inquiries/:id', requireAuth, (req: Request, res: Response): void => {
  const { id } = req.params;
  const { status, message, follow_up_date, assigned_to, course_interest } = req.body;

  const updates: string[] = ['updated_at = ?'];
  const values: any[] = [new Date().toISOString()];

  if (status !== undefined) { updates.push('status = ?'); values.push(status); }
  if (message !== undefined) { updates.push('message = ?'); values.push(message); }
  if (follow_up_date !== undefined) { updates.push('follow_up_date = ?'); values.push(follow_up_date); }
  if (assigned_to !== undefined) { updates.push('assigned_to = ?'); values.push(assigned_to); }
  if (course_interest !== undefined) { updates.push('course_interest = ?'); values.push(course_interest); }

  values.push(id);
  db.prepare(`UPDATE inquiries SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  res.json({ message: 'Inquiry updated' });
});

// ==========================================
// 5. COURSES, SESSIONS & BOOKINGS
// ==========================================

apiRouter.get('/courses', requireAuth, (req: Request, res: Response): void => {
  const courses = db.prepare('SELECT * FROM courses ORDER BY price_eur ASC').all();
  res.json(courses);
});

apiRouter.post('/courses', requireAuth, requireRole(['owner', 'operations_manager']), (req: Request, res: Response): void => {
  const { code, title, agency, level, duration_days, max_capacity, price_eur, price_egp, description, prerequisites } = req.body;
  if (!code || !title || !agency || !level || !price_eur) {
    res.status(400).json({ error: 'Code, title, agency, level, and price in EUR are required' });
    return;
  }

  const id = 'crs_' + crypto.randomUUID().slice(0, 10);
  db.prepare(`
    INSERT INTO courses (id, code, title, agency, level, duration_days, max_capacity, price_eur, price_egp, description, prerequisites, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(
    id,
    code.trim().toUpperCase(),
    title.trim(),
    agency,
    level,
    duration_days || 2,
    max_capacity || 4,
    Number(price_eur),
    Number(price_egp) || Number(price_eur) * 52,
    description || '',
    prerequisites || '',
    new Date().toISOString()
  );

  res.status(201).json({ id, message: 'Course added to catalog' });
});

apiRouter.get('/sessions', requireAuth, (req: Request, res: Response): void => {
  const sessions = db.prepare(`
    SELECT s.*, c.title as course_title, c.code as course_code, c.agency, c.price_eur, c.price_egp,
           u.full_name as instructor_name,
           (SELECT COUNT(*) FROM bookings b WHERE b.session_id = s.id AND b.status != 'cancelled') as enrolled_count
    FROM course_sessions s
    JOIN courses c ON s.course_id = c.id
    LEFT JOIN users u ON s.instructor_id = u.id
    ORDER BY s.start_date ASC
  `).all();

  // If instructor, flag their own assigned sessions
  res.json(sessions);
});

apiRouter.post('/sessions', requireAuth, requireRole(['owner', 'operations_manager', 'front_desk_crm']), (req: Request, res: Response): void => {
  const { course_id, instructor_id, start_date, end_date, location, max_capacity, notes } = req.body;
  if (!course_id || !start_date || !end_date) {
    res.status(400).json({ error: 'Course, start date, and end date are required' });
    return;
  }

  // Conflict check for assigned instructor
  if (instructor_id) {
    const conflict = db.prepare(`
      SELECT id, start_date, end_date FROM course_sessions
      WHERE instructor_id = ? AND status != 'cancelled'
        AND NOT (end_date < ? OR start_date > ?)
    `).get(instructor_id, start_date, end_date);

    if (conflict) {
      res.status(409).json({
        error: 'Instructor conflict detected! This instructor is already assigned to another session during these dates.',
        conflictSession: conflict,
      });
      return;
    }
  }

  const id = 'ses_' + crypto.randomUUID().slice(0, 10);
  db.prepare(`
    INSERT INTO course_sessions (id, course_id, instructor_id, start_date, end_date, location, status, max_capacity, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?)
  `).run(
    id,
    course_id,
    instructor_id || null,
    start_date,
    end_date,
    location || 'Lighthouse Bay / Blue Hole',
    max_capacity || 4,
    notes || null,
    new Date().toISOString()
  );

  res.status(201).json({ id, message: 'Course session scheduled' });
});

apiRouter.patch('/sessions/:id', requireAuth, requireRole(['owner', 'operations_manager']), (req: Request, res: Response): void => {
  const { id } = req.params;
  const { instructor_id, status, location, notes, max_capacity } = req.body;

  const updates: string[] = [];
  const values: any[] = [];

  if (instructor_id !== undefined) { updates.push('instructor_id = ?'); values.push(instructor_id || null); }
  if (status !== undefined) { updates.push('status = ?'); values.push(status); }
  if (location !== undefined) { updates.push('location = ?'); values.push(location); }
  if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
  if (max_capacity !== undefined) { updates.push('max_capacity = ?'); values.push(Number(max_capacity)); }

  if (updates.length === 0) {
    res.json({ message: 'No updates provided' });
    return;
  }

  values.push(id);
  db.prepare(`UPDATE course_sessions SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ message: 'Session updated' });
});

apiRouter.get('/bookings', requireAuth, (req: Request, res: Response): void => {
  const isInstructor = req.user!.role === 'instructor';
  
  let query = `
    SELECT b.*,
           s.first_name, s.last_name, s.email as student_email, s.phone as student_phone, s.nationality, s.medical_waiver_signed,
           c.title as course_title, c.code as course_code,
           cs.start_date, cs.end_date, cs.location, cs.instructor_id,
           u.full_name as instructor_name
    FROM bookings b
    JOIN students s ON b.student_id = s.id
    JOIN courses c ON b.course_id = c.id
    LEFT JOIN course_sessions cs ON b.session_id = cs.id
    LEFT JOIN users u ON cs.instructor_id = u.id
  `;

  // Instructors only see their own assigned course bookings or general bookings without sensitive pricing
  const rows = db.prepare(query + ' ORDER BY b.booking_date DESC').all() as any[];

  if (isInstructor) {
    // Hide payment financial figures from instructors
    res.json(rows.map(r => ({
      ...r,
      price: undefined,
      payment_status: undefined,
    })));
  } else {
    res.json(rows);
  }
});

apiRouter.post('/bookings', requireAuth, (req: Request, res: Response): void => {
  const { student_id, course_id, session_id, price, currency, payment_status, notes } = req.body;
  if (!student_id || !course_id) {
    res.status(400).json({ error: 'Student and Course are required' });
    return;
  }

  // Check capacity if assigned to a session
  if (session_id) {
    const session = db.prepare('SELECT max_capacity FROM course_sessions WHERE id = ?').get(session_id) as any;
    const currentEnrolled = (db.prepare('SELECT COUNT(*) as count FROM bookings WHERE session_id = ? AND status != "cancelled"').get(session_id) as any).count;
    if (session && currentEnrolled >= session.max_capacity) {
      res.status(400).json({ error: `Session is full (Capacity: ${session.max_capacity} students).` });
      return;
    }
  }

  const id = 'bkg_' + crypto.randomUUID().slice(0, 10);
  const bookingNumber = 'FD-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO bookings (
      id, booking_number, student_id, course_id, session_id, booking_date,
      status, price, currency, payment_status, notes, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    bookingNumber,
    student_id,
    course_id,
    session_id || null,
    now.slice(0, 10),
    Number(price) || 0,
    currency || 'EUR',
    payment_status || 'unpaid',
    notes || null,
    req.user!.id,
    now,
    now
  );

  // If unpaid or partially paid, automatically draft an invoice for convenience if requested
  const invoiceId = 'inv_' + crypto.randomUUID().slice(0, 10);
  const invoiceNumber = 'INV-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
  const course = db.prepare('SELECT title, price_eur FROM courses WHERE id = ?').get(course_id) as any;

  db.prepare(`
    INSERT INTO invoices (
      id, invoice_number, student_id, booking_id, issue_date, due_date,
      currency, subtotal, tax_rate, tax_amount, total_amount, paid_amount,
      status, notes, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    invoiceId,
    invoiceNumber,
    student_id,
    id,
    now.slice(0, 10),
    now.slice(0, 10),
    currency || 'EUR',
    Number(price) || 0,
    Number(price) || 0,
    payment_status === 'paid' ? Number(price) : 0,
    payment_status === 'paid' ? 'paid' : 'issued',
    `Automatic invoice for ${course ? course.title : 'course'} booking ${bookingNumber}`,
    req.user!.id,
    now,
    now
  );

  db.prepare(`
    INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, total_price)
    VALUES (?, ?, ?, 1, ?, ?)
  `).run(`item_${invoiceId}`, invoiceId, course ? course.title : 'Course Enrollment', Number(price) || 0, Number(price) || 0);

  logAudit({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: 'CREATE_BOOKING',
    entityType: 'BOOKING',
    entityId: id,
    details: { bookingNumber, student_id, course_id, price },
    ip: req.ip,
  });

  res.status(201).json({ id, bookingNumber, invoiceId, message: 'Booking confirmed and invoice generated' });
});

apiRouter.patch('/bookings/:id', requireAuth, (req: Request, res: Response): void => {
  const { id } = req.params;
  const { status, payment_status, notes, session_id } = req.body;

  const updates: string[] = ['updated_at = ?'];
  const values: any[] = [new Date().toISOString()];

  if (status !== undefined) { updates.push('status = ?'); values.push(status); }
  if (payment_status !== undefined) { updates.push('payment_status = ?'); values.push(payment_status); }
  if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
  if (session_id !== undefined) { updates.push('session_id = ?'); values.push(session_id || null); }

  values.push(id);
  db.prepare(`UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  res.json({ message: 'Booking updated' });
});

// ==========================================
// 6. DAILY DAHAB ACTIVITY BOARD & OCEAN OPS
// ==========================================

apiRouter.get('/activities', requireAuth, (req: Request, res: Response): void => {
  const { date } = req.query;
  let query = `
    SELECT a.*, u.full_name as lead_instructor_name
    FROM daily_activities a
    LEFT JOIN users u ON a.lead_instructor_id = u.id
  `;
  const params: any[] = [];
  if (date) {
    query += ' WHERE a.activity_date = ?';
    params.push(date);
  }
  query += ' ORDER BY a.activity_date DESC, a.start_time ASC';

  const activities = db.prepare(query).all(...params) as any[];

  // Attach participant rosters to each activity
  const getParticipants = db.prepare(`
    SELECT ap.*, s.first_name, s.last_name, s.certification_agency, s.certification_level, s.medical_waiver_signed
    FROM activity_participants ap
    JOIN students s ON ap.student_id = s.id
    WHERE ap.activity_id = ?
  `);

  const enriched = activities.map((act) => ({
    ...act,
    participants: getParticipants.all(act.id),
  }));

  res.json(enriched);
});

apiRouter.post('/activities', requireAuth, requireRole(['owner', 'operations_manager', 'instructor']), (req: Request, res: Response): void => {
  const {
    title,
    activity_type,
    location,
    activity_date,
    start_time,
    end_time,
    lead_instructor_id,
    safety_diver_name,
    max_depth_target,
    max_pax,
    sea_conditions,
    notes,
  } = req.body;

  if (!title || !location || !activity_date || !start_time || !end_time) {
    res.status(400).json({ error: 'Title, location, date, start time, and end time are required' });
    return;
  }

  const id = 'act_' + crypto.randomUUID().slice(0, 10);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO daily_activities (
      id, title, activity_type, location, activity_date, start_time, end_time,
      lead_instructor_id, safety_diver_name, max_depth_target, max_pax, current_pax,
      status, sea_conditions, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'planned', ?, ?, ?)
  `).run(
    id,
    title,
    activity_type || 'depth_training',
    location,
    activity_date,
    start_time,
    end_time,
    lead_instructor_id || null,
    safety_diver_name || null,
    Number(max_depth_target) || 0,
    Number(max_pax) || 6,
    sea_conditions || 'Calm, 24°C, 30m visibility',
    notes || null,
    now
  );

  res.status(201).json({ id, message: 'Dahab ocean activity scheduled' });
});

apiRouter.patch('/activities/:id', requireAuth, (req: Request, res: Response): void => {
  const { id } = req.params;
  const { status, sea_conditions, notes, lead_instructor_id, safety_diver_name, current_pax } = req.body;

  const updates: string[] = [];
  const values: any[] = [];

  if (status !== undefined) { updates.push('status = ?'); values.push(status); }
  if (sea_conditions !== undefined) { updates.push('sea_conditions = ?'); values.push(sea_conditions); }
  if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
  if (lead_instructor_id !== undefined) { updates.push('lead_instructor_id = ?'); values.push(lead_instructor_id); }
  if (safety_diver_name !== undefined) { updates.push('safety_diver_name = ?'); values.push(safety_diver_name); }
  if (current_pax !== undefined) { updates.push('current_pax = ?'); values.push(Number(current_pax)); }

  if (updates.length === 0) {
    res.json({ message: 'No updates provided' });
    return;
  }

  values.push(id);
  db.prepare(`UPDATE daily_activities SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ message: 'Activity board updated' });
});

apiRouter.post('/activities/:id/participants', requireAuth, (req: Request, res: Response): void => {
  const { id } = req.params;
  const { student_id, attendance_status, depth_achieved, notes } = req.body;

  if (!student_id) {
    res.status(400).json({ error: 'Student ID required' });
    return;
  }

  const partId = 'ap_' + crypto.randomUUID().slice(0, 10);
  db.prepare(`
    INSERT INTO activity_participants (id, activity_id, student_id, attendance_status, depth_achieved, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(partId, id, student_id, attendance_status || 'checked_in', Number(depth_achieved) || 0, notes || null);

  // Update current_pax count
  const count = (db.prepare('SELECT COUNT(*) as c FROM activity_participants WHERE activity_id = ?').get(id) as any).c;
  db.prepare('UPDATE daily_activities SET current_pax = ? WHERE id = ?').run(count, id);

  res.status(201).json({ id: partId, message: 'Participant added to ocean session' });
});

// ==========================================
// 7. FINANCE & BILLING MODULE (Strict Auth)
// ==========================================

apiRouter.get('/finance/invoices', requireAuth, requireRole(['owner', 'finance']), (req: Request, res: Response): void => {
  const invoices = db.prepare(`
    SELECT inv.*, s.first_name, s.last_name, s.email as student_email
    FROM invoices inv
    JOIN students s ON inv.student_id = s.id
    ORDER BY inv.issue_date DESC
  `).all() as any[];

  const getItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?');
  const getPayments = db.prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC');

  const enriched = invoices.map(inv => ({
    ...inv,
    items: getItems.all(inv.id),
    payments: getPayments.all(inv.id),
  }));

  res.json(enriched);
});

apiRouter.post('/finance/invoices', requireAuth, requireRole(['owner', 'finance']), (req: Request, res: Response): void => {
  const { student_id, booking_id, issue_date, due_date, currency, tax_rate, items, notes } = req.body;
  if (!student_id || !items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Student and at least one line item are required' });
    return;
  }

  let subtotal = 0;
  for (const it of items) {
    subtotal += (Number(it.quantity) || 1) * (Number(it.unit_price) || 0);
  }

  const taxRate = Number(tax_rate) || 0;
  const taxAmount = (subtotal * taxRate) / 100;
  const totalAmount = subtotal + taxAmount;

  const id = 'inv_' + crypto.randomUUID().slice(0, 10);
  const invoiceNumber = 'INV-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO invoices (
      id, invoice_number, student_id, booking_id, issue_date, due_date,
      currency, subtotal, tax_rate, tax_amount, total_amount, paid_amount,
      status, notes, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'issued', ?, ?, ?, ?)
  `).run(
    id,
    invoiceNumber,
    student_id,
    booking_id || null,
    issue_date || now.slice(0, 10),
    due_date || now.slice(0, 10),
    currency || 'EUR',
    subtotal,
    taxRate,
    taxAmount,
    totalAmount,
    notes || null,
    req.user!.id,
    now,
    now
  );

  const insertItem = db.prepare(`
    INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, total_price)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.unit_price) || 0;
    insertItem.run(`item_${id}_${i}`, id, item.description, qty, unitPrice, qty * unitPrice);
  }

  logAudit({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: 'CREATE_INVOICE',
    entityType: 'INVOICE',
    entityId: id,
    details: { invoiceNumber, student_id, totalAmount, currency: currency || 'EUR' },
    ip: req.ip,
  });

  res.status(201).json({ id, invoiceNumber, message: 'Invoice created successfully' });
});

apiRouter.post('/finance/invoices/:id/payments', requireAuth, requireRole(['owner', 'finance']), (req: Request, res: Response): void => {
  const { id } = req.params;
  const { amount, currency, payment_method, payment_date, reference_number, notes } = req.body;

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as any;
  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  const pmtAmount = Number(amount);
  if (!pmtAmount || pmtAmount <= 0) {
    res.status(400).json({ error: 'Valid payment amount is required' });
    return;
  }

  const paymentId = 'pmt_' + crypto.randomUUID().slice(0, 10);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO payments (id, invoice_id, amount, currency, payment_method, payment_date, reference_number, notes, recorded_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    paymentId,
    id,
    pmtAmount,
    currency || invoice.currency,
    payment_method || 'Cash EUR',
    payment_date || now.slice(0, 10),
    reference_number || null,
    notes || null,
    req.user!.id,
    now
  );

  const newPaidAmount = invoice.paid_amount + pmtAmount;
  let newStatus = invoice.status;
  if (newPaidAmount >= invoice.total_amount) {
    newStatus = 'paid';
  } else if (newPaidAmount > 0) {
    newStatus = 'partially_paid';
  }

  db.prepare(`
    UPDATE invoices
    SET paid_amount = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(newPaidAmount, newStatus, now, id);

  // If this invoice is tied to a booking, keep booking payment_status synchronized!
  if (invoice.booking_id) {
    db.prepare('UPDATE bookings SET payment_status = ? WHERE id = ?').run(newStatus, invoice.booking_id);
  }

  logAudit({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: 'RECORD_PAYMENT',
    entityType: 'PAYMENT',
    entityId: paymentId,
    details: { invoiceId: id, amount: pmtAmount, payment_method, newPaidAmount, newStatus },
    ip: req.ip,
  });

  res.status(201).json({ paymentId, newPaidAmount, status: newStatus, message: 'Payment recorded in ledger' });
});

apiRouter.get('/finance/expenses', requireAuth, requireRole(['owner', 'finance']), (req: Request, res: Response): void => {
  const expenses = db.prepare(`
    SELECT e.*, u.full_name as approved_by_name
    FROM expenses e
    LEFT JOIN users u ON e.approved_by = u.id
    ORDER BY e.expense_date DESC
  `).all();
  res.json(expenses);
});

apiRouter.post('/finance/expenses', requireAuth, requireRole(['owner', 'finance']), (req: Request, res: Response): void => {
  const { category, vendor_name, amount, currency, expense_date, description, receipt_ref } = req.body;
  if (!category || !vendor_name || !amount || !description) {
    res.status(400).json({ error: 'Category, vendor name, amount, and description are required' });
    return;
  }

  const id = 'exp_' + crypto.randomUUID().slice(0, 10);
  const expenseNumber = 'EXP-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO expenses (
      id, expense_number, category, vendor_name, amount, currency,
      expense_date, status, approved_by, description, receipt_ref, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, ?, ?, ?)
  `).run(
    id,
    expenseNumber,
    category,
    vendor_name,
    Number(amount),
    currency || 'EGP',
    expense_date || now.slice(0, 10),
    req.user!.id,
    description,
    receipt_ref || null,
    req.user!.id,
    now
  );

  logAudit({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: 'RECORD_EXPENSE',
    entityType: 'EXPENSE',
    entityId: id,
    details: { expenseNumber, category, vendor_name, amount, currency: currency || 'EGP' },
    ip: req.ip,
  });

  res.status(201).json({ id, expenseNumber, message: 'Expense recorded' });
});

apiRouter.get('/finance/summary', requireAuth, requireRole(['owner', 'finance']), (req: Request, res: Response): void => {
  // Aggregate revenue and expenses by currency
  const invoiceStats = db.prepare(`
    SELECT currency,
           COUNT(*) as invoice_count,
           SUM(total_amount) as total_invoiced,
           SUM(paid_amount) as total_collected,
           SUM(total_amount - paid_amount) as outstanding
    FROM invoices
    WHERE status != 'cancelled'
    GROUP BY currency
  `).all();

  const expenseStats = db.prepare(`
    SELECT currency,
           COUNT(*) as expense_count,
           SUM(amount) as total_expenses
    FROM expenses
    WHERE status != 'rejected'
    GROUP BY currency
  `).all();

  const overdueInvoices = db.prepare(`
    SELECT COUNT(*) as count, SUM(total_amount - paid_amount) as amount
    FROM invoices
    WHERE status IN ('issued', 'partially_paid') AND due_date < date('now')
  `).get();

  res.json({
    invoiceStats,
    expenseStats,
    overdueInvoices,
  });
});

// ==========================================
// 8. PAYROLL MODULE (Strict Auth: Owner, Finance, HR)
// ==========================================

apiRouter.get('/payroll/periods', requireAuth, requireRole(['owner', 'finance', 'hr']), (req: Request, res: Response): void => {
  const periods = db.prepare(`
    SELECT p.*, u.full_name as approved_by_name,
           (SELECT COUNT(*) FROM payroll_records r WHERE r.period_id = p.id) as staff_count,
           (SELECT SUM(gross_pay) FROM payroll_records r WHERE r.period_id = p.id) as total_gross,
           (SELECT SUM(net_pay) FROM payroll_records r WHERE r.period_id = p.id) as total_net
    FROM payroll_periods p
    LEFT JOIN users u ON p.approved_by = u.id
    ORDER BY p.start_date DESC
  `).all();
  res.json(periods);
});

apiRouter.post('/payroll/periods', requireAuth, requireRole(['owner', 'finance', 'hr']), (req: Request, res: Response): void => {
  const { period_name, start_date, end_date, notes } = req.body;
  if (!period_name || !start_date || !end_date) {
    res.status(400).json({ error: 'Period name, start date, and end date are required' });
    return;
  }

  const id = 'pr_' + crypto.randomUUID().slice(0, 10);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO payroll_periods (id, period_name, start_date, end_date, status, notes, created_at)
    VALUES (?, ?, ?, ?, 'draft', ?, ?)
  `).run(id, period_name, start_date, end_date, notes || null, now);

  // Automatically generate draft records for all active staff
  const staff = db.prepare('SELECT id, role, monthly_salary, session_commission FROM users WHERE is_active = 1').all() as any[];
  const insertRecord = db.prepare(`
    INSERT INTO payroll_records (
      id, period_id, employee_id, base_salary, session_commission, sessions_taught,
      bonuses, deductions, gross_pay, tax_withholding, net_pay, currency, status, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?, 0, ?, 'EUR', 'pending', ?, ?)
  `);

  for (const s of staff) {
    const recId = 'rec_' + crypto.randomUUID().slice(0, 10);
    const base = s.monthly_salary || 0;
    insertRecord.run(
      recId,
      id,
      s.id,
      base,
      s.session_commission || 0,
      base,
      base,
      'Base monthly compensation draft',
      now
    );
  }

  logAudit({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: 'CREATE_PAYROLL_PERIOD',
    entityType: 'PAYROLL',
    entityId: id,
    details: { period_name, start_date, end_date },
    ip: req.ip,
  });

  res.status(201).json({ id, message: 'Payroll period initialized for active staff' });
});

apiRouter.get('/payroll/records/:periodId', requireAuth, requireRole(['owner', 'finance', 'hr']), (req: Request, res: Response): void => {
  const { periodId } = req.params;
  const records = db.prepare(`
    SELECT r.*, u.full_name, u.role, u.email
    FROM payroll_records r
    JOIN users u ON r.employee_id = u.id
    WHERE r.period_id = ?
    ORDER BY u.full_name ASC
  `).all(periodId);
  res.json(records);
});

apiRouter.patch('/payroll/records/:id', requireAuth, requireRole(['owner', 'finance', 'hr']), (req: Request, res: Response): void => {
  const { id } = req.params;
  const { base_salary, sessions_taught, session_commission, bonuses, deductions, tax_withholding, notes, status } = req.body;

  const rec = db.prepare('SELECT * FROM payroll_records WHERE id = ?').get(id) as any;
  if (!rec) {
    res.status(404).json({ error: 'Payroll record not found' });
    return;
  }

  const base = base_salary !== undefined ? Number(base_salary) : rec.base_salary;
  const sessions = sessions_taught !== undefined ? Number(sessions_taught) : rec.sessions_taught;
  const commRate = session_commission !== undefined ? Number(session_commission) : rec.session_commission;
  const bonus = bonuses !== undefined ? Number(bonuses) : rec.bonuses;
  const deduct = deductions !== undefined ? Number(deductions) : rec.deductions;
  const tax = tax_withholding !== undefined ? Number(tax_withholding) : rec.tax_withholding;

  const totalCommission = sessions * commRate;
  const gross = base + totalCommission + bonus;
  const net = gross - deduct - tax;

  db.prepare(`
    UPDATE payroll_records
    SET base_salary = ?, sessions_taught = ?, session_commission = ?, bonuses = ?,
        deductions = ?, tax_withholding = ?, gross_pay = ?, net_pay = ?,
        notes = COALESCE(?, notes), status = COALESCE(?, status)
    WHERE id = ?
  `).run(base, sessions, commRate, bonus, deduct, tax, gross, net, notes || null, status || null, id);

  logAudit({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: 'UPDATE_PAYROLL_RECORD',
    entityType: 'PAYROLL_RECORD',
    entityId: id,
    details: { gross, net, sessions, bonus, deduct },
    ip: req.ip,
  });

  res.json({ message: 'Payroll record updated', gross, net });
});

apiRouter.post('/payroll/periods/:id/approve', requireAuth, requireRole(['owner']), (req: Request, res: Response): void => {
  const { id } = req.params;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE payroll_periods
    SET status = 'approved', approved_by = ?, approved_at = ?
    WHERE id = ?
  `).run(req.user!.id, now, id);

  db.prepare(`
    UPDATE payroll_records
    SET status = 'approved'
    WHERE period_id = ?
  `).run(id);

  logAudit({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: 'APPROVE_PAYROLL_PERIOD',
    entityType: 'PAYROLL',
    entityId: id,
    details: { approvedAt: now },
    ip: req.ip,
  });

  res.json({ success: true, message: 'Payroll period approved by Center Owner' });
});

// ==========================================
// 9. EQUIPMENT & GEAR INVENTORY
// ==========================================

apiRouter.get('/equipment', requireAuth, (req: Request, res: Response): void => {
  const { category, lowStock } = req.query;
  let query = 'SELECT * FROM equipment WHERE 1=1';
  const params: any[] = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (lowStock === 'true') {
    query += ' AND quantity_available <= low_stock_threshold';
  }

  query += ' ORDER BY item_name ASC';
  const items = db.prepare(query).all(...params);
  res.json(items);
});

apiRouter.post('/equipment', requireAuth, requireRole(['owner', 'operations_manager', 'equipment_manager']), (req: Request, res: Response): void => {
  const { item_name, category, size, brand_model, quantity_total, condition, location, low_stock_threshold, notes } = req.body;
  if (!item_name || !category) {
    res.status(400).json({ error: 'Item name and category are required' });
    return;
  }

  const id = 'eq_' + crypto.randomUUID().slice(0, 10);
  const barcode = 'FD-GEAR-' + Math.floor(1000 + Math.random() * 9000);
  const now = new Date().toISOString();
  const qty = Number(quantity_total) || 1;

  db.prepare(`
    INSERT INTO equipment (
      id, barcode, item_name, category, size, brand_model,
      quantity_total, quantity_available, condition, location,
      last_inspected, low_stock_threshold, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    barcode,
    item_name,
    category,
    size || null,
    brand_model || null,
    qty,
    qty,
    condition || 'excellent',
    location || 'Gear Room A - Dahab Main',
    now.slice(0, 10),
    Number(low_stock_threshold) || 2,
    notes || null,
    now,
    now
  );

  res.status(201).json({ id, barcode, message: 'Gear registered in inventory' });
});

apiRouter.patch('/equipment/:id', requireAuth, requireRole(['owner', 'operations_manager', 'equipment_manager']), (req: Request, res: Response): void => {
  const { id } = req.params;
  const { condition, quantity_total, quantity_available, location, last_inspected, notes } = req.body;

  const updates: string[] = ['updated_at = ?'];
  const values: any[] = [new Date().toISOString()];

  if (condition !== undefined) { updates.push('condition = ?'); values.push(condition); }
  if (quantity_total !== undefined) { updates.push('quantity_total = ?'); values.push(Number(quantity_total)); }
  if (quantity_available !== undefined) { updates.push('quantity_available = ?'); values.push(Number(quantity_available)); }
  if (location !== undefined) { updates.push('location = ?'); values.push(location); }
  if (last_inspected !== undefined) { updates.push('last_inspected = ?'); values.push(last_inspected); }
  if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }

  values.push(id);
  db.prepare(`UPDATE equipment SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ message: 'Equipment inventory updated' });
});

apiRouter.post('/equipment/:id/checkout', requireAuth, (req: Request, res: Response): void => {
  const { id } = req.params;
  const { student_id, instructor_id, expected_return, condition_out, notes } = req.body;

  const item = db.prepare('SELECT * FROM equipment WHERE id = ?').get(id) as any;
  if (!item) {
    res.status(404).json({ error: 'Equipment not found' });
    return;
  }

  if (item.quantity_available <= 0) {
    res.status(400).json({ error: 'No units available for checkout. Item is out of stock.' });
    return;
  }

  const checkoutId = 'chk_' + crypto.randomUUID().slice(0, 10);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO equipment_checkouts (id, equipment_id, student_id, instructor_id, checkout_time, expected_return, condition_out, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    checkoutId,
    id,
    student_id || null,
    instructor_id || null,
    now,
    expected_return || null,
    condition_out || item.condition,
    notes || null,
    now
  );

  db.prepare('UPDATE equipment SET quantity_available = quantity_available - 1, updated_at = ? WHERE id = ?').run(now, id);

  res.status(201).json({ checkoutId, message: 'Gear checkout recorded' });
});

apiRouter.post('/equipment/checkouts/:id/return', requireAuth, (req: Request, res: Response): void => {
  const { id } = req.params;
  const { condition_in, notes } = req.body;

  const chk = db.prepare('SELECT * FROM equipment_checkouts WHERE id = ?').get(id) as any;
  if (!chk) {
    res.status(404).json({ error: 'Checkout record not found' });
    return;
  }

  if (chk.actual_return) {
    res.status(400).json({ error: 'Gear has already been returned' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE equipment_checkouts
    SET actual_return = ?, condition_in = ?, notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(now, condition_in || 'good', notes || null, id);

  db.prepare('UPDATE equipment SET quantity_available = quantity_available + 1, condition = COALESCE(?, condition), updated_at = ? WHERE id = ?')
    .run(condition_in || null, now, chk.equipment_id);

  res.json({ success: true, message: 'Gear returned to inventory' });
});

// ==========================================
// 10. AUDIT LOGS (Owner Only)
// ==========================================

apiRouter.get('/audit-logs', requireAuth, requireRole(['owner']), (req: Request, res: Response): void => {
  const { search, limit } = req.query;
  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params: any[] = [];

  if (search) {
    query += ' AND (action LIKE ? OR entity_type LIKE ? OR user_email LIKE ? OR details LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(Number(limit) || 100);

  const logs = db.prepare(query).all(...params);
  res.json(logs);
});

// ==========================================
// 11. SYSTEM SETTINGS & SECURE BACKUP
// ==========================================

apiRouter.get('/settings', requireAuth, (req: Request, res: Response): void => {
  const settingsRows = db.prepare('SELECT key, value FROM settings').all() as any[];
  const settingsMap: Record<string, string> = {};
  for (const s of settingsRows) {
    settingsMap[s.key] = s.value;
  }
  res.json(settingsMap);
});

apiRouter.patch('/settings', requireAuth, requireRole(['owner']), (req: Request, res: Response): void => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    res.status(400).json({ error: 'Invalid settings object' });
    return;
  }

  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(settings)) {
    upsert.run(key, String(value));
  }

  logAudit({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: 'UPDATE_SYSTEM_SETTINGS',
    entityType: 'SETTINGS',
    details: { changedKeys: Object.keys(settings) },
    ip: req.ip,
  });

  res.json({ message: 'Settings saved successfully' });
});

// Full database backup export in JSON format
apiRouter.get('/backup/export', requireAuth, requireRole(['owner']), (req: Request, res: Response): void => {
  const tables = [
    'users', 'students', 'inquiries', 'courses', 'course_sessions', 'bookings',
    'daily_activities', 'activity_participants', 'invoices', 'invoice_items',
    'payments', 'expenses', 'payroll_periods', 'payroll_records', 'equipment',
    'equipment_checkouts', 'settings', 'audit_logs'
  ];

  const backupData: Record<string, any[]> = {};
  for (const t of tables) {
    // Redact password hash and salt for users export
    if (t === 'users') {
      backupData[t] = db.prepare(`
        SELECT id, email, full_name, role, is_active, phone, emergency_contact, languages, certifications,
               hourly_rate, session_commission, monthly_salary, created_at, updated_at
        FROM users
      `).all();
    } else {
      backupData[t] = db.prepare(`SELECT * FROM ${t}`).all();
    }
  }

  logAudit({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: 'EXPORT_DATABASE_BACKUP',
    entityType: 'DATABASE',
    details: { timestamp: new Date().toISOString() },
    ip: req.ip,
  });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="freedive_dahab_backup_${new Date().toISOString().slice(0, 10)}.json"`);
  res.json({
    exportVersion: '1.0.0',
    centerName: 'Freedive Dahab Egypt',
    exportedAt: new Date().toISOString(),
    exportedBy: req.user!.email,
    data: backupData,
  });
});
