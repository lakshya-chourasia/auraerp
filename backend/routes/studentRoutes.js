const express = require('express');
const supabase = require('../config/supabase');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

const router = express.Router();

// Apply auth + role checks to all student routes
router.use(protect, authorize('student'));

// Helper to get student profile of logged-in user
const getStudentProfile = async (userId) => {
  const { data: profile, error } = await supabase
    .from('students')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !profile) {
    throw new Error('Student profile not found');
  }
  return profile;
};

// Haversine formula for calculating distance in meters between two coordinates
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};

// @route   GET api/student/dashboard
// @desc    Retrieve courses, CGPA, and metrics for Student
router.get('/dashboard', async (req, res) => {
  try {
    const student = await getStudentProfile(req.user._id);

    const { data: courses, error } = await supabase
      .from('courses')
      .select('*, facultyRef:faculty(name, designation)')
      .eq('department', student.department)
      .eq('semester', student.current_semester);

    if (error) throw error;

    // Aggregate attendance percentages per course
    const attendanceStats = [];
    if (courses) {
      for (let course of courses) {
        const { count: presentCount } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', student.id)
          .eq('course_id', course.id)
          .eq('status', 'Present');

        const { count: totalCount } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', student.id)
          .eq('course_id', course.id);

        const pct = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : "0.0";
        
        attendanceStats.push({
          courseId: course.id,
          courseCode: course.course_code,
          courseTitle: course.title,
          present: presentCount || 0,
          total: totalCount || 0,
          percentage: parseFloat(pct)
        });
      }
    }

    // Map column naming conventions and id to _id to support old frontend expectation
    const mappedStudent = {
      ...student,
      _id: student.id,
      rollNumber: student.roll_number,
      currentSemester: student.current_semester,
      cgpa: parseFloat(student.cgpa)
    };

    const mappedCourses = courses.map(c => ({
      ...c,
      _id: c.id,
      courseCode: c.course_code,
      facultyRef: c.facultyRef ? { name: c.facultyRef.name, designation: c.facultyRef.designation } : null
    }));

    res.json({
      student: mappedStudent,
      courses: mappedCourses,
      attendanceStats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server error loading student dashboard' });
  }
});

// @route   GET api/student/marks
// @desc    View marks/academic performance & calculate CGPA dynamically
router.get('/marks', async (req, res) => {
  try {
    const student = await getStudentProfile(req.user._id);

    const { data: marks, error } = await supabase
      .from('marks')
      .select('*, courseRef:courses(title, course_code, credits, semester)')
      .eq('student_id', student.id);

    if (error) throw error;

    // Calculate dynamic CGPA
    let totalGradePoints = 0;
    let totalCredits = 0;
    const courseGradesMap = {};

    marks.forEach(mark => {
      const courseId = mark.course_id;
      if (!courseGradesMap[courseId]) {
        courseGradesMap[courseId] = {
          credits: mark.courseRef.credits,
          title: mark.courseRef.title,
          courseCode: mark.courseRef.course_code,
          scores: {}
        };
      }
      courseGradesMap[courseId].scores[mark.type] = mark.marks_obtained;
    });

    const marksReport = Object.values(courseGradesMap).map(item => {
      const internal1 = item.scores['Internal 1'] || 0;
      const internal2 = item.scores['Internal 2'] || 0;
      const endSem = item.scores['End Semester'] || 0;
      
      const total = Math.min(100, Math.round(internal1 * 0.2 + internal2 * 0.2 + endSem * 0.6));
      
      let gp = 0;
      let grade = 'F';
      if (total >= 90) { gp = 10; grade = 'A+'; }
      else if (total >= 80) { gp = 9; grade = 'A'; }
      else if (total >= 70) { gp = 8; grade = 'B'; }
      else if (total >= 60) { gp = 7; grade = 'C'; }
      else if (total >= 50) { gp = 6; grade = 'D'; }
      
      totalGradePoints += gp * item.credits;
      totalCredits += item.credits;

      return {
        courseCode: item.courseCode,
        title: item.title,
        credits: item.credits,
        internal1,
        internal2,
        endSem,
        total,
        grade,
        gradePoint: gp
      };
    });

    const calculatedCGPA = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : "0.00";
    
    // Update student CGPA in Supabase if changed
    if (totalCredits > 0 && parseFloat(calculatedCGPA) !== parseFloat(student.cgpa)) {
      await supabase
        .from('students')
        .update({ cgpa: parseFloat(calculatedCGPA) })
        .eq('id', student.id);
    }

    res.json({
      marksReport,
      cgpa: calculatedCGPA,
      totalCredits
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching marks' });
  }
});

// @route   POST api/student/attendance/scan
// @desc    Scan QR Code to submit attendance with location verification
router.post('/attendance/scan', async (req, res) => {
  const { qrSessionId, courseId, lat, lng, sessionLat, sessionLng } = req.body;

  try {
    const student = await getStudentProfile(req.user._id);

    // 1. Check for duplicate attendance submissions
    const { data: attendanceExists } = await supabase
      .from('attendance')
      .select('id')
      .eq('student_id', student.id)
      .eq('course_id', courseId)
      .eq('qr_session_id', qrSessionId)
      .maybeSingle();

    if (attendanceExists) {
      return res.status(400).json({ message: 'Attendance already recorded for this session' });
    }

    // 2. Location geofence verification
    if (sessionLat && sessionLng && lat && lng) {
      const distance = getDistance(
        parseFloat(lat),
        parseFloat(lng),
        parseFloat(sessionLat),
        parseFloat(sessionLng)
      );

      if (distance > 100) {
        return res.status(400).json({
          message: `Location check failed. You are too far from the classroom (${Math.round(distance)}m away).`
        });
      }
    }

    // 3. Save attendance record in Supabase
    const { data: attendance, error } = await supabase
      .from('attendance')
      .insert({
        student_id: student.id,
        course_id: courseId,
        qr_session_id: qrSessionId,
        status: 'Present',
        latitude: lat ? parseFloat(lat) : null,
        longitude: lng ? parseFloat(lng) : null
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Attendance recorded successfully!',
      attendance
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error recording attendance', error: error.message });
  }
});

// @route   GET api/student/fees
// @desc    Get student fee invoices
router.get('/fees', async (req, res) => {
  try {
    const student = await getStudentProfile(req.user._id);
    const { data: fees, error } = await supabase
      .from('fees')
      .select('*')
      .eq('student_id', student.id);

    if (error) throw error;

    // Map column naming conventions and id to _id to support old frontend expectation
    const mapped = fees.map(f => ({
      ...f,
      _id: f.id,
      feeType: f.fee_type,
      dueDate: f.due_date,
      transactionId: f.transaction_id,
      paymentDate: f.payment_date
    }));

    res.json(mapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching fees' });
  }
});

// @route   POST api/student/fees/pay/:id
// @desc    Simulate paying a fee invoice online
router.post('/fees/pay/:id', async (req, res) => {
  try {
    const transactionId = 'TXN_' + Math.random().toString(36).substr(2, 9).toUpperCase();
    
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

    // Map column naming conventions and id to _id to support old frontend expectation
    const mappedFee = {
      ...fee,
      _id: fee.id,
      feeType: fee.fee_type,
      dueDate: fee.due_date,
      transactionId: fee.transaction_id,
      paymentDate: fee.payment_date
    };

    res.json({
      message: 'Payment simulated successfully!',
      fee: mappedFee
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error processing payment simulation' });
  }
});

module.exports = router;
