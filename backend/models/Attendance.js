const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  courseRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Present', 'Absent'],
    required: true,
    default: 'Present'
  },
  qrSessionId: {
    type: String,
    required: true
  },
  location: {
    lat: Number,
    lng: Number
  }
}, { timestamps: true });

// Prevent duplicate attendance for same student on the same course on the same session
attendanceSchema.index({ studentRef: 1, courseRef: 1, qrSessionId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
