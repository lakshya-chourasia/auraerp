const express = require('express');
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

const router = express.Router();

// Apply auth + role checks to all admin routes
router.use(protect, authorize('admin'));

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

    const { data: facultyExists } = await supabase
      .from('faculty')
      .select('id')
      .eq('employee_id', employeeId)
      .maybeSingle();

    if (facultyExists) {
      return res.status(400).json({ message: 'Faculty with this employee ID already exists' });
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
        employee_id: employeeId,
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
    
    res.json(faculties);
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
    
    // Map numerical cgpa from string numeric PostgreSQL type to float
    const enriched = students.map(s => ({
      ...s,
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

    const { data: course, error } = await supabase
      .from('courses')
      .insert({
        course_code: courseCode,
        title,
        department,
        semester,
        credits: parseInt(credits),
        faculty_id: facultyRef || null
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating course' });
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
    
    // Map field naming to support old frontend expectation
    const mapped = courses.map(c => ({
      ...c,
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

    res.status(201).json(fee);
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
    
    // Map keys to frontend naming expectations
    const mapped = fees.map(f => ({
      ...f,
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

    res.json(fee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating fee record' });
  }
});

module.exports = router;
