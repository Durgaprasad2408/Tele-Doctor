import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Enhanced validation with conditional checks
const registrationValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('firstName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('First name is required'),
  body('lastName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Last name is required'),
  body('role')
    .isIn(['patient', 'doctor'])
    .withMessage('Role must be either patient or doctor'),
  
  // Conditional validation for doctor fields
  body('specialization')
    .if(body('role').equals('doctor'))
    .notEmpty()
    .withMessage('Specialization is required for doctors'),
  body('licenseNumber')
    .if(body('role').equals('doctor'))
    .notEmpty()
    .withMessage('License number is required for doctors'),
  body('experience')
    .if(body('role').equals('doctor'))
    .isInt({ min: 0 })
    .withMessage('Experience must be a valid number'),
  body('consultationFee')
    .if(body('role').equals('doctor'))
    .isFloat({ min: 0 })
    .withMessage('Consultation fee must be a valid amount'),
  
  // Conditional validation for patient fields
  body('dateOfBirth')
    .if(body('role').equals('patient'))
    .isISO8601()
    .withMessage('Valid date of birth is required for patients'),
  body('gender')
    .if(body('role').equals('patient'))
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender is required for patients')
];

// Login validation
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Register
router.post('/register', registrationValidation, async (req, res) => {
  try {
    console.log('Registration attempt:', { ...req.body, password: '[HIDDEN]' });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { email, password, firstName, lastName, role, ...otherData } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Prepare user data based on role
    const userData = {
      email,
      password,
      firstName,
      lastName,
      role
    };

    // Add role-specific fields
    if (role === 'doctor') {
      userData.specialization = otherData.specialization;
      userData.licenseNumber = otherData.licenseNumber;
      userData.experience = parseInt(otherData.experience);
      userData.consultationFee = parseFloat(otherData.consultationFee);
      userData.availability = otherData.availability || [];
    } else if (role === 'patient') {
      userData.dateOfBirth = new Date(otherData.dateOfBirth);
      userData.gender = otherData.gender;
      userData.medicalHistory = otherData.medicalHistory || [];
    }

    // Add optional fields
    if (otherData.phone) {
      userData.phone = otherData.phone;
    }

    console.log('Creating user with data:', { ...userData, password: '[HIDDEN]' });

    // Create new user
    const user = new User(userData);
    await user.save();

    console.log('User created successfully:', user._id);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors 
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    res.status(500).json({ 
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Login
router.post('/login', loginValidation, async (req, res) => {
  try {
    console.log('Login attempt:', { email: req.body.email, password: '[HIDDEN]' });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Login validation errors:', errors.array());
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    console.log('User found:', user._id);

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Password mismatch for user:', email);
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    console.log('Password verified for user:', email);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    console.log('Login successful for user:', email);

    res.json({
      message: 'Login successful',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export default router;