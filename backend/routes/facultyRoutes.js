const express = require('express');
const supabase = require('../config/supabase');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

const router = express.Router();

// Apply auth + role checks to all faculty routes
router.use(protect, authorize('faculty'));

// Helper to get faculty profile of logged-in user
const getFacultyProfile = async (userId) => {
  const { data: profile, error } = await supabase
    .from('faculty')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !profile) {
    throw new Error('Faculty profile not found');
  }
  return profile;
};

// @route   GET api/faculty/courses
// @desc    Get courses assigned to the logged-in faculty
router.get('/courses', async (req, res) => {
  try {
    const faculty = await getFacultyProfile(req.user._id);
    
    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .eq('faculty_id', faculty.id);

    if (error) throw error;

    // Map column naming conventions and id to _id to support old frontend expectation
    const mappedCourses = courses.map(c => ({
      ...c,
      _id: c.id,
      courseCode: c.course_code,
      facultyRef: c.faculty_id
    }));

    res.json({ faculty, courses: mappedCourses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server error fetching faculty courses' });
  }
});

// @route   GET api/faculty/courses/:courseId/students
// @desc    Get students enrolled in a course (same department & semester)
router.get('/courses/:courseId/students', async (req, res) => {
  try {
    const { data: course, error: cErr } = await supabase
      .from('courses')
      .select('*')
      .eq('id', req.params.courseId)
      .single();

    if (cErr || !course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const { data: students, error: sErr } = await supabase
      .from('students')
      .select('*')
      .eq('department', course.department)
      .eq('current_semester', course.semester);

    if (sErr) throw sErr;
    
    // Map column naming conventions and id to _id to support old frontend expectation
    const mapped = students.map(s => ({
      ...s,
      _id: s.id,
      rollNumber: s.roll_number,
      currentSemester: s.current_semester,
      cgpa: parseFloat(s.cgpa)
    }));

    res.json(mapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching students' });
  }
});

// @route   POST api/faculty/marks
// @desc    Upload or update student marks
router.post('/marks', async (req, res) => {
  const { studentId, courseId, type, marksObtained, maxMarks } = req.body;

  try {
    // Sanitize UUID inputs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(studentId) || !uuidRegex.test(courseId)) {
      return res.status(400).json({ message: 'Invalid Student or Course selection (invalid UUID)' });
    }

    // Upsert using ON CONFLICT (unique constraint on student_id, course_id, type)
    const { data: mark, error } = await supabase
      .from('marks')
      .upsert({
        student_id: studentId,
        course_id: courseId,
        type,
        marks_obtained: parseInt(marksObtained),
        max_marks: parseInt(maxMarks)
      }, { onConflict: 'student_id,course_id,type' })
      .select()
      .single();

    if (error) throw error;

    // Map id to _id for frontend compatibility
    res.status(200).json({
      ...mark,
      _id: mark.id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error saving marks record', error: error.message });
  }
});

// @route   GET api/faculty/marks/:courseId
// @desc    Get all marks for a course
router.get('/marks/:courseId', async (req, res) => {
  try {
    const { data: marks, error } = await supabase
      .from('marks')
      .select('*, studentRef:students(name, roll_number), courseRef:courses(title, course_code)')
      .eq('course_id', req.params.courseId);

    if (error) throw error;
    
    // Map column naming conventions and id to _id to support old frontend expectation
    const mapped = marks.map(m => ({
      ...m,
      _id: m.id,
      studentRef: m.studentRef ? { name: m.studentRef.name, rollNumber: m.studentRef.roll_number } : null,
      courseRef: m.courseRef ? { title: m.courseRef.title, courseCode: m.courseRef.course_code } : null,
      marksObtained: m.marks_obtained,
      maxMarks: m.max_marks
    }));

    res.json(mapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching course marks' });
  }
});

// @route   POST api/faculty/attendance/session
// @desc    Generate a new dynamic QR session ID & location boundary coordinates
router.post('/attendance/session', async (req, res) => {
  const { courseId, lat, lng } = req.body;

  try {
    const { data: course, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (error || !course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const qrSessionId = 'ATT_' + course.course_code + '_' + Date.now();

    res.json({
      message: 'QR Attendance session initialized successfully',
      qrSessionId,
      courseId,
      courseCode: course.course_code,
      courseTitle: course.title,
      date: new Date(),
      lat: lat || null,
      lng: lng || null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating attendance session' });
  }
});

// @route   GET api/faculty/attendance/report/:courseId
// @desc    Get overall attendance analytics for a specific course
router.get('/attendance/report/:courseId', async (req, res) => {
  try {
    const { data: course, error: cErr } = await supabase
      .from('courses')
      .select('*')
      .eq('id', req.params.courseId)
      .single();

    if (cErr || !course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const { data: students, error: sErr } = await supabase
      .from('students')
      .select('*')
      .eq('department', course.department)
      .eq('current_semester', course.semester);

    if (sErr) throw sErr;

    const report = [];

    for (let student of students) {
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

      const attendancePct = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : "0.0";

      report.push({
        studentId: student.id,
        name: student.name,
        rollNumber: student.roll_number,
        present: presentCount || 0,
        absent: (totalCount || 0) - (presentCount || 0),
        total: totalCount || 0,
        percentage: parseFloat(attendancePct)
      });
    }

    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error generating attendance report' });
  }
});

module.exports = router;
