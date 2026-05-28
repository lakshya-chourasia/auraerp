const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const { protect } = require('../middleware/auth');

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretjwtkeyforcollegeerpsystem123!', {
    expiresIn: '30d'
  });
};

// @route   POST api/auth/register-student
// @desc    Register a new student user and profile
router.post('/register-student', async (req, res) => {
  const { email, password, rollNumber, name, department, phone } = req.body;

  try {
    // 1. Check if user already exists
    const { data: userExists } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // 2. Check if student roll number already exists
    const { data: studentExists } = await supabase
      .from('students')
      .select('id')
      .eq('roll_number', rollNumber)
      .maybeSingle();

    if (studentExists) {
      return res.status(400).json({ message: 'Student with this roll number already exists' });
    }

    // 3. Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Create user credentials record
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        role: 'student'
      })
      .select()
      .single();

    if (userError || !user) {
      return res.status(500).json({ message: 'Error creating user credentials', error: userError?.message });
    }

    // 5. Create student profile record
    const { data: student, error: studentError } = await supabase
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

    if (studentError || !student) {
      // rollback user
      await supabase.from('users').delete().eq('id', user.id);
      return res.status(500).json({ message: 'Error creating student profile', error: studentError?.message });
    }

    res.status(201).json({
      _id: user.id,
      email: user.email,
      role: user.role,
      token: generateToken(user.id),
      studentProfile: student ? { ...student, _id: student.id } : null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error, registration failed', error: error.message });
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user and get token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Get user record
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 2. Compare bcrypt hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 3. Load profile details
    let profile = null;
    if (user.role === 'student') {
      const { data: studProfile } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      profile = studProfile;
    } else if (user.role === 'faculty') {
      const { data: facProfile } = await supabase
        .from('faculty')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      profile = facProfile;
    }

    res.json({
      _id: user.id,
      email: user.email,
      role: user.role,
      token: generateToken(user.id),
      profile: profile ? { ...profile, _id: profile.id } : null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
});

// @route   GET api/auth/profile
// @desc    Get user profile details
router.get('/profile', protect, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', req.user._id)
      .single();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let profile = null;
    if (user.role === 'student') {
      const { data: studProfile } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      profile = studProfile;
    } else if (user.role === 'faculty') {
      const { data: facProfile } = await supabase
        .from('faculty')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      profile = facProfile;
    }

    res.json({
      user: {
        _id: user.id,
        email: user.email,
        role: user.role
      },
      profile: profile ? { ...profile, _id: profile.id } : null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

module.exports = router;
