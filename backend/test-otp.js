import { testEmailConfiguration } from './services/emailService.js';
import { generateOTP, storeOTP, validateOTP } from './utils/otpUtils.js';
import { sendOTPMail } from './services/emailService.js';

console.log('🧪 Testing OTP System Components...\n');

// Test 1: Email Configuration
async function testEmailConfig() {
  console.log('1️⃣ Testing Email Configuration...');
  console.log('Environment variables:');
  console.log(`EMAIL_USER: ${process.env.EMAIL_USER ? 'Set' : 'NOT SET'}`);
  console.log(`EMAIL_PASSWORD: ${process.env.EMAIL_PASSWORD ? 'Set (length: ' + process.env.EMAIL_PASSWORD.length + ')' : 'NOT SET'}`);
  console.log(`EMAIL_FROM: ${process.env.EMAIL_FROM}`);

  try {
    console.log('Testing transporter verification...');
    console.log('Calling testEmailConfiguration...');
    const result = await testEmailConfiguration();
    console.log('testEmailConfiguration completed');
    console.log('Result received:', !!result);
    console.log('Result type:', typeof result);
    console.log('Result keys:', result ? Object.keys(result) : 'N/A');

    if (result && typeof result === 'object' && result.success) {
      console.log('✅ Email configuration test passed');
      console.log('Message:', result.message);
    } else {
      console.log('❌ Email configuration test failed');
      if (result && typeof result === 'object') {
        console.log('Error:', result.error);
        console.log('Error code:', result.code);
        console.log('Error message:', result.message);
      } else {
        console.log('No valid result returned from testEmailConfiguration');
        console.log('Result value:', result);
      }
    }
  } catch (error) {
    console.log('❌ Email configuration error:', error.message);
    console.log('Error stack:', error.stack);
  }
  console.log('Test 1 completed');
  return true;
}

// Test 2: OTP Generation and Storage
function testOTPGeneration() {
  console.log('\n2️⃣ Testing OTP Generation and Storage...');
  try {
    const testEmail = 'test@example.com';
    const otp = generateOTP();
    console.log(`Generated OTP: ${otp}`);
    
    const storeResult = storeOTP(testEmail, otp, 1); // 1 minute expiration
    console.log('OTP stored:', storeResult.success ? '✅' : '❌');
    
    // Test validation
    const validResult = validateOTP(testEmail, otp);
    console.log('Valid OTP test:', validResult.valid ? '✅' : '❌');
    
    // Test invalid OTP
    const invalidResult = validateOTP(testEmail, '123456');
    console.log('Invalid OTP test:', !invalidResult.valid ? '✅' : '❌');
    
  } catch (error) {
    console.log('❌ OTP generation error:', error.message);
  }
}

// Test 3: Full OTP Flow Simulation
async function testFullOTPFlow() {
  console.log('\n3️⃣ Testing Full OTP Flow Simulation...');
  try {
    const testEmail = 'user@test.com';
    const otp = generateOTP();

    console.log(`Sending OTP ${otp} to ${testEmail}...`);
    const sendResult = await sendOTPMail(testEmail, otp);

    if (sendResult.success) {
      console.log('✅ OTP email sent successfully');
      console.log('Message ID:', sendResult.messageId);

      // Simulate user entering the OTP
      const validationResult = validateOTP(testEmail, otp);
      console.log('OTP validation:', validationResult.valid ? '✅' : '❌');

    } else {
      console.log('❌ OTP email failed:', sendResult.error);
      console.log('Error code:', sendResult.code);
      console.log('Error message:', sendResult.message);
    }

  } catch (error) {
    console.log('❌ Full OTP flow error:', error.message);
  }
}

// Test 4: Rate Limiting
function testRateLimiting() {
  console.log('\n4️⃣ Testing Rate Limiting...');
  const { otpRateLimiter } = require('./utils/otpUtils.js');
  
  const testEmail = 'rate-test@example.com';
  
  // Test 3 requests (should be allowed)
  for (let i = 0; i < 3; i++) {
    const result = otpRateLimiter.canMakeRequest(testEmail, 3, 15);
    console.log(`Request ${i + 1}: ${result.allowed ? '✅ Allowed' : '❌ Blocked'} (${result.remainingRequests || 0} remaining)`);
  }
  
  // Test 4th request (should be blocked)
  const blockedResult = otpRateLimiter.canMakeRequest(testEmail, 3, 15);
  console.log(`Request 4: ${blockedResult.allowed ? '✅ Allowed' : '❌ Blocked'} - ${blockedResult.message}`);
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting OTP System Tests\n');

  const emailTestResult = await testEmailConfig();
  console.log('Email test result:', emailTestResult);

  testOTPGeneration();
  await testFullOTPFlow();
  testRateLimiting();

  console.log('\n🏁 Test suite completed!');
  process.exit(0);
}

// Handle module import/export
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { runAllTests };