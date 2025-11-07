import mongoose from 'mongoose';

const doctorLeaveSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['vacation', 'sick', 'emergency', 'other'],
    default: 'vacation'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectionReason: {
    type: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
doctorLeaveSchema.index({ doctor: 1, startDate: 1, endDate: 1 });
doctorLeaveSchema.index({ doctor: 1, status: 1 });

export default mongoose.model('DoctorLeave', doctorLeaveSchema);