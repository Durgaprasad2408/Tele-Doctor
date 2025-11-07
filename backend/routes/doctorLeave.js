import express from 'express';
import DoctorLeave from '../models/DoctorLeave.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

// Create leave request (doctors only)
router.post('/', requireRole(['doctor']), async (req, res) => {
  try {
    const { startDate, endDate, reason, type } = req.body;

    console.log('📅 Creating leave request:', {
      doctor: req.user._id,
      startDate,
      endDate,
      reason,
      type
    });

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      return res.status(400).json({ message: 'Start date cannot be in the past' });
    }

    if (end < start) {
      return res.status(400).json({ message: 'End date cannot be before start date' });
    }

    // Check for overlapping leave requests
    const overlappingLeave = await DoctorLeave.findOne({
      doctor: req.user._id,
      status: { $in: ['pending', 'approved'] },
      $or: [
        {
          startDate: { $lte: end },
          endDate: { $gte: start }
        }
      ]
    });

    if (overlappingLeave) {
      return res.status(400).json({ 
        message: 'You already have a leave request for overlapping dates' 
      });
    }

    const leaveRequest = new DoctorLeave({
      doctor: req.user._id,
      startDate: start,
      endDate: end,
      reason,
      type
    });

    await leaveRequest.save();
    await leaveRequest.populate('doctor', 'firstName lastName email');

    console.log('✅ Leave request created successfully:', leaveRequest._id);

    res.status(201).json(leaveRequest);
  } catch (error) {
    console.error('❌ Leave request creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get doctor's leave requests
router.get('/', requireRole(['doctor']), async (req, res) => {
  try {
    const { status, year } = req.query;
    
    const query = { doctor: req.user._id };
    
    if (status) {
      query.status = status;
    }

    if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59);
      query.startDate = { $gte: startOfYear };
      query.endDate = { $lte: endOfYear };
    }

    const leaveRequests = await DoctorLeave.find(query)
      .populate('doctor', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json(leaveRequests);
  } catch (error) {
    console.error('Failed to fetch leave requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if doctor is available on a specific date
router.get('/availability/:doctorId/:date', async (req, res) => {
  try {
    const { doctorId, date } = req.params;
    const checkDate = new Date(date);
    
    // Check if doctor has approved leave on this date
    const leaveOnDate = await DoctorLeave.findOne({
      doctor: doctorId,
      status: 'approved',
      startDate: { $lte: checkDate },
      endDate: { $gte: checkDate }
    });

    const isAvailable = !leaveOnDate;
    
    res.json({ 
      isAvailable,
      leaveReason: leaveOnDate ? leaveOnDate.reason : null,
      leaveType: leaveOnDate ? leaveOnDate.type : null
    });
  } catch (error) {
    console.error('Failed to check doctor availability:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update leave request status (admin only - for now, doctors can approve their own)
router.put('/:id/status', requireRole(['doctor']), async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    
    const leaveRequest = await DoctorLeave.findOneAndUpdate(
      { _id: req.params.id, doctor: req.user._id },
      { 
        status,
        ...(status === 'approved' && { 
          approvedBy: req.user._id, 
          approvedAt: new Date() 
        }),
        ...(status === 'rejected' && rejectionReason && { rejectionReason })
      },
      { new: true }
    ).populate('doctor', 'firstName lastName email');

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    res.json(leaveRequest);
  } catch (error) {
    console.error('Failed to update leave request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete leave request
router.delete('/:id', requireRole(['doctor']), async (req, res) => {
  try {
    const leaveRequest = await DoctorLeave.findOneAndDelete({
      _id: req.params.id,
      doctor: req.user._id,
      status: 'pending' // Only allow deletion of pending requests
    });

    if (!leaveRequest) {
      return res.status(404).json({ 
        message: 'Leave request not found or cannot be deleted' 
      });
    }

    res.json({ message: 'Leave request deleted successfully' });
  } catch (error) {
    console.error('Failed to delete leave request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;