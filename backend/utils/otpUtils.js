import crypto from 'crypto';

// In-memory store for OTPs (in production, use Redis or database)
const otpStore = new Map();

/**
 * Generate a random 6-digit OTP
 * @returns {string} 6-digit OTP string
 */
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Store OTP with expiration time
 * @param {string} email - User email
 * @param {string} otp - Generated OTP
 * @param {number} expirationMinutes - Expiration time in minutes (default: 10)
 * @returns {Object} OTP storage result
 */
export const storeOTP = (email, otp, expirationMinutes = 10) => {
  const expirationTime = new Date();
  expirationTime.setMinutes(expirationTime.getMinutes() + expirationMinutes);
  
  otpStore.set(email, {
    otp,
    expirationTime,
    attempts: 0,
    maxAttempts: 3,
    createdAt: new Date()
  });
  
  console.log(`OTP stored for ${email}, expires at: ${expirationTime.toISOString()}`);
  return {
    success: true,
    expirationTime,
    message: 'OTP stored successfully'
  };
};

/**
 * Validate OTP for a given email
 * @param {string} email - User email
 * @param {string} inputOTP - OTP to validate
 * @returns {Object} Validation result
 */
export const validateOTP = (email, inputOTP) => {
  console.log(`Validating OTP for ${email}: ${inputOTP}`);
  
  const otpData = otpStore.get(email);
  
  if (!otpData) {
    console.log(`No OTP found for ${email}`);
    return {
      success: false,
      valid: false,
      message: 'No OTP found for this email. Please request a new one.',
      error: 'OTP_NOT_FOUND'
    };
  }
  
  // Check if OTP has expired
  const now = new Date();
  if (now > otpData.expirationTime) {
    console.log(`OTP expired for ${email}`);
    otpStore.delete(email); // Remove expired OTP
    return {
      success: false,
      valid: false,
      message: 'OTP has expired. Please request a new one.',
      error: 'OTP_EXPIRED'
    };
  }
  
  // Check if maximum attempts exceeded
  if (otpData.attempts >= otpData.maxAttempts) {
    console.log(`Max attempts exceeded for ${email}`);
    otpStore.delete(email); // Remove OTP after max attempts
    return {
      success: false,
      valid: false,
      message: 'Too many invalid attempts. Please request a new OTP.',
      error: 'MAX_ATTEMPTS_EXCEEDED'
    };
  }
  
  // Increment attempt count
  otpData.attempts++;
  
  // Validate OTP
  if (otpData.otp === inputOTP) {
    console.log(`OTP validated successfully for ${email}`);
    otpStore.delete(email); // Remove OTP after successful validation
    return {
      success: true,
      valid: true,
      message: 'OTP validated successfully'
    };
  } else {
    console.log(`Invalid OTP for ${email}. Attempt ${otpData.attempts}/${otpData.maxAttempts}`);
    return {
      success: false,
      valid: false,
      message: `Invalid OTP. ${otpData.maxAttempts - otpData.attempts} attempts remaining.`,
      error: 'INVALID_OTP',
      attemptsLeft: otpData.maxAttempts - otpData.attempts
    };
  }
};

/**
 * Remove OTP for a given email (cleanup)
 * @param {string} email - User email
 * @returns {Object} Cleanup result
 */
export const removeOTP = (email) => {
  const deleted = otpStore.delete(email);
  console.log(`OTP ${deleted ? 'removed' : 'not found'} for ${email}`);
  return {
    success: true,
    removed: deleted,
    message: deleted ? 'OTP removed successfully' : 'No OTP found to remove'
  };
};

/**
 * Check if OTP exists for a given email
 * @param {string} email - User email
 * @returns {Object} Check result
 */
export const hasOTP = (email) => {
  const otpData = otpStore.get(email);
  const exists = !!otpData;
  const notExpired = exists && new Date() <= otpData.expirationTime;
  
  return {
    exists,
    notExpired,
    otpData: exists ? {
      expirationTime: otpData.expirationTime,
      attempts: otpData.attempts,
      maxAttempts: otpData.maxAttempts,
      timeLeft: Math.max(0, Math.floor((otpData.expirationTime - new Date()) / 1000 / 60)) // minutes left
    } : null
  };
};

/**
 * Clean up expired OTPs
 * @returns {number} Number of cleaned up OTPs
 */
export const cleanupExpiredOTPs = () => {
  const now = new Date();
  let cleanedCount = 0;
  
  for (const [email, otpData] of otpStore.entries()) {
    if (now > otpData.expirationTime) {
      otpStore.delete(email);
      cleanedCount++;
    }
  }
  
  console.log(`Cleaned up ${cleanedCount} expired OTPs`);
  return cleanedCount;
};

/**
 * Get OTP statistics
 * @returns {Object} OTP store statistics
 */
export const getOTPStats = () => {
  const now = new Date();
  let total = 0;
  let expired = 0;
  let valid = 0;
  
  for (const otpData of otpStore.values()) {
    total++;
    if (now > otpData.expirationTime) {
      expired++;
    } else {
      valid++;
    }
  }
  
  return {
    total,
    valid,
    expired,
    utilizationRate: total > 0 ? (valid / total * 100).toFixed(2) + '%' : '0%'
  };
};

/**
 * Generate secure random string for additional security
 * @param {number} length - Length of the random string
 * @returns {string} Secure random string
 */
export const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Rate limiting utility for OTP requests
 */
class RateLimiter {
  constructor() {
    this.requests = new Map();
  }
  
  /**
   * Check if user can request OTP
   * @param {string} identifier - User identifier (email or IP)
   * @param {number} maxRequests - Maximum requests allowed
   * @param {number} timeWindow - Time window in minutes
   * @returns {Object} Rate limit check result
   */
  canMakeRequest(identifier, maxRequests = 3, timeWindow = 15) {
    const now = new Date();
    const userRequests = this.requests.get(identifier) || [];
    
    // Remove old requests outside time window
    const recentRequests = userRequests.filter(
      time => now - time < timeWindow * 60 * 1000
    );
    
    if (recentRequests.length >= maxRequests) {
      const oldestRequest = Math.min(...recentRequests);
      const timeUntilNext = Math.ceil((timeWindow * 60 * 1000 - (now - oldestRequest)) / 1000 / 60);
      
      return {
        allowed: false,
        message: `Too many requests. Try again in ${timeUntilNext} minutes.`,
        timeUntilNext
      };
    }
    
    // Add current request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    
    return {
      allowed: true,
      remainingRequests: maxRequests - recentRequests.length
    };
  }
  
  /**
   * Reset rate limit for a user
   * @param {string} identifier - User identifier
   */
  reset(identifier) {
    this.requests.delete(identifier);
  }
}

// Export rate limiter instance
export const otpRateLimiter = new RateLimiter();

// Cleanup expired OTPs every 15 minutes
setInterval(() => {
  cleanupExpiredOTPs();
}, 15 * 60 * 1000);

console.log('OTP utilities initialized successfully');