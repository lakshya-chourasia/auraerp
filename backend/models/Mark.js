const mongoose = require('mongoose');

const markSchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['Internal 1', 'Internal 2', 'End Semester'],
    required: true
  },
  marksObtained: {
    type: Number,
    required: true
  },
  maxMarks: {
    type: Number,
    required: true,
    default: 100
  }
}, { timestamps: true });

// Prevent duplicate entries for same student, course, and exam type
markSchema.index({ studentRef: 1, courseRef: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Mark', markSchema);
