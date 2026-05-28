const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const supabase = require('./config/supabase');

// Load environment variables
dotenv.config();

const app = express();

// Middlewares
app.use(cors({ origin: '*' })); // Allow all origins for testing
app.use(express.json());

// Seed Default Users and Sample Data in Supabase if they don't exist
const seedDatabase = async () => {
  try {
    // Only attempt to seed if Supabase config exists
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return;
    }

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);

    // 1. Seed Admin User
    const { data: adminExists } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'admin@college.edu')
      .maybeSingle();

    if (!adminExists) {
      const passwordHash = await bcrypt.hash('adminpassword123', salt);
      const { error } = await supabase.from('users').insert({
        email: 'admin@college.edu',
        password_hash: passwordHash,
        role: 'admin'
      });
      if (error) throw error;
      console.log('Seeded default Admin credentials: admin@college.edu / adminpassword123');
    }

    // 2. Seed Faculty User & Profile
    let facultyUserId;
    let facultyProfileId;
    const { data: facultyUserExists } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'faculty@college.edu')
      .maybeSingle();

    if (!facultyUserExists) {
      const passwordHash = await bcrypt.hash('facultypassword123', salt);
      const { data: user, error: uErr } = await supabase
        .from('users')
        .insert({
          email: 'faculty@college.edu',
          password_hash: passwordHash,
          role: 'faculty'
        })
        .select()
        .single();
      
      if (uErr) throw uErr;
      facultyUserId = user.id;

      const { data: faculty, error: fErr } = await supabase
        .from('faculty')
        .insert({
          user_id: facultyUserId,
          employee_id: 'EMP101',
          name: 'Dr. Sarah Jenkins',
          department: 'Computer Science',
          designation: 'Professor',
          phone: '9876543210'
        })
        .select()
        .single();

      if (fErr) throw fErr;
      facultyProfileId = faculty.id;
      console.log('Seeded default Faculty credentials: faculty@college.edu / facultypassword123');
    } else {
      facultyUserId = facultyUserExists.id;
      const { data: faculty } = await supabase
        .from('faculty')
        .select('id')
        .eq('user_id', facultyUserId)
        .maybeSingle();
      if (faculty) facultyProfileId = faculty.id;
    }

    // 3. Seed Student User & Profile
    let studentUserId;
    let studentProfileId;
    const { data: studentUserExists } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'student@college.edu')
      .maybeSingle();

    if (!studentUserExists) {
      const passwordHash = await bcrypt.hash('studentpassword123', salt);
      const { data: user, error: uErr } = await supabase
        .from('users')
        .insert({
          email: 'student@college.edu',
          password_hash: passwordHash,
          role: 'student'
        })
        .select()
        .single();
      
      if (uErr) throw uErr;
      studentUserId = user.id;

      const { data: student, error: sErr } = await supabase
        .from('students')
        .insert({
          user_id: studentUserId,
          roll_number: 'CS202601',
          name: 'Alex Rivera',
          department: 'Computer Science',
          current_semester: '1',
          phone: '8765432109',
          cgpa: 9.20
        })
        .select()
        .single();

      if (sErr) throw sErr;
      studentProfileId = student.id;
      console.log('Seeded default Student credentials: student@college.edu / studentpassword123');
    } else {
      studentUserId = studentUserExists.id;
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', studentUserId)
        .maybeSingle();
      if (student) studentProfileId = student.id;
    }

    // 4. Seed Courses (CS101, CS102) assigned to Dr. Jenkins
    let course1Id;
    let course2Id;
    if (facultyProfileId) {
      // Check CS101
      const { data: course1Exists } = await supabase
        .from('courses')
        .select('id')
        .eq('course_code', 'CS101')
        .maybeSingle();

      if (!course1Exists) {
        const { data: course, error } = await supabase
          .from('courses')
          .insert({
            course_code: 'CS101',
            title: 'Introduction to Computer Science',
            department: 'Computer Science',
            semester: '1',
            credits: 4,
            faculty_id: facultyProfileId
          })
          .select()
          .single();
        if (error) throw error;
        course1Id = course.id;
        console.log('Seeded course CS101 assigned to Dr. Jenkins');
      } else {
        course1Id = course1Exists.id;
      }

      // Check CS102
      const { data: course2Exists } = await supabase
        .from('courses')
        .select('id')
        .eq('course_code', 'CS102')
        .maybeSingle();

      if (!course2Exists) {
        const { data: course, error } = await supabase
          .from('courses')
          .insert({
            course_code: 'CS102',
            title: 'Data Structures & Algorithms',
            department: 'Computer Science',
            semester: '1',
            credits: 4,
            faculty_id: facultyProfileId
          })
          .select()
          .single();
        if (error) throw error;
        course2Id = course.id;
        console.log('Seeded course CS102 assigned to Dr. Jenkins');
      } else {
        course2Id = course2Exists.id;
      }
    }

    // 5. Seed Marks for Student Alex Rivera
    if (studentProfileId && course1Id) {
      // Check if internal 1 marks exist
      const { data: marksExists } = await supabase
        .from('marks')
        .select('id')
        .eq('student_id', studentProfileId)
        .eq('course_id', course1Id)
        .eq('type', 'Internal 1')
        .maybeSingle();

      if (!marksExists) {
        await supabase.from('marks').insert([
          {
            student_id: studentProfileId,
            course_id: course1Id,
            type: 'Internal 1',
            marks_obtained: 26,
            max_marks: 30
          },
          {
            student_id: studentProfileId,
            course_id: course1Id,
            type: 'Internal 2',
            marks_obtained: 28,
            max_marks: 30
          }
        ]);
        console.log('Seeded marks for student Alex Rivera in CS101');
      }
    }

    if (studentProfileId && course2Id) {
      const { data: marksExists } = await supabase
        .from('marks')
        .select('id')
        .eq('student_id', studentProfileId)
        .eq('course_id', course2Id)
        .eq('type', 'Internal 1')
        .maybeSingle();

      if (!marksExists) {
        await supabase.from('marks').insert([
          {
            student_id: studentProfileId,
            course_id: course2Id,
            type: 'Internal 1',
            marks_obtained: 25,
            max_marks: 30
          }
        ]);
        console.log('Seeded marks for student Alex Rivera in CS102');
      }
    }

    // 6. Seed Attendance Logs for Alex Rivera
    if (studentProfileId && course1Id) {
      const { data: attExists } = await supabase
        .from('attendance')
        .select('id')
        .eq('student_id', studentProfileId)
        .eq('course_id', course1Id)
        .limit(1);

      if (!attExists || attExists.length === 0) {
        const today = new Date();
        const yest = new Date(today);
        yest.setDate(yest.getDate() - 1);
        const dayBefore = new Date(today);
        dayBefore.setDate(dayBefore.getDate() - 2);

        await supabase.from('attendance').insert([
          {
            student_id: studentProfileId,
            course_id: course1Id,
            date: dayBefore.toISOString().split('T')[0],
            status: 'Present',
            qr_session_id: 'ATT_CS101_SEED1',
            latitude: -33.8688,
            longitude: 151.2093
          },
          {
            student_id: studentProfileId,
            course_id: course1Id,
            date: yest.toISOString().split('T')[0],
            status: 'Present',
            qr_session_id: 'ATT_CS101_SEED2',
            latitude: -33.8688,
            longitude: 151.2093
          },
          {
            student_id: studentProfileId,
            course_id: course1Id,
            date: today.toISOString().split('T')[0],
            status: 'Absent',
            qr_session_id: 'ATT_CS101_SEED3',
            latitude: null,
            longitude: null
          }
        ]);
        console.log('Seeded attendance logs for student Alex Rivera in CS101');
      }
    }

    // 7. Seed Fee Invoices
    if (studentProfileId) {
      const { data: feesExists } = await supabase
        .from('fees')
        .select('id')
        .eq('student_id', studentProfileId)
        .limit(1);

      if (!feesExists || feesExists.length === 0) {
        const today = new Date();
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + 1);

        await supabase.from('fees').insert([
          {
            student_id: studentProfileId,
            fee_type: 'Tuition',
            amount: 5000.00,
            status: 'Unpaid',
            due_date: dueDate.toISOString().split('T')[0]
          },
          {
            student_id: studentProfileId,
            fee_type: 'Library',
            amount: 500.00,
            status: 'Paid',
            due_date: today.toISOString().split('T')[0],
            payment_date: today.toISOString(),
            transaction_id: 'TXN_SEED_998877'
          }
        ]);
        console.log('Seeded fee invoices for student Alex Rivera');
      }
    }

    console.log('Database seeding successfully checked/executed!');
  } catch (error) {
    console.error('Error during database seeding:', error.message);
  }
};

// Start seeding check
seedDatabase();


// Routes mount
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/faculty', require('./routes/facultyRoutes'));
app.use('/api/student', require('./routes/studentRoutes'));

// Basic health check route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to AuraERP Supabase Cloud API Server' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running in development mode on port ${PORT}`);
});
