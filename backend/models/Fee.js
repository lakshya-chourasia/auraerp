const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  studentRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  feeType: {
    type: String,
    enum: ['Tuition', 'Library', 'Exam', 'Hostel'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Paid', 'Unpaid'],
    default: 'Unpaid'
  },
  dueDate: {
    type: Date,
    required: true
  },
  transactionId: {
    type: String,
    default: null
  },
  paymentDate: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Fee', feeSchema);
