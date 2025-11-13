import express from 'express';
import { body, validationResult } from 'express-validator';
import { sendOTPMail, testEmailConfiguration } from '../services/emailService.js';
import { 
  generateOTP, 
  storeOTP, 
  validateOTP, 
  removeOTP, 
  hasOTP, 
  otpRateLimiter 
} from '../utils/otpUtils.js';

const router = express.Router();

// Validation for OTP request
const otpRequestValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
];

// Validation for OTP verification
const otpVerificationValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit number'),
];

/**
 * Request OTP for email verification
 * POST /api/otp/request
 */
router.post('/request', otpRequestValidation, async (req, res) => {
  try {
    console.log('OTP request received for:', req.body.email);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('OTP request validation errors:', errors.array());
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    // Check rate limiting (limit to 3 requests per 15 minutes per email/IP)
    const rateLimitEmail = otpRateLimiter.canMakeRequest(email);
    const rateLimitIP = otpRateLimiter.canMakeRequest(clientIP);
    
    if (!rateLimitEmail.allowed) {
      console.log(`Rate limit exceeded for email: ${email}`);
      return res.status(429).json({
        message: rateLimitEmail.message,
        type: 'RATE_LIMIT_EMAIL'
      });
    }
    
    if (!rateLimitIP.allowed) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`);
      return res.status(429).json({
        message: rateLimitIP.message,
        type: 'RATE_LIMIT_IP'
      });
    }

    // Check if there's already a valid OTP
    const existingOTP = hasOTP(email);
    if (existingOTP.exists && existingOTP.notExpired) {
      console.log(`Valid OTP already exists for ${email}`);
      return res.status(400).json({
        message: `A verification code was already sent. Please check your email or try again in ${existingOTP.otpData.timeLeft} minutes.`,
        type: 'OTP_ALREADY_SENT',
        timeLeft: existingOTP.otpData.timeLeft
      });
    }

    // Remove any existing OTP for this email
    removeOTP(email);

    // Generate new OTP
    const otp = generateOTP();
    console.log(`Generated OTP ${otp} for ${email}`);

    // Store OTP with 10-minute expiration
    storeOTP(email, otp, 10);

    // Send OTP via email
    const emailResult = await sendOTPMail(email, otp);
    
    if (!emailResult.success) {
      console.error('Failed to send OTP email:', emailResult.error);
      // Remove OTP if email fails
      removeOTP(email);
      return res.status(500).json({
        message: 'Failed to send verification code. Please try again.',
        type: 'EMAIL_SEND_FAILED',
        error: process.env.NODE_ENV === 'development' ? emailResult.error : undefined
      });
    }

    console.log(`OTP sent successfully to ${email}`);

    // Return success response
    res.json({
      success: true,
      message: 'Verification code sent successfully',
      type: 'OTP_SENT',
      email: email,
      // In development, you might want to include the OTP for testing
      ...(process.env.NODE_ENV === 'development' && { otp: otp })
    });

  } catch (error) {
    console.error('Error in OTP request:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Verify OTP code
 * POST /api/otp/verify
 */
router.post('/verify', otpVerificationValidation, async (req, res) => {
  try {
    console.log('OTP verification received for:', req.body.email);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('OTP verification validation errors:', errors.array());
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, otp } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    // Validate OTP
    const otpValidationResult = validateOTP(email, otp);
    
    if (!otpValidationResult.success) {
      console.log(`OTP validation failed for ${email}:`, otpValidationResult.error);
      
      // Determine appropriate status code and error type
      let statusCode = 400;
      let errorType = 'INVALID_OTP';
      
      switch (otpValidationResult.error) {
        case 'OTP_EXPIRED':
          statusCode = 410; // Gone
          errorType = 'OTP_EXPIRED';
          break;
        case 'MAX_ATTEMPTS_EXCEEDED':
          statusCode = 429; // Too Many Requests
          errorType = 'MAX_ATTEMPTS_EXCEEDED';
          break;
        case 'OTP_NOT_FOUND':
          statusCode = 404; // Not Found
          errorType = 'OTP_NOT_FOUND';
          break;
      }
      
      return res.status(statusCode).json({
        message: otpValidationResult.message,
        type: errorType,
        ...(otpValidationResult.attemptsLeft && { attemptsLeft: otpValidationResult.attemptsLeft })
      });
    }

    console.log(`OTP verified successfully for ${email}`);

    // Reset rate limit on successful verification
    otpRateLimiter.reset(email);
    otpRateLimiter.reset(clientIP);

    // Return success response
    res.json({
      success: true,
      message: 'Email verified successfully',
      type: 'OTP_VERIFIED',
      email: email,
      verified: true
    });

  } catch (error) {
    console.error('Error in OTP verification:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Resend OTP (alias for request)
 * POST /api/otp/resend
 */
router.post('/resend', otpRequestValidation, async (req, res) => {
  try {
    // Remove existing OTP first
    const { email } = req.body;
    removeOTP(email);
    
    // Then request new OTP
    req.url = '/request';
    req.method = 'POST';
    return router.handle(req, res);
  } catch (error) {
    console.error('Error in OTP resend:', error);
    res.status(500).json({
      message: 'Failed to resend verification code',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Check OTP status
 * POST /api/otp/status
 */
router.post('/status', otpRequestValidation, async (req, res) => {
  try {
    const { email } = req.body;
    const otpStatus = hasOTP(email);
    
    res.json({
      success: true,
      email: email,
      hasOTP: otpStatus.exists,
      notExpired: otpStatus.notExpired,
      ...(otpStatus.otpData && {
        timeLeft: otpStatus.otpData.timeLeft,
        attempts: otpStatus.otpData.attempts,
        maxAttempts: otpStatus.otpData.maxAttempts
      })
    });
  } catch (error) {
    console.error('Error in OTP status check:', error);
    res.status(500).json({
      message: 'Failed to check OTP status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Test email configuration
 * GET /api/otp/test-email
 */
router.get('/test-email', async (req, res) => {
  try {
    console.log('Testing email configuration...');
    const result = await testEmailConfiguration();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        type: 'EMAIL_TEST_SUCCESS'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Email configuration test failed',
        error: result.error,
        type: 'EMAIL_TEST_FAILED'
      });
    }
  } catch (error) {
    console.error('Error testing email configuration:', error);
    res.status(500).json({
      message: 'Email configuration test failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Health check for OTP service
 * GET /api/otp/health
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'OTP Service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;