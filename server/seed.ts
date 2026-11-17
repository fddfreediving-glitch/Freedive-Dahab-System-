import { db } from './db.js';
import { hashPassword, logAudit } from './auth.js';

export function seedInitialData() {
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (existingUsers.count > 0) {
    // Database already has records
    return;
  }

  console.log('Seeding initial Freedive Dahab ERP data...');

  const now = new Date().toISOString();
  const defaultPw = 'Dahab2026!';

  // 1. Seed Staff Users with different roles
  const users = [
    {
      id: 'usr_owner_01',
      email: 'owner@freedivedahab.com',
      password: 'DahabOwner2026!',
      full_name: 'Captain Youssef Barakat',
      role: 'owner',
      phone: '+20 100 234 5678',
      languages: JSON.stringify(['English', 'Arabic']),
      certifications: JSON.stringify(['SSI Instructor Trainer', 'SSI Freediver Instructor', 'First Aid Instructor']),
      monthly_salary: 3500,
      hourly_rate: 45,
      session_commission: 30,
    },
    {
      id: 'usr_ops_01',
      email: 'karim.ops@freedivedahab.com',
      password: 'KarimDahab2026!',
      full_name: 'Karim Al-Husseini',
      role: 'operations_manager',
      phone: '+20 101 987 6543',
      languages: JSON.stringify(['English', 'Arabic', 'Russian']),
      certifications: JSON.stringify(['SSI Level 3', 'Chamber Emergency Tender']),
      monthly_salary: 1800,
      hourly_rate: 20,
      session_commission: 15,
    },
    {
      id: 'usr_crm_01',
      email: 'nour.crm@freedivedahab.com',
      password: 'NourDahab2026!',
      full_name: 'Nour Soliman',
      role: 'front_desk_crm',
      phone: '+20 109 456 7890',
      languages: JSON.stringify(['English', 'Arabic', 'French']),
      certifications: JSON.stringify(['SSI Level 1']),
      monthly_salary: 1100,
      hourly_rate: 12,
      session_commission: 0,
    },
    {
      id: 'usr_inst_01',
      email: 'tariq.instructor@freedivedahab.com',
      password: 'TariqDahab2026!',
      full_name: 'Tariq Fayed',
      role: 'instructor',
      phone: '+20 112 345 6789',
      languages: JSON.stringify(['English', 'Arabic', 'German']),
      certifications: JSON.stringify(['SSI Instructor Trainer', 'SSI Level 3', '85m Deep Safety']),
      monthly_salary: 950,
      hourly_rate: 25,
      session_commission: 35,
    },
    {
      id: 'usr_inst_02',
      email: 'elena.instructor@freedivedahab.com',
      password: 'ElenaDahab2026!',
      full_name: 'Elena Rostova',
      role: 'instructor',
      phone: '+20 115 876 5432',
      languages: JSON.stringify(['English', 'Russian', 'Italian']),
      certifications: JSON.stringify(['SSI Instructor', 'Mouthfill Specialist']),
      monthly_salary: 950,
      hourly_rate: 25,
      session_commission: 35,
    },
    {
      id: 'usr_fin_01',
      email: 'layla.finance@freedivedahab.com',
      password: 'LaylaDahab2026!',
      full_name: 'Layla El-Sayed',
      role: 'finance',
      phone: '+20 102 333 4444',
      languages: JSON.stringify(['English', 'Arabic']),
      certifications: JSON.stringify(['Certified Financial Accountant']),
      monthly_salary: 1600,
      hourly_rate: 20,
      session_commission: 0,
    },
    {
      id: 'usr_gear_01',
      email: 'ziad.gear@freedivedahab.com',
      password: 'ZiadDahab2026!',
      full_name: 'Ziad Mansour',
      role: 'equipment_manager',
      phone: '+20 120 777 8899',
      languages: JSON.stringify(['English', 'Arabic']),
      certifications: JSON.stringify(['Equipment Technician Level 2', 'Nitrox & O2 Blender']),
      monthly_salary: 1100,
      hourly_rate: 14,
      session_commission: 0,
    },
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, full_name, role, is_active, phone, languages, certifications, monthly_salary, hourly_rate, session_commission, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const u of users) {
    const { hash, salt } = hashPassword(u.password);
    insertUser.run(
      u.id,
      u.email,
      hash,
      salt,
      u.full_name,
      u.role,
      u.phone,
      u.languages,
      u.certifications,
      u.monthly_salary,
      u.hourly_rate,
      u.session_commission,
      now,
      now
    );
  }

  // 2. Seed Course Catalog (SSI curriculum; prices mirror src/data/posCatalog.ts)
  const courses = [
    {
      id: 'crs_ssi_freediver',
      code: 'SSI-L1',
      title: 'SSI Freediver',
      agency: 'SSI',
      level: 'Beginner',
      duration_days: 3,
      max_capacity: 4,
      price_eur: 310,
      price_egp: 0,
      description: 'Three-day entry certification covering breathing, relaxation, equalization, finning and rescue skills, with confined-water sessions and open-water dives to 12 m in Lighthouse Bay.',
      prerequisites: 'Able to swim 200 m unassisted and medically fit to dive.',
    },
    {
      id: 'crs_ssi_advanced',
      code: 'SSI-L2',
      title: 'SSI Advanced Freediver',
      agency: 'SSI',
      level: 'Intermediate',
      duration_days: 3,
      max_capacity: 4,
      price_eur: 360,
      price_egp: 0,
      description: 'Builds on the Freediver level with deeper equalization, free immersion and constant weight technique, and structured open-water dives to 20 m.',
      prerequisites: 'SSI Freediver certification or equivalent.',
    },
    {
      id: 'crs_ssi_performance',
      code: 'SSI-L3',
      title: 'SSI Performance Freediver',
      agency: 'SSI',
      level: 'Advanced',
      duration_days: 4,
      max_capacity: 3,
      price_eur: 480,
      price_egp: 0,
      description: 'Advanced training for divers targeting 30 m: refined Frenzel and mouthfill, turn and freefall technique, and coached depth progression in the Blue Hole.',
      prerequisites: 'SSI Advanced Freediver certification or equivalent.',
    },
    {
      id: 'crs_ssi_react_right',
      code: 'SSI-RR',
      title: 'SSI React Right',
      agency: 'SSI',
      level: 'Specialty',
      duration_days: 1,
      max_capacity: 6,
      price_eur: 130,
      price_egp: 0,
      description: 'First aid, CPR and emergency oxygen provider course for divers and dive professionals.',
      prerequisites: 'None.',
    },
    {
      id: 'crs_ssi_marine_ecology',
      code: 'SSI-ME',
      title: 'SSI Marine Ecology',
      agency: 'SSI',
      level: 'Specialty',
      duration_days: 2,
      max_capacity: 6,
      price_eur: 150,
      price_egp: 0,
      description: 'Red Sea reef ecosystems, conservation and responsible diving practices around Dahab’s dive sites.',
      prerequisites: 'Open to divers and snorkelers.',
    },
    {
      id: 'crs_mouthfill',
      code: 'FD-MOUTHFILL',
      title: 'Mouthfill Workshop',
      agency: 'Freedive Dahab Specialty',
      level: 'Advanced',
      duration_days: 1,
      max_capacity: 4,
      price_eur: 120,
      price_egp: 0,
      description: 'Practical workshop on mouthfill equalization for divers progressing beyond 25 m, with pool and open-water feedback.',
      prerequisites: 'SSI Advanced Freediver or equivalent.',
    },
    {
      id: 'crs_training_techniques',
      code: 'FD-TECHNIQUE',
      title: 'Training Techniques',
      agency: 'Freedive Dahab Specialty',
      level: 'All levels',
      duration_days: 1,
      max_capacity: 4,
      price_eur: 160,
      price_egp: 0,
      description: 'Coached technique session covering finning, body position, turns and safety drills. €135 per person for two or more.',
      prerequisites: 'SSI Freediver or equivalent.',
    },
    {
      id: 'crs_monofin',
      code: 'FD-MONOFIN',
      title: 'Monofin Class',
      agency: 'Freedive Dahab Specialty',
      level: 'All levels',
      duration_days: 1,
      max_capacity: 4,
      price_eur: 125,
      price_egp: 0,
      description: 'Introduction to monofin technique with video review and coached open-water practice. €110 per person for two or more.',
      prerequisites: 'Comfortable in open water.',
    },
  ];

  const insertCourse = db.prepare(`
    INSERT INTO courses (id, code, title, agency, level, duration_days, max_capacity, price_eur, price_egp, description, prerequisites, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  for (const c of courses) {
    insertCourse.run(c.id, c.code, c.title, c.agency, c.level, c.duration_days, c.max_capacity, c.price_eur, c.price_egp, c.description, c.prerequisites, now);
  }

  // 3. Seed Students
  const students = [
    {
      id: 'std_01',
      first_name: 'Maya',
      last_name: 'Lindemann',
      email: 'maya.lindemann@gmail.com',
      phone: '+49 171 992 4810',
      nationality: 'Germany',
      date_of_birth: '1995-04-12',
      certification_agency: 'SSI',
      certification_level: 'Level 2',
      total_depth_pb: 38.5,
      static_apnea_pb: '04:22',
      medical_waiver_signed: 1,
      medical_waiver_date: '2026-10-15',
      medical_notes: 'Cleared by diving physician on 2026-09-10. Mild past eustachian tube congestion when fatigued, takes hydration breaks.',
      emergency_contact_name: 'Stefan Lindemann (Brother)',
      emergency_contact_phone: '+49 171 883 1120',
      insurance_details: 'DAN Europe Diver Gold #DE-99412',
      source_channel: 'Instagram',
      status: 'active',
      notes: 'Focusing on dolphin kick technique for CWTB depth progression.',
    },
    {
      id: 'std_02',
      first_name: 'Ahmed',
      last_name: 'Mansour',
      email: 'ahmed.mansour.cairo@gmail.com',
      phone: '+20 100 812 3491',
      nationality: 'Egypt',
      date_of_birth: '1992-08-25',
      certification_agency: 'SSI',
      certification_level: 'Level 2',
      total_depth_pb: 43.0,
      static_apnea_pb: '05:05',
      medical_waiver_signed: 1,
      medical_waiver_date: '2026-10-20',
      medical_notes: 'Routine medical questionnaire: all negative, no asthma, no cardiovascular condition.',
      emergency_contact_name: 'Mona Mansour (Spouse)',
      emergency_contact_phone: '+20 100 999 1122',
      insurance_details: 'Egypt National Health + DiveCover Egypt',
      source_channel: 'Referral',
      status: 'active',
      notes: 'Preparing for the SSI Performance Freediver course in November.',
    },
    {
      id: 'std_03',
      first_name: 'Chloe',
      last_name: 'Martin',
      email: 'chloe.martin.paris@wanadoo.fr',
      phone: '+33 6 12 34 56 78',
      nationality: 'France',
      date_of_birth: '1998-11-03',
      certification_agency: 'None',
      certification_level: 'Beginner',
      total_depth_pb: 8.0,
      static_apnea_pb: '01:50',
      medical_waiver_signed: 1,
      medical_waiver_date: '2026-10-28',
      medical_notes: 'No medical conditions declared. Completed the standard freediving medical statement.',
      emergency_contact_name: 'Pierre Martin (Father)',
      emergency_contact_phone: '+33 6 98 76 54 32',
      insurance_details: 'Mondial Assistance / Allianz Travel',
      source_channel: 'Website',
      status: 'active',
      notes: 'Enrolled in SSI Freediver, very excited to explore Red Sea coral.',
    },
    {
      id: 'std_04',
      first_name: 'Luca',
      last_name: 'Rossi',
      email: 'luca.rossi.apnea@libero.it',
      phone: '+39 340 555 1234',
      nationality: 'Italy',
      date_of_birth: '1989-02-17',
      certification_agency: 'SSI',
      certification_level: 'Level 3',
      total_depth_pb: 56.0,
      static_apnea_pb: '05:40',
      medical_waiver_signed: 1,
      medical_waiver_date: '2026-10-10',
      medical_notes: 'Fit to dive letter issued by Dr. Moretti (Sports Medicine Milan), valid through 2027.',
      emergency_contact_name: 'Giulia Rossi (Sister)',
      emergency_contact_phone: '+39 340 123 9988',
      insurance_details: 'DAN Europe Pro Freediver #IT-44910',
      source_channel: 'Referral',
      status: 'active',
      notes: 'Regular deep depth trainee in Blue Hole. Monofin specialist.',
    },
    {
      id: 'std_05',
      first_name: 'Sarah',
      last_name: 'Al-Khatib',
      email: 'sarah.khatib@outlook.com',
      phone: '+962 7 9123 4567',
      nationality: 'Jordan',
      date_of_birth: '1996-06-30',
      certification_agency: 'SSI',
      certification_level: 'Level 1',
      total_depth_pb: 22.0,
      static_apnea_pb: '03:10',
      medical_waiver_signed: 1,
      medical_waiver_date: '2026-10-22',
      medical_notes: 'All standard clearances satisfied. Mild motion sickness on open water boats, wears ginger bands.',
      emergency_contact_name: 'Tareq Al-Khatib (Father)',
      emergency_contact_phone: '+962 7 8888 9999',
      insurance_details: 'Royal Jordanian Travel Medical',
      source_channel: 'WhatsApp',
      status: 'active',
      notes: 'Taking the Mouthfill workshop to prepare for SSI Level 2.',
    },
    {
      id: 'std_06',
      first_name: 'Viktor',
      last_name: 'Novak',
      email: 'v.novak.prague@seznam.cz',
      phone: '+420 721 849 201',
      nationality: 'Czech Republic',
      date_of_birth: '1993-09-14',
      certification_agency: 'SSI',
      certification_level: 'Level 1',
      total_depth_pb: 18.0,
      static_apnea_pb: '02:45',
      medical_waiver_signed: 0,
      medical_waiver_date: null,
      medical_notes: 'Pending signed waiver upon arrival in Dahab.',
      emergency_contact_name: 'Jana Novakova (Partner)',
      emergency_contact_phone: '+420 721 112 334',
      insurance_details: 'Europe Assistance',
      source_channel: 'Walk-in',
      status: 'inquiry',
      notes: 'Inquiring about progressing from SSI Level 1 to Level 2.',
    },
    {
      id: 'std_07',
      first_name: 'Kenji',
      last_name: 'Sato',
      email: 'kenji.sato.tokyo@gmail.com',
      phone: '+81 90 4455 6677',
      nationality: 'Japan',
      date_of_birth: '1991-03-22',
      certification_agency: 'SSI',
      certification_level: 'Level 1',
      total_depth_pb: 27.0,
      static_apnea_pb: '03:45',
      medical_waiver_signed: 1,
      medical_waiver_date: '2026-10-18',
      medical_notes: 'Standard clearance on file.',
      emergency_contact_name: 'Yuka Sato (Wife)',
      emergency_contact_phone: '+81 90 1122 3344',
      insurance_details: 'Tokio Marine Dive Insurance',
      source_channel: 'Instagram',
      status: 'active',
      notes: 'Interested in Blue Hole training sessions and underwater photography.',
    },
  ];

  const studentStays: Record<string, {
    whatsapp: string;
    arrival_date: string;
    departure_date: string;
    needs_accommodation: number;
    needs_airport_transfer: number;
  }> = {
    std_01: { whatsapp: '+49 171 992 4810', arrival_date: '2026-11-01', departure_date: '2026-11-09', needs_accommodation: 1, needs_airport_transfer: 1 },
    std_02: { whatsapp: '+20 100 812 3491', arrival_date: '2026-11-01', departure_date: '2026-11-05', needs_accommodation: 0, needs_airport_transfer: 0 },
    std_03: { whatsapp: '+33 6 12 34 56 78', arrival_date: '2026-10-27', departure_date: '2026-11-06', needs_accommodation: 1, needs_airport_transfer: 1 },
    std_04: { whatsapp: '+39 340 555 1234', arrival_date: '2026-11-08', departure_date: '2026-11-18', needs_accommodation: 1, needs_airport_transfer: 0 },
    std_05: { whatsapp: '+962 7 9123 4567', arrival_date: '2026-10-26', departure_date: '2026-11-02', needs_accommodation: 1, needs_airport_transfer: 1 },
    std_06: { whatsapp: '+420 721 849 201', arrival_date: '2026-11-20', departure_date: '2026-11-27', needs_accommodation: 1, needs_airport_transfer: 0 },
    std_07: { whatsapp: '+81 90 4455 6677', arrival_date: '2026-11-03', departure_date: '2026-11-12', needs_accommodation: 0, needs_airport_transfer: 1 },
  };

  const insertStudent = db.prepare(`
    INSERT INTO students (id, first_name, last_name, email, phone, whatsapp, arrival_date, departure_date, needs_accommodation, needs_airport_transfer, nationality, date_of_birth, certification_agency, certification_level, total_depth_pb, static_apnea_pb, medical_waiver_signed, medical_waiver_date, medical_notes, emergency_contact_name, emergency_contact_phone, insurance_details, source_channel, status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const s of students) {
    const stay = studentStays[s.id];
    insertStudent.run(
      s.id,
      s.first_name,
      s.last_name,
      s.email,
      s.phone,
      stay?.whatsapp ?? s.phone,
      stay?.arrival_date ?? null,
      stay?.departure_date ?? null,
      stay?.needs_accommodation ?? 0,
      stay?.needs_airport_transfer ?? 0,
      s.nationality,
      s.date_of_birth,
      s.certification_agency,
      s.certification_level,
      s.total_depth_pb,
      s.static_apnea_pb,
      s.medical_waiver_signed,
      s.medical_waiver_date,
      s.medical_notes,
      s.emergency_contact_name,
      s.emergency_contact_phone,
      s.insurance_details,
      s.source_channel,
      s.status,
      s.notes,
      now,
      now
    );
  }

  // 4. Seed Course Sessions & Bookings
  const sessions = [
    {
      id: 'ses_01',
      course_id: 'crs_ssi_freediver',
      instructor_id: 'usr_inst_01', // Tariq Fayed
      start_date: '2026-11-02',
      end_date: '2026-11-04',
      location: 'Lighthouse Bay & Blue Hole',
      status: 'scheduled',
      max_capacity: 4,
      buoy_count: 2,
      notes: 'Day 1 theory & confined water, Day 2 Lighthouse 8m-12m, Day 3 Blue Hole open-water dives.',
    },
    {
      id: 'ses_02',
      course_id: 'crs_ssi_advanced',
      instructor_id: 'usr_inst_02', // Elena Rostova
      start_date: '2026-11-03',
      end_date: '2026-11-05',
      location: 'Blue Hole 50m Line',
      status: 'scheduled',
      max_capacity: 3,
      buoy_count: 2,
      notes: 'Advanced equalization, free immersion and constant weight progression to 20m.',
    },
    {
      id: 'ses_03',
      course_id: 'crs_mouthfill',
      instructor_id: 'usr_inst_02', // Elena Rostova
      start_date: '2026-11-05',
      end_date: '2026-11-05',
      location: 'Freedive Dahab Studio A & Lighthouse Bay',
      status: 'scheduled',
      max_capacity: 4,
      buoy_count: 1,
      notes: 'Hands-on mouthfill feedback, camera analysis of soft palate control.',
    },
    {
      id: 'ses_04',
      course_id: 'crs_ssi_marine_ecology',
      instructor_id: 'usr_inst_01', // Tariq Fayed
      start_date: '2026-11-07',
      end_date: '2026-11-08',
      location: 'The Bells & Dahab Blue Hole',
      status: 'scheduled',
      max_capacity: 8,
      buoy_count: 2,
      notes: 'Reef ecology presentations plus guided survey dives; jeep departure at 08:30.',
    },
  ];

  const insertSession = db.prepare(`
    INSERT INTO course_sessions (id, course_id, instructor_id, start_date, end_date, location, status, max_capacity, buoy_count, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const ses of sessions) {
    insertSession.run(ses.id, ses.course_id, ses.instructor_id, ses.start_date, ses.end_date, ses.location, ses.status, ses.max_capacity, ses.buoy_count, ses.notes, now);
  }

  // Bookings
  const bookings = [
    {
      id: 'bkg_01',
      booking_number: 'FD-2026-001',
      student_id: 'std_03', // Chloe Martin
      course_id: 'crs_ssi_freediver',
      session_id: 'ses_01',
      booking_date: '2026-10-28',
      status: 'confirmed',
      price: 310,
      currency: 'EUR',
      payment_status: 'paid',
      notes: 'Deposit and balance settled in full via Credit Card.',
    },
    {
      id: 'bkg_02',
      booking_number: 'FD-2026-002',
      student_id: 'std_01', // Maya Lindemann
      course_id: 'crs_ssi_advanced',
      session_id: 'ses_02',
      booking_date: '2026-10-26',
      status: 'confirmed',
      price: 360,
      currency: 'EUR',
      payment_status: 'paid',
      notes: 'Rental carbon bifins requested (Leaderfins size 39-40).',
    },
    {
      id: 'bkg_03',
      booking_number: 'FD-2026-003',
      student_id: 'std_05', // Sarah Al-Khatib
      course_id: 'crs_mouthfill',
      session_id: 'ses_03',
      booking_date: '2026-10-27',
      status: 'confirmed',
      price: 120,
      currency: 'EUR',
      payment_status: 'partially_paid',
      notes: '50 EUR deposit received via InstaPay; 70 EUR balance due on the workshop day.',
    },
    {
      id: 'bkg_04',
      booking_number: 'FD-2026-004',
      student_id: 'std_07', // Kenji Sato
      course_id: 'crs_ssi_marine_ecology',
      session_id: 'ses_04',
      booking_date: '2026-10-29',
      status: 'confirmed',
      price: 150,
      currency: 'EUR',
      payment_status: 'paid',
      notes: 'Paid via PayPal.',
    },
    {
      id: 'bkg_05',
      booking_number: 'FD-2026-005',
      student_id: 'std_02', // Ahmed Mansour
      course_id: 'crs_ssi_marine_ecology',
      session_id: 'ses_04',
      booking_date: '2026-10-30',
      status: 'confirmed',
      price: 150,
      currency: 'EUR',
      payment_status: 'paid',
      notes: 'Paid in EUR; EGP receipt issued at the day’s exchange rate.',
    },
  ];

  const insertBooking = db.prepare(`
    INSERT INTO bookings (id, booking_number, student_id, course_id, session_id, booking_date, status, price, currency, payment_status, notes, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'usr_crm_01', ?, ?)
  `);

  for (const b of bookings) {
    insertBooking.run(b.id, b.booking_number, b.student_id, b.course_id, b.session_id, b.booking_date, b.status, b.price, b.currency, b.payment_status, b.notes, now, now);
  }

  // 5. Seed Daily Activities / Ocean Operations Board
  const activities = [
    {
      id: 'act_01',
      title: 'Blue Hole Deep Apnea Training Line 1 (60m)',
      activity_type: 'depth_training',
      location: 'Blue Hole',
      activity_date: '2026-11-02',
      start_time: '08:30',
      end_time: '11:30',
      lead_instructor_id: 'usr_inst_01', // Tariq Fayed
      safety_diver_name: 'Karim Al-Husseini',
      max_depth_target: 50.0,
      max_pax: 4,
      current_pax: 3,
      status: 'planned',
      sea_conditions: 'Calm sea, 24°C water, gentle current at 15m, 35m visibility',
      notes: 'Buoy equipped with bottom camera and sonar depth gauge. Emergency O2 stationed at bedouin camp.',
    },
    {
      id: 'act_02',
      title: 'Lighthouse Bay SSI Freediver Confined Water & Rescue Drills',
      activity_type: 'course_session',
      location: 'Lighthouse',
      activity_date: '2026-11-02',
      start_time: '09:00',
      end_time: '12:00',
      lead_instructor_id: 'usr_inst_02', // Elena Rostova
      safety_diver_name: 'Ziad Mansour',
      max_depth_target: 12.0,
      max_pax: 4,
      current_pax: 2,
      status: 'planned',
      sea_conditions: 'Flat water inside Lighthouse reef bay, no wind, excellent training conditions',
      notes: 'Focus on BO rescue protocol, conscious black-out surface tow, and finning trim.',
    },
    {
      id: 'act_03',
      title: 'Eel Garden Sunset Equalization & Relaxation Drift',
      activity_type: 'breathing_session',
      location: 'Eel Garden',
      activity_date: '2026-11-02',
      start_time: '15:30',
      end_time: '17:00',
      lead_instructor_id: 'usr_inst_02', // Elena Rostova
      safety_diver_name: 'Tariq Fayed',
      max_depth_target: 15.0,
      max_pax: 6,
      current_pax: 4,
      status: 'planned',
      sea_conditions: 'Mild surface chop, golden hour sun reflection, sandy bottom at 14m',
      notes: 'Gentle exploratory dive, relaxation focus, observing the garden eel colony.',
    },
  ];

  const insertActivity = db.prepare(`
    INSERT INTO daily_activities (id, title, activity_type, location, activity_date, start_time, end_time, lead_instructor_id, safety_diver_name, max_depth_target, max_pax, current_pax, status, sea_conditions, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const act of activities) {
    insertActivity.run(
      act.id,
      act.title,
      act.activity_type,
      act.location,
      act.activity_date,
      act.start_time,
      act.end_time,
      act.lead_instructor_id,
      act.safety_diver_name,
      act.max_depth_target,
      act.max_pax,
      act.current_pax,
      act.status,
      act.sea_conditions,
      act.notes,
      now
    );
  }

  // 6. Seed Invoices, Line Items, Payments
  const invoices = [
    {
      id: 'inv_01',
      invoice_number: 'INV-2026-101',
      student_id: 'std_03', // Chloe Martin
      booking_id: 'bkg_01',
      issue_date: '2026-10-28',
      due_date: '2026-11-02',
      currency: 'EUR',
      subtotal: 310,
      tax_rate: 0,
      tax_amount: 0,
      total_amount: 310,
      paid_amount: 310,
      status: 'paid',
      notes: 'SSI Freediver course registration including certification card & gear rental.',
      items: [
        { category: 'course', description: 'SSI Freediver Course Tuition (3 days)', quantity: 1, unit_price: 270, total_price: 270 },
        { category: 'gear_rental', description: 'Gear Package Rental (3mm Wetsuit + Bifins + Mask)', quantity: 1, unit_price: 40, total_price: 40 },
      ],
      payment: {
        amount: 310,
        currency: 'EUR',
        payment_method: 'Credit Card',
        payment_account: 'Card Terminal EUR',
        payment_date: '2026-10-28',
        reference_number: 'CC-STR-941824',
        notes: 'Online terminal confirmation #941824',
      },
    },
    {
      id: 'inv_02',
      invoice_number: 'INV-2026-102',
      student_id: 'std_01', // Maya Lindemann
      booking_id: 'bkg_02',
      issue_date: '2026-10-26',
      due_date: '2026-11-03',
      currency: 'EUR',
      subtotal: 400,
      tax_rate: 0,
      tax_amount: 0,
      total_amount: 400,
      paid_amount: 400,
      status: 'paid',
      notes: 'SSI Advanced Freediver course + carbon fin test trial.',
      items: [
        { category: 'course', description: 'SSI Advanced Freediver Course (3 days)', quantity: 1, unit_price: 360, total_price: 360 },
        { category: 'gear_rental', description: 'Leaderfins Carbon Fin Rental Upgrade', quantity: 1, unit_price: 40, total_price: 40 },
      ],
      payment: {
        amount: 400,
        currency: 'EUR',
        payment_method: 'Bank Transfer',
        payment_account: 'Bank EUR',
        payment_date: '2026-10-27',
        reference_number: 'SEPA-DE-910283',
        notes: 'Deutsche Bank transfer reference #910283',
      },
    },
    {
      id: 'inv_03',
      invoice_number: 'INV-2026-103',
      student_id: 'std_05', // Sarah Al-Khatib
      booking_id: 'bkg_03',
      issue_date: '2026-10-27',
      due_date: '2026-11-05',
      currency: 'EUR',
      subtotal: 120,
      tax_rate: 0,
      tax_amount: 0,
      total_amount: 120,
      paid_amount: 50,
      status: 'partially_paid',
      notes: '50 EUR deposit received; 70 EUR balance due on the workshop day.',
      items: [
        { category: 'workshop', description: 'Mouthfill Workshop (1 day)', quantity: 1, unit_price: 120, total_price: 120 },
      ],
      payment: {
        amount: 50,
        currency: 'EUR',
        payment_method: 'InstaPay Egypt',
        payment_account: 'InstaPay EUR',
        payment_date: '2026-10-27',
        reference_number: 'IP-EG-774910',
        notes: 'Deposit paid via InstaPay exchange equivalent',
      },
    },
    {
      id: 'inv_04',
      invoice_number: 'INV-2026-104',
      student_id: 'std_04', // Luca Rossi
      booking_id: null,
      issue_date: '2026-10-29',
      due_date: '2026-11-10',
      currency: 'EUR',
      subtotal: 350,
      tax_rate: 0,
      tax_amount: 0,
      total_amount: 350,
      paid_amount: 0,
      status: 'issued',
      notes: '10-Session Blue Hole Deep Training Buoy & Safety Diver Pass (November 2026).',
      items: [
        { category: 'training', description: 'Blue Hole 10-Session Apnea Line & Safety Pass', quantity: 1, unit_price: 350, total_price: 350 },
      ],
      payment: null,
    },
  ];

  const insertInvoice = db.prepare(`
    INSERT INTO invoices (id, invoice_number, student_id, booking_id, issue_date, due_date, currency, subtotal, tax_rate, tax_amount, total_amount, paid_amount, status, notes, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'usr_fin_01', ?, ?)
  `);

  const insertInvoiceItem = db.prepare(`
    INSERT INTO invoice_items (id, invoice_id, category, description, quantity, unit_price, total_price)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPayment = db.prepare(`
    INSERT INTO payments (id, invoice_id, amount, currency, payment_method, payment_account, payment_date, reference_number, notes, recorded_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'usr_fin_01', ?)
  `);

  for (const inv of invoices) {
    insertInvoice.run(
      inv.id,
      inv.invoice_number,
      inv.student_id,
      inv.booking_id,
      inv.issue_date,
      inv.due_date,
      inv.currency,
      inv.subtotal,
      inv.tax_rate,
      inv.tax_amount,
      inv.total_amount,
      inv.paid_amount,
      inv.status,
      inv.notes,
      now,
      now
    );

    for (let idx = 0; idx < inv.items.length; idx++) {
      const it = inv.items[idx];
      insertInvoiceItem.run(`item_${inv.id}_${idx}`, inv.id, it.category || 'other', it.description, it.quantity, it.unit_price, it.total_price);
    }

    if (inv.payment) {
      insertPayment.run(
        `pmt_${inv.id}`,
        inv.id,
        inv.payment.amount,
        inv.payment.currency,
        inv.payment.payment_method,
        inv.payment.payment_account,
        inv.payment.payment_date,
        inv.payment.reference_number,
        inv.payment.notes,
        now
      );
    }
  }

  // 7. Seed Operational Expenses
  const expenses = [
    {
      id: 'exp_01',
      expense_number: 'EXP-2026-081',
      category: 'Dive Site Entry Fees',
      vendor_name: 'Dahab City Council & Protected Areas Authority',
      amount: 4500,
      currency: 'EGP',
      payment_method: 'Cash EGP',
      payment_account: 'Cash EGP',
      expense_date: '2026-10-25',
      status: 'paid',
      approved_by: 'usr_owner_01',
      description: 'Monthly Blue Hole and Ras Abu Galum national protectorate permit fee for school buoys.',
      receipt_ref: 'REC-EG-99120',
    },
    {
      id: 'exp_02',
      expense_number: 'EXP-2026-082',
      category: 'Oxygen & Safety Gas',
      vendor_name: 'Sharm & Dahab Medical Gases Depot',
      amount: 3200,
      currency: 'EGP',
      payment_method: 'Cash EGP',
      payment_account: 'Cash EGP',
      expense_date: '2026-10-27',
      status: 'paid',
      approved_by: 'usr_owner_01',
      description: 'Refill of 2x 10L Pure Medical Oxygen cylinders for emergency dive response kits.',
      receipt_ref: 'GAS-004128',
    },
    {
      id: 'exp_03',
      expense_number: 'EXP-2026-083',
      category: 'Boat Charter & Captain',
      vendor_name: 'Captain Mahmoud Sea Charters',
      amount: 280,
      currency: 'EUR',
      payment_method: 'Bank Transfer',
      payment_account: 'Bank EUR',
      expense_date: '2026-10-29',
      status: 'approved',
      approved_by: 'usr_owner_01',
      description: 'Private rib charter for deep water exploration past the outer reef wall.',
      receipt_ref: 'CHARTER-771',
    },
    {
      id: 'exp_04',
      expense_number: 'EXP-2026-084',
      category: 'Equipment Maintenance',
      vendor_name: 'Octopus Freediving Service Hub',
      amount: 195,
      currency: 'EUR',
      payment_method: 'Bank Transfer',
      payment_account: 'Bank EUR',
      expense_date: '2026-10-30',
      status: 'approved',
      approved_by: 'usr_owner_01',
      description: 'Annual load-testing and replacement of quick-release carabiners and safety lanyard cables.',
      receipt_ref: 'OCT-SVC-2026',
    },
  ];

  const insertExpense = db.prepare(`
    INSERT INTO expenses (id, expense_number, category, vendor_name, amount, currency, payment_method, payment_account, expense_date, status, approved_by, description, receipt_ref, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'usr_fin_01', ?)
  `);

  for (const exp of expenses) {
    insertExpense.run(
      exp.id,
      exp.expense_number,
      exp.category,
      exp.vendor_name,
      exp.amount,
      exp.currency,
      exp.payment_method,
      exp.payment_account,
      exp.expense_date,
      exp.status,
      exp.approved_by,
      exp.description,
      exp.receipt_ref,
      now
    );
  }

  // 8. Seed Payroll Period & Records
  const insertPeriod = db.prepare(`
    INSERT INTO payroll_periods (id, period_name, start_date, end_date, status, approved_by, approved_at, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertPeriod.run(
    'pr_2026_10',
    'October 2026',
    '2026-10-01',
    '2026-10-31',
    'approved',
    'usr_owner_01',
    '2026-10-31T18:00:00Z',
    'Standard monthly payroll with session commissions for October freediving courses.',
    now
  );

  const payrollStaff = [
    {
      id: 'pr_rec_01',
      period_id: 'pr_2026_10',
      employee_id: 'usr_inst_01', // Tariq Fayed
      base_salary: 950,
      sessions_taught: 14,
      session_commission: 490, // 14 sessions * 35 EUR
      bonuses: 100, // Safety diver bonus
      deductions: 0,
      tax_withholding: 0, // Configurable note: statutory review required
      gross_pay: 1540,
      net_pay: 1540,
      currency: 'EUR',
      status: 'approved',
      notes: 'Includes 14 taught course sessions and safety lead bonus.',
    },
    {
      id: 'pr_rec_02',
      period_id: 'pr_2026_10',
      employee_id: 'usr_inst_02', // Elena Rostova
      base_salary: 950,
      sessions_taught: 12,
      session_commission: 420, // 12 * 35 EUR
      bonuses: 50,
      deductions: 0,
      tax_withholding: 0,
      gross_pay: 1420,
      net_pay: 1420,
      currency: 'EUR',
      status: 'approved',
      notes: 'Mouthfill workshops and advanced course instruction.',
    },
    {
      id: 'pr_rec_03',
      period_id: 'pr_2026_10',
      employee_id: 'usr_ops_01', // Karim
      base_salary: 1800,
      sessions_taught: 0,
      session_commission: 0,
      bonuses: 150, // High occupancy operational bonus
      deductions: 0,
      tax_withholding: 0,
      gross_pay: 1950,
      net_pay: 1950,
      currency: 'EUR',
      status: 'approved',
      notes: 'Operations management and logistics supervision.',
    },
    {
      id: 'pr_rec_04',
      period_id: 'pr_2026_10',
      employee_id: 'usr_crm_01', // Nour
      base_salary: 1100,
      sessions_taught: 0,
      session_commission: 0,
      bonuses: 80, // Conversion milestone incentive
      deductions: 0,
      tax_withholding: 0,
      gross_pay: 1180,
      net_pay: 1180,
      currency: 'EUR',
      status: 'approved',
      notes: 'Front desk guest service & CRM pipeline management.',
    },
  ];

  const insertPayrollRecord = db.prepare(`
    INSERT INTO payroll_records (id, period_id, employee_id, base_salary, session_commission, sessions_taught, bonuses, deductions, gross_pay, tax_withholding, net_pay, currency, status, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const pr of payrollStaff) {
    insertPayrollRecord.run(
      pr.id,
      pr.period_id,
      pr.employee_id,
      pr.base_salary,
      pr.session_commission,
      pr.sessions_taught,
      pr.bonuses,
      pr.deductions,
      pr.gross_pay,
      pr.tax_withholding,
      pr.net_pay,
      pr.currency,
      pr.status,
      pr.notes,
      now
    );
  }

  // 9. Seed Gear & Equipment Inventory
  const gearItems = [
    {
      id: 'eq_01',
      barcode: 'FD-GEAR-001',
      item_name: 'Leaderfins Carbon Waves Long Bifins',
      category: 'bifins',
      size: '41-42 (Medium Stiffness)',
      brand_model: 'Leaderfins Carbon Waves',
      quantity_total: 6,
      quantity_available: 5,
      condition: 'excellent',
      location: 'Gear Room A - Fin Rack 1',
      last_inspected: '2026-10-24',
      low_stock_threshold: 2,
      notes: 'Blade edges intact, foot pockets inspected for tears.',
    },
    {
      id: 'eq_02',
      barcode: 'FD-GEAR-002',
      item_name: 'Elios Sub Yamamoto 3mm Smoothskin Wetsuit',
      category: 'wetsuits',
      size: 'Size M',
      brand_model: 'Elios Sub Professional',
      quantity_total: 8,
      quantity_available: 6,
      condition: 'good',
      location: 'Wetsuit Hanger Row 2',
      last_inspected: '2026-10-20',
      low_stock_threshold: 3,
      notes: 'Washed in fresh water & disinfectant after every Dahab sea session.',
    },
    {
      id: 'eq_03',
      barcode: 'FD-GEAR-003',
      item_name: 'Carbon Pro Monofin 3',
      category: 'monofins',
      size: 'Size EU 42',
      brand_model: 'Carbon Pro 3',
      quantity_total: 2,
      quantity_available: 2,
      condition: 'excellent',
      location: 'Gear Room A - Locked Carbon Case',
      last_inspected: '2026-10-15',
      low_stock_threshold: 1,
      notes: 'High-end carbon monofin for deep CWT competition and training.',
    },
    {
      id: 'eq_04',
      barcode: 'FD-GEAR-004',
      item_name: 'Suunto D4f Freedive Wrist Computer',
      category: 'computers',
      size: 'Universal Wrist',
      brand_model: 'Suunto D4f Black',
      quantity_total: 5,
      quantity_available: 4,
      condition: 'excellent',
      location: 'Front Desk Secure Drawer',
      last_inspected: '2026-10-28',
      low_stock_threshold: 2,
      notes: 'Battery test OK on all units. Logbook memory cleared.',
    },
    {
      id: 'eq_05',
      barcode: 'FD-GEAR-005',
      item_name: 'Octopus Freediving Safety Lanyard 100cm',
      category: 'lanyards',
      size: '100cm Cable',
      brand_model: 'Octopus Carbon Lanyard',
      quantity_total: 10,
      quantity_available: 8,
      condition: 'excellent',
      location: 'Safety Cabinet 1',
      last_inspected: '2026-10-29',
      low_stock_threshold: 3,
      notes: 'Tested quick release trigger pin on all carabiners.',
    },
    {
      id: 'eq_06',
      barcode: 'FD-GEAR-006',
      item_name: 'Dahab Deep Training Buoy + 12mm Line & 20kg Plate',
      category: 'buoys_weights',
      size: 'Large Buoy (80cm) + 70m Line',
      brand_model: 'Freedive Dahab Custom Heavy Buoy',
      quantity_total: 4,
      quantity_available: 3,
      condition: 'good',
      location: 'Courtyard Dive Rack',
      last_inspected: '2026-10-27',
      low_stock_threshold: 2,
      notes: 'Includes bottom stopper, counterball, and emergency whistle.',
    },
    {
      id: 'eq_07',
      barcode: 'FD-GEAR-007',
      item_name: 'DAN Emergency 10L Medical Oxygen Unit Kit',
      category: 'safety_o2',
      size: '10L Cylinder',
      brand_model: 'DAN Europe Rescue Pack',
      quantity_total: 3,
      quantity_available: 3,
      condition: 'excellent',
      location: 'Safety Station Front + Mobile Truck Kit',
      last_inspected: '2026-10-29',
      low_stock_threshold: 2,
      notes: 'Pressure at 200 bar, non-rebreather masks sealed in sterile pouches.',
    },
  ];

  const insertEquipment = db.prepare(`
    INSERT INTO equipment (id, barcode, item_name, category, size, brand_model, quantity_total, quantity_available, condition, location, last_inspected, low_stock_threshold, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const g of gearItems) {
    insertEquipment.run(
      g.id,
      g.barcode,
      g.item_name,
      g.category,
      g.size,
      g.brand_model,
      g.quantity_total,
      g.quantity_available,
      g.condition,
      g.location,
      g.last_inspected,
      g.low_stock_threshold,
      g.notes,
      now,
      now
    );
  }

  // 10. Seed CRM Inquiries
  const inquiries = [
    {
      id: 'inq_01',
      lead_name: 'Sophia Van Dijk',
      lead_email: 'sophia.vandijk@amsterdam.nl',
      lead_phone: '+31 6 5544 3322',
      course_interest: 'Beginner + Advanced Combo',
      channel: 'WhatsApp',
      status: 'proposal_sent',
      message: 'Hello! I am planning a 2-week freediving holiday in Dahab starting mid-November. Can I combine the Beginner and Advanced courses? Also need accommodation recommendations near Lighthouse.',
      follow_up_date: '2026-11-03',
      assigned_to: 'usr_crm_01',
    },
    {
      id: 'inq_02',
      lead_name: 'Omar Sherif',
      lead_email: 'o.sherif.alex@yahoo.com',
      lead_phone: '+20 122 334 4556',
      course_interest: 'SSI Freediver course',
      channel: 'Instagram',
      status: 'new',
      message: 'Salam! I am a spearfisher from Alexandria. Want to learn proper Frenzel and safety so I do not risk shallow water blackouts. When is the next weekend course?',
      follow_up_date: '2026-11-02',
      assigned_to: 'usr_crm_01',
    },
    {
      id: 'inq_03',
      lead_name: 'Frederik Lind',
      lead_email: 'frederik.lind@copenhagen.dk',
      lead_phone: '+45 20 30 40 50',
      course_interest: 'Blue Hole Deep Training Week (60m+)',
      channel: 'Website',
      status: 'contacted',
      message: 'Looking for a private coach and counterweight buoy setup for 10 days in December. Current PB is 62m CWT.',
      follow_up_date: '2026-11-04',
      assigned_to: 'usr_ops_01',
    },
  ];

  const insertInquiry = db.prepare(`
    INSERT INTO inquiries (id, lead_name, lead_email, lead_phone, course_interest, channel, status, message, follow_up_date, assigned_to, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const inq of inquiries) {
    insertInquiry.run(
      inq.id,
      inq.lead_name,
      inq.lead_email,
      inq.lead_phone,
      inq.course_interest,
      inq.channel,
      inq.status,
      inq.message,
      inq.follow_up_date,
      inq.assigned_to,
      now,
      now
    );
  }

  // 11. Initial Settings
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('timezone', 'Africa/Cairo');
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('center_name', 'Freedive Dahab');
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('currency_primary', 'EUR');
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('currency_secondary', 'EGP');
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('default_vat_rate', '0.00'); // Note: reviewable by qualified tax adviser
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('system_version', '1.0.0-PROD');

  // 11b. Center business profile & notification defaults (never overwrite existing)
  const existingCenterSettings = db.prepare('SELECT COUNT(*) as count FROM center_settings').get() as { count: number };
  if (existingCenterSettings.count === 0) {
    const insertCenterSetting = db.prepare('INSERT INTO center_settings (key, value, updated_at) VALUES (?, ?, ?)');
    const centerDefaults: Record<string, string> = {
      center_name: 'Freedive Dahab',
      address: 'Dahab, South Sinai, Egypt',
      phone: '+20 100 234 5678',
      whatsapp: '+20 100 234 5678',
      email: 'info@freedivedahab.com',
      currency_default: 'EUR',
      timezone: 'Africa/Cairo',
      notify_deposit_reminders: 'true',
      notify_low_stock_alerts: 'true',
      notify_waiver_expiring: 'true',
      notify_daily_summary_email: 'false',
    };
    for (const [key, value] of Object.entries(centerDefaults)) {
      insertCenterSetting.run(key, value, now);
    }
  }

  // 12. Seed initial audit log entry
  logAudit({
    userId: 'usr_owner_01',
    userEmail: 'owner@freedivedahab.com',
    userRole: 'owner',
    action: 'SYSTEM_INITIALIZED',
    entityType: 'ERP_SYSTEM',
    entityId: 'freedive_dahab_core',
    details: { msg: 'Initial database schema and Dahab operational records seeded successfully.' },
    ip: '127.0.0.1',
  });

  console.log('Seeding completed successfully.');
}
