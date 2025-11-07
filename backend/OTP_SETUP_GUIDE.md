# 🏥 TeleMed OTP Authentication Setup Guide

## 📋 Overview
This guide will help you set up and test the Nodemailer-based OTP authentication system for TeleMed registration.

## 🚀 Features Implemented
- ✅ **3-Step Registration Form** with professional UI
- ✅ **Email OTP Verification** with beautiful HTML templates
- ✅ **Rate Limiting** (3 requests per 15 minutes per email/IP)
- ✅ **Security Features** (10-minute expiration, 3 attempt limit)
- ✅ **Real-time Countdown Timer** with resend functionality
- ✅ **Auto-verification** when all 6 digits are entered
- ✅ **Professional Email Templates** with TeleMed branding

## 📁 Files Created/Modified

### Backend Files
- `backend/services/emailService.js` - Nodemailer service with email templates
- `backend/utils/otpUtils.js` - OTP generation, validation, and rate limiting
- `backend/routes/otp.js` - OTP API endpoints
- `backend/index.js` - Server integration
- `backend/.env` - Email configuration
- `backend/test-otp.js` - Testing script

### Frontend Files
- `frontend/src/pages/Register.jsx` - 3-step registration with OTP

## ⚙️ Configuration Steps

### 1. Email Configuration
Update your `backend/.env` file with proper email credentials:

```env
# Email Configuration for OTP
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=telemed.noreply@gmail.com
EMAIL_PASSWORD=your-app-password-here
EMAIL_FROM=TeleMed Verification <telemed.noreply@gmail.com>
```

### 2. Gmail Setup (Recommended)
For Gmail, you need to create an App Password:
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Navigate to Security → 2-Step Verification
3. Create an App Password for "Mail"
4. Use the 16-digit app password in EMAIL_PASSWORD

### 3. Alternative Email Providers
You can also use other SMTP providers:

**Outlook/Hotmail:**
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

**Yahoo:**
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_USER=your-email@yahoo.com
EMAIL_PASSWORD=your-app-password
```

## 🧪 Testing the System

### 1. Start the Backend Server
```bash
cd backend
npm install  # if dependencies aren't installed
npm start    # or npm run dev
```

### 2. Test Email Configuration
```bash
node test-otp.js
```

This will test:
- Email configuration
- OTP generation and storage
- Full email sending flow
- Rate limiting

### 3. Test OTP Endpoints
You can test the OTP endpoints directly:

**Request OTP:**
```bash
curl -X POST http://localhost:5000/api/otp/request \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**Verify OTP:**
```bash
curl -X POST http://localhost:5000/api/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otp": "123456"}'
```

### 4. Test Health Check
```bash
curl http://localhost:5000/api/otp/health
```

## 🎯 Registration Flow

### Step 1: Basic Information
- Select role (Patient/Doctor)
- Enter name, email, password
- Phone (optional)

### Step 2: Role-Specific Information
**Patient:**
- Date of birth
- Gender

**Doctor:**
- Specialization
- License number
- Years of experience
- Consultation fee

### Step 3: OTP Verification
- Beautiful email sent with 6-digit code
- 6 input boxes for OTP entry
- Real-time countdown (10 minutes)
- Auto-focus navigation
- Resend functionality
- Auto-verification when complete

## 📧 Email Templates

### OTP Verification Email
- **Subject:** "Your TeleMed Verification Code"
- **Features:**
  - Professional TeleMed branding
  - 6-digit OTP in large, clear font
  - 10-minute expiration warning
  - Mobile-responsive design
  - Security best practices

### Welcome Email (Future Enhancement)
- **Subject:** "Welcome to TeleMed! 🎉"
- **Features:**
  - Role-specific welcome messages
  - Platform feature highlights
  - Getting started guide

## 🔒 Security Features

### Rate Limiting
- **Email-based:** 3 OTP requests per 15 minutes per email
- **IP-based:** 3 OTP requests per 15 minutes per IP address
- **Prevents abuse** and spam

### OTP Security
- **6-digit numeric codes** (100,000 - 999,999)
- **10-minute expiration** (configurable)
- **3 attempt limit** per OTP
- **Automatic cleanup** of expired OTPs

### Email Security
- **HTML sanitization** to prevent XSS
- **Secure SMTP configuration**
- **Professional sender identity**

## 🎨 UI/UX Features

### Registration Form
- **3-step progress indicator**
- **Responsive design** (mobile-first)
- **Smooth animations** with Framer Motion
- **Loading states** and error handling
- **Success feedback** with checkmarks

### OTP Input
- **6 individual input boxes**
- **Auto-focus navigation**
- **Auto-verification** when complete
- **Real-time countdown** timer
- **Resend functionality** with cooldown

### Error Handling
- **Network error detection**
- **Rate limit feedback**
- **Expired OTP handling**
- **Invalid OTP messages**
- **User-friendly error text**

## 🔧 Customization Options

### OTP Settings
In `backend/utils/otpUtils.js`, you can modify:
- **Expiration time:** `storeOTP(email, otp, 10)` (10 minutes)
- **Max attempts:** `maxAttempts: 3`
- **Rate limit:** `maxRequests: 3, timeWindow: 15`

### Email Templates
In `backend/services/emailService.js`, you can customize:
- **Subject lines**
- **HTML content and styling**
- **Branding colors**
- **Company information**

### UI Styling
In `frontend/src/pages/Register.jsx`, you can modify:
- **Color scheme**
- **Typography**
- **Animations**
- **Responsive breakpoints**

## 🚨 Troubleshooting

### Common Issues

1. **"Email configuration test failed"**
   - Check your email credentials in `.env`
   - For Gmail, ensure you're using an App Password
   - Verify SMTP settings match your provider

2. **"Failed to send verification code"**
   - Check network connectivity
   - Verify email service is running
   - Check server logs for detailed error

3. **"OTP expired" or "Invalid OTP"**
   - Ensure 10 minutes haven't passed
   - Check if attempts limit was reached
   - Try requesting a new OTP

4. **"Too many requests"**
   - Wait for rate limit to reset (15 minutes)
   - Check if you're making too many requests

### Debug Mode
Enable detailed logging by checking server console output. All OTP operations are logged for debugging.

## 📱 Mobile Support
The OTP system is fully responsive and optimized for mobile devices:
- Touch-friendly input boxes
- Optimized button sizes
- Mobile-first responsive design
- Safe area handling for iOS

## 🔄 Future Enhancements
Consider adding these features in the future:
- **SMS OTP** backup option
- **QR code** for app-based authentication
- **Passwordless login** with magic links
- **Biometric authentication**
- **Social login** integration

## 📞 Support
For issues or questions:
1. Check the troubleshooting section
2. Review server logs for error details
3. Test with the provided test script
4. Verify all configuration settings

## 🎉 Success Indicators
You'll know it's working when:
- ✅ Registration form shows 3 steps
- ✅ Email receives verification codes
- ✅ OTP inputs auto-focus and verify
- ✅ Users can complete registration
- ✅ Welcome emails are sent
- ✅ No console errors during testing

---

**Congratulations!** Your Nodemailer-based OTP authentication system is now ready to use! 🎊