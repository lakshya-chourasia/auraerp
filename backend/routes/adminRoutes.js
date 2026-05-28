const express = require('express');
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

const router = express.Router();

// Apply auth + role checks to all admin routes
router.use(protect, authorize('admin'));

// Helper: Auto-generate a unique Student Roll Number
const generateUniqueRollNumber = async () => {
  const currentYear = new Date().getFullYear();
  let unique = false;
  let rollNumber = '';
  
  while (!unique) {
    const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
    rollNumber = `STU-${currentYear}-${randomDigits}`;
    
    // Check if exists in DB
    const { data } = await supabase
      .from('students')
      .select('id')
      .eq('roll_number', rollNumber)
      .maybeSingle();
      
    if (!data) {
      unique = true;
    }
  }
  return rollNumber;
};

// Helper: Auto-generate a unique Faculty Employee ID
const generateUniqueEmployeeId = async () => {
  const currentYear = new Date().getFullYear();
  let unique = false;
  let employeeId = '';
  
  while (!unique) {
    const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
    employeeId = `FAC-${currentYear}-${randomDigits}`;
    
    // Check if exists in DB
    const { data } = await supabase
      .from('faculty')
      .select('id')
      .eq('employee_id', employeeId)
      .maybeSingle();
      
    if (!data) {
      unique = true;
    }
  }
  return employeeId;
};

// @route   GET api/admin/stats
// @desc    Get dashboard metrics for Admin
router.get('/stats', async (req, res) => {
  try {
    const { count: studentCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true });

    const { count: facultyCount } = await supabase
      .from('faculty')
      .select('*', { count: 'exact', head: true });

    const { count: courseCount } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true });

    const { data: fees } = await supabase
      .from('fees')
      .select('status, amount');
    
    let totalFeesCollected = 0;
    let totalFeesPending = 0;
    
    if (fees) {
      fees.forEach(fee => {
        const amount = parseFloat(fee.amount);
        if (fee.status === 'Paid') {
          totalFeesCollected += amount;
        } else {
          totalFeesPending += amount;
        }
      });
    }

    res.json({
      studentCount: studentCount || 0,
      facultyCount: facultyCount || 0,
      courseCount: courseCount || 0,
      totalFeesCollected,
      totalFeesPending
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving stats' });
  }
});

// ==================== FACULTY CRUD ====================

// @route   POST api/admin/faculty
// @desc    Create new Faculty User and Profile
router.post('/faculty', async (req, res) => {
  const { email, password, employeeId, name, department, designation, phone } = req.body;

  try {
    const { data: userExists } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    let finalEmployeeId = employeeId;
    if (!finalEmployeeId || finalEmployeeId.trim() === '') {
      finalEmployeeId = await generateUniqueEmployeeId();
    } else {
      const { data: facultyExists } = await supabase
        .from('faculty')
        .select('id')
        .eq('employee_id', finalEmployeeId)
        .maybeSingle();

      if (facultyExists) {
        return res.status(400).json({ message: 'Faculty with this employee ID already exists' });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user login credentials
    const { data: user, error: uErr } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        role: 'faculty'
      })
      .select()
      .single();

    if (uErr || !user) {
      return res.status(500).json({ message: 'Error creating user credentials', error: uErr?.message });
    }

    // Create faculty profile
    const { data: faculty, error: fErr } = await supabase
      .from('faculty')
      .insert({
        user_id: user.id,
        employee_id: finalEmployeeId,
        name,
        department,
        designation,
        phone
      })
      .select()
      .single();

    if (fErr || !faculty) {
      // rollback
      await supabase.from('users').delete().eq('id', user.id);
      return res.status(500).json({ message: 'Error creating faculty profile', error: fErr?.message });
    }

    res.status(201).json({ faculty, userEmail: user.email });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating faculty' });
  }
});
// @route   GET api/admin/faculty
// @desc    Get all faculty members
router.get('/faculty', async (req, res) => {
  try {
    const { data: faculties, error } = await supabase
      .from('faculty')
      .select('*, userRef:users(email)');
    
    if (error) throw error;
    
    const mapped = faculties.map(f => ({
      ...f,
      _id: f.id
    }));
    
    res.json(mapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching faculty list' });
  }
});

// @route   DELETE api/admin/faculty/:id
// @desc    Delete a faculty member
router.delete('/faculty/:id', async (req, res) => {
  try {
    const { data: faculty, error } = await supabase
      .from('faculty')
      .select('user_id')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!faculty) {
      return res.status(404).json({ message: 'Faculty member not found' });
    }

    // Delete credentials (cascades to profile)
    await supabase.from('users').delete().eq('id', faculty.user_id);

    // Unassign from courses (handled automatically by foreign key SET NULL, but let's be explicit)
    await supabase
      .from('courses')
      .update({ faculty_id: null })
      .eq('faculty_id', req.params.id);

    res.json({ message: 'Faculty member deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting faculty' });
  }
});

// ==================== STUDENT CRUD ====================

// @route   GET api/admin/students
// @desc    Get all students
router.get('/students', async (req, res) => {
  try {
    const { data: students, error } = await supabase
      .from('students')
      .select('*, userRef:users(email)');
    
    if (error) throw error;
    
    // Map numerical cgpa from string numeric PostgreSQL type to float, and id to _id
    const enriched = students.map(s => ({
      ...s,
      _id: s.id,
      cgpa: parseFloat(s.cgpa)
    }));

    res.json(enriched);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching students list' });
  }
});

// @route   DELETE api/admin/students/:id
// @desc    Delete a student
router.delete('/students/:id', async (req, res) => {
  try {
    const { data: student, error } = await supabase
      .from('students')
      .select('user_id')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Delete credentials (cascades to profile)
    await supabase.from('users').delete().eq('id', student.user_id);

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting student' });
  }
});

// @route   POST api/admin/students
// @desc    Create new Student User and Profile (Single)
router.post('/students', async (req, res) => {
  const { email, password, name, department, phone } = req.body;

  try {
    const { data: userExists } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Auto-generate unique student Roll Number
    const rollNumber = await generateUniqueRollNumber();

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user login credentials
    const { data: user, error: uErr } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        role: 'student'
      })
      .select()
      .single();

    if (uErr || !user) {
      return res.status(500).json({ message: 'Error creating student user credentials', error: uErr?.message });
    }

    // Create student profile
    const { data: student, error: sErr } = await supabase
      .from('students')
      .insert({
        user_id: user.id,
        roll_number: rollNumber,
        name,
        department,
        phone,
        current_semester: '1',
        cgpa: 0.0
      })
      .select()
      .single();

    if (sErr || !student) {
      // rollback
      await supabase.from('users').delete().eq('id', user.id);
      return res.status(500).json({ message: 'Error creating student profile', error: sErr?.message });
    }

    res.status(201).json({
      student: {
        ...student,
        _id: student.id
      },
      userEmail: user.email
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating student' });
  }
});

// @route   POST api/admin/students/bulk
// @desc    Bulk register new student profiles via CSV/JSON format
router.post('/students/bulk', async (req, res) => {
  const { students } = req.body;

  if (!students || !Array.isArray(students)) {
    return res.status(400).json({ message: 'Invalid payload: students list expected as an array' });
  }

  const results = {
    createdCount: 0,
    failedCount: 0,
    errors: []
  };

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const rowNum = i + 1;
    const { name, email, password, department, phone } = s;

    // Validation checks
    if (!name || !email || !password || !department || !phone) {
      results.failedCount++;
      results.errors.push({
        row: rowNum,
        email: email || 'Unknown',
        message: 'Missing required fields (name, email, password, department, and phone are mandatory)'
      });
      continue;
    }

    try {
      // Check if user exists
      const { data: userExists } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (userExists) {
        results.failedCount++;
        results.errors.push({
          row: rowNum,
          email: email,
          message: 'User with this email already exists'
        });
        continue;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Auto-generate unique student Roll Number
      const rollNumber = await generateUniqueRollNumber();

      // Create credentials
      const { data: user, error: uErr } = await supabase
        .from('users')
        .insert({
          email: email.toLowerCase(),
          password_hash: passwordHash,
          role: 'student'
        })
        .select()
        .single();

      if (uErr || !user) {
        results.failedCount++;
        results.errors.push({
          row: rowNum,
          email: email,
          message: `Credentials creation failed: ${uErr?.message || 'Unknown error'}`
        });
        continue;
      }

      // Create profile
      const { data: student, error: sErr } = await supabase
        .from('students')
        .insert({
          user_id: user.id,
          roll_number: rollNumber,
          name,
          department,
          phone,
          current_semester: '1',
          cgpa: 0.0
        })
        .select()
        .single();

      if (sErr || !student) {
        // rollback user
        await supabase.from('users').delete().eq('id', user.id);
        results.failedCount++;
        results.errors.push({
          row: rowNum,
          email: email,
          message: `Student profile creation failed: ${sErr?.message || 'Unknown error'}`
        });
        continue;
      }

      results.createdCount++;
    } catch (err) {
      results.failedCount++;
      results.errors.push({
        row: rowNum,
        email: email,
        message: `System error processing row: ${err.message}`
      });
    }
  }

  res.status(201).json(results);
});

// ==================== COURSE CRUD ====================

// @route   POST api/admin/courses
// @desc    Create a new course
router.post('/courses', async (req, res) => {
  const { courseCode, title, department, semester, credits, facultyRef } = req.body;

  try {
    const { data: courseExists } = await supabase
      .from('courses')
      .select('id')
      .eq('course_code', courseCode)
      .maybeSingle();

    if (courseExists) {
      return res.status(400).json({ message: 'Course with this course code already exists' });
    }

    // Sanitize facultyRef UUID (e.g. prevent "undefined" or non-UUID values from crashing Postgres)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const assignedFacultyId = uuidRegex.test(facultyRef) ? facultyRef : null;

    const { data: course, error } = await supabase
      .from('courses')
      .insert({
        course_code: courseCode,
        title,
        department,
        semester,
        credits: parseInt(credits),
        faculty_id: assignedFacultyId
      })
      .select()
      .single();

    if (error) throw error;

    // Map id to _id for frontend compatibility
    res.status(201).json({
      ...course,
      _id: course.id,
      courseCode: course.course_code
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating course', error: error.message });
  }
});

// @route   GET api/admin/courses
// @desc    Get all courses
router.get('/courses', async (req, res) => {
  try {
    const { data: courses, error } = await supabase
      .from('courses')
      .select('*, facultyRef:faculty(name, employee_id)');

    if (error) throw error;
    
    // Map field naming and id to _id to support old frontend expectation
    const mapped = courses.map(c => ({
      ...c,
      _id: c.id,
      courseCode: c.course_code,
      facultyRef: c.facultyRef ? { name: c.facultyRef.name, employeeId: c.facultyRef.employee_id } : null
    }));

    res.json(mapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching courses list' });
  }
});

// @route   DELETE api/admin/courses/:id
// @desc    Delete a course
router.delete('/courses/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting course' });
  }
});

// ==================== FEES MANAGEMENT ====================

