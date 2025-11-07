import express from 'express';
import User from '../models/User.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    console.log('Profile update request:', {
      userId: req.user._id,
      userRole: req.user.role,
      updates: { ...req.body, password: '[HIDDEN]' }
    });

    const updates = { ...req.body };
    
    // Remove sensitive fields that shouldn't be updated through this route
    delete updates.password;
    delete updates.email;
    delete updates.role;
    delete updates._id;
    delete updates.__v;
    delete updates.createdAt;
    delete updates.updatedAt;

    // Remove empty strings and undefined values to prevent validation errors
    Object.keys(updates).forEach(key => {
      if (updates[key] === '' || updates[key] === undefined) {
        delete updates[key];
      }
    });

    // Validate required fields based on role
    if (req.user.role === 'doctor') {
      const requiredDoctorFields = ['specialization', 'experience', 'consultationFee'];
      for (const field of requiredDoctorFields) {
        if (updates[field] !== undefined && (updates[field] === '' || updates[field] === null)) {
          return res.status(400).json({ 
            message: `${field} is required for doctors` 
          });
        }
      }
      
      // Convert numeric fields
      if (updates.experience !== undefined) {
        updates.experience = parseInt(updates.experience);
        if (isNaN(updates.experience) || updates.experience < 0) {
          return res.status(400).json({ 
            message: 'Experience must be a valid positive number' 
          });
        }
      }
      
      if (updates.consultationFee !== undefined) {
        updates.consultationFee = parseFloat(updates.consultationFee);
        if (isNaN(updates.consultationFee) || updates.consultationFee < 0) {
          return res.status(400).json({ 
            message: 'Consultation fee must be a valid positive number' 
          });
        }
      }
    } else if (req.user.role === 'patient') {
      const requiredPatientFields = ['dateOfBirth', 'gender'];
      for (const field of requiredPatientFields) {
        if (updates[field] !== undefined && (updates[field] === '' || updates[field] === null)) {
          return res.status(400).json({ 
            message: `${field} is required for patients` 
          });
        }
      }
      
      // Validate date of birth
      if (updates.dateOfBirth) {
        const dob = new Date(updates.dateOfBirth);
        if (isNaN(dob.getTime())) {
          return res.status(400).json({ 
            message: 'Invalid date of birth' 
          });
        }
        updates.dateOfBirth = dob;
      }
      
      // Validate gender
      if (updates.gender && !['male', 'female', 'other'].includes(updates.gender)) {
        return res.status(400).json({ 
          message: 'Gender must be male, female, or other' 
        });
      }
    }

    console.log('Processed updates:', updates);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { 
        new: true, 
        runValidators: true,
        context: 'query' // This helps with conditional validation
      }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Profile updated successfully:', user._id);
    res.json(user);
  } catch (error) {
    console.error('Profile update error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors 
      });
    }
    
    // Handle cast errors (e.g., invalid ObjectId)
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        message: 'Invalid data format' 
      });
    }
    
    res.status(500).json({ 
      message: 'Server error during profile update',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get all doctors (for patients to browse)
router.get('/doctors', async (req, res) => {
  try {
    const { specialization, page = 1, limit = 10 } = req.query;
    
    const query = { role: 'doctor', isActive: true };
    if (specialization) {
      query.specialization = new RegExp(specialization, 'i');
    }

    const doctors = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      doctors,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Doctors fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get doctor by ID
router.get('/doctors/:id', async (req, res) => {
  try {
    const doctor = await User.findOne({
      _id: req.params.id,
      role: 'doctor',
      isActive: true
    }).select('-password');

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json(doctor);
  } catch (error) {
    console.error('Doctor fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;