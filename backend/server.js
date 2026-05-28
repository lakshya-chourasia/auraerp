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

// Seed Admin User in Supabase if 'users' table has no admin
const seedAdmin = async () => {
  try {
    // Only attempt to seed if Supabase config exists
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return;
    }

    const { data: adminExists } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminExists) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('adminpassword123', salt);

      const { error } = await supabase.from('users').insert({
        email: 'admin@college.edu',
        password_hash: passwordHash,
        role: 'admin'
      });

      if (error) throw error;

      console.log('Seeded default Admin credentials to Supabase successfully:');
      console.log('Email: admin@college.edu');
      console.log('Password: adminpassword123');
    }
  } catch (error) {
    console.error('Error seeding admin to Supabase:', error.message);
  }
};

// Start seeding check
seedAdmin();

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