// @route   POST api/admin/fees
// @desc    Generate a fee invoice for a student (or all students)
router.post('/fees', async (req, res) => {
  const { studentRef, feeType, amount, dueDate, generateForAll } = req.body;

  try {
    if (generateForAll) {
      const { data: students, error: studErr } = await supabase
        .from('students')
        .select('id');

      if (studErr || !students) throw studErr;

      const feeInvoices = students.map(student => ({
        student_id: student.id,
        fee_type: feeType,
        amount: parseFloat(amount),
        due_date: dueDate,
        status: 'Unpaid'
      }));

      const { error: insErr } = await supabase
        .from('fees')
        .insert(feeInvoices);

      if (insErr) throw insErr;

      return res.status(201).json({ message: `Successfully generated fee invoices for all ${students.length} students` });
    }

    // Sanitize studentRef UUID (prevent "undefined" or other invalid strings)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(studentRef)) {
      return res.status(400).json({ message: 'Invalid Student selected (invalid UUID)' });
    }

    const { error: insErr, data: fee } = await supabase
      .from('fees')
      .insert({
        student_id: studentRef,
        fee_type: feeType,
        amount: parseFloat(amount),
        due_date: dueDate,
        status: 'Unpaid'
      })
      .select()
      .single();

    if (insErr) throw insErr;

    // Map id to _id for frontend compatibility
    res.status(201).json({
      ...fee,
      _id: fee.id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error generating fee record' });
  }
});

// @route   GET api/admin/fees
// @desc    Get all fee records
router.get('/fees', async (req, res) => {
  try {
    const { data: fees, error } = await supabase
      .from('fees')
      .select('*, studentRef:students(name, roll_number, department)');

    if (error) throw error;
    
    // Map keys to frontend naming expectations and id to _id
    const mapped = fees.map(f => ({
      ...f,
      _id: f.id,
      feeType: f.fee_type,
      studentRef: f.studentRef ? { name: f.studentRef.name, rollNumber: f.studentRef.roll_number, department: f.studentRef.department } : null,
      dueDate: f.due_date,
      transactionId: f.transaction_id,
      paymentDate: f.payment_date
    }));

    res.json(mapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching fees list' });
  }
});

// @route   PUT api/admin/fees/:id
// @desc    Manually mark a fee as Paid
router.put('/fees/:id', async (req, res) => {
  try {
    const transactionId = 'CASH_OR_ADMIN_' + Math.random().toString(36).substr(2, 9).toUpperCase();
    
    const { data: fee, error } = await supabase
      .from('fees')
      .update({
        status: 'Paid',
        payment_date: new Date(),
        transaction_id: transactionId
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      ...fee,
      _id: fee.id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating fee record' });
  }
});

// @route   PUT api/admin/faculty/:id
// @desc    Update a faculty member's profile
router.put('/faculty/:id', async (req, res) => {
  const { name, department, designation, phone } = req.body;

  try {
    const { data: faculty, error } = await supabase
      .from('faculty')
      .update({
        name,
        department,
        designation,
        phone
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      ...faculty,
      _id: faculty.id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating faculty profile' });
  }
});

// @route   PUT api/admin/students/:id
// @desc    Update a student's profile
router.put('/students/:id', async (req, res) => {
  const { name, department, currentSemester, phone, cgpa } = req.body;

  try {
    const { data: student, error } = await supabase
      .from('students')
      .update({
        name,
        department,
        current_semester: currentSemester,
        phone,
        cgpa: parseFloat(cgpa) || 0.0
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      ...student,
      _id: student.id,
      rollNumber: student.roll_number,
      currentSemester: student.current_semester,
      cgpa: parseFloat(student.cgpa)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating student profile' });
  }
});

// @route   PUT api/admin/courses/:id
// @desc    Update a course's details
router.put('/courses/:id', async (req, res) => {
  const { title, department, semester, credits, facultyRef } = req.body;

  try {
    // Sanitize facultyRef UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const assignedFacultyId = uuidRegex.test(facultyRef) ? facultyRef : null;

    const { data: course, error } = await supabase
      .from('courses')
      .update({
        title,
        department,
        semester,
        credits: parseInt(credits),
        faculty_id: assignedFacultyId
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      ...course,
      _id: course.id,
      courseCode: course.course_code
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating course details' });
  }
});

module.exports = router;
