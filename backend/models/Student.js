const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  userRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  rollNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  currentSemester: {
    type: String,
    required: true,
    default: "1"
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  cgpa: {
    type: Number,
    default: 0.0
  }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
