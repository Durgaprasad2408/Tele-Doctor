# 📧 How to Get Email Credentials for TeleMed OTP System

## 🎯 Quick Overview
You need to set up an email account to send OTP verification codes. This guide shows you how to do it with **Gmail** (recommended) or other email providers.

## 🌟 Option 1: Gmail Setup (RECOMMENDED)

### Step 1: Create a Gmail Account (or use existing)
1. Go to [https://gmail.com](https://gmail.com)
2. Create account: `telemed.noreply@gmail.com` (or your choice)
3. Remember the email and password for later

### Step 2: Enable 2-Factor Authentication
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Click on **"Security"** in the left menu
3. Under "How you sign in to Google", click **"2-Step Verification"**
4. Follow the setup process to enable 2FA

### Step 3: Generate an App Password
1. While still in Google Account Settings
2. Go to **"Security"** → **"2-Step Verification"**
3. Scroll down and click **"App passwords"**
4. Select **"Mail"** and **"Other (custom name)"**
5. Enter name: `TeleMed OTP System`
6. Click **"GENERATE"**
7. **IMPORTANT**: Copy the 16-digit password that appears (format: xxxx xxxx xxxx xxxx)
8. This is your `EMAIL_PASSWORD`

### Your Gmail Credentials:
```
EMAIL_USER=telemed.noreply@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx (16-digit app password)
EMAIL_FROM=TeleMed Verification <telemed.noreply@gmail.com>
```

## 🔧 Option 2: Using Your Personal Email

### If you already have a Gmail account:
1. Follow steps 2-3 above to create an App Password
2. Use your existing email address

### Your Personal Gmail Credentials:
```
EMAIL_USER=yourname@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx (your app password)
EMAIL_FROM=TeleMed Verification <yourname@gmail.com>
```

## 🏢 Option 3: Other Email Providers

### Outlook/Hotmail:
1. Create account at [outlook.com](https://outlook.com)
2. Go to Account Settings → Security
3. Enable 2FA if not already enabled
4. Generate app password
```
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=TeleMed Verification <your-email@outlook.com>
```

### Yahoo Mail:
1. Create account at [yahoo.com](https://yahoo.com)
2. Go to Account Security
3. Generate app password
```
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@yahoo.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=TeleMed Verification <your-email@yahoo.com>
```

## 🔄 Step 4: Update Your .env File

After getting your credentials, update `backend/.env`:

### For Gmail:
```env
# Email Configuration for OTP
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=telemed.noreply@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_FROM=TeleMed Verification <telemed.noreply@gmail.com>
```

### For Outlook:
```env
# Email Configuration for OTP
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=TeleMed Verification <your-email@outlook.com>
```

## 🧪 Step 5: Test Your Setup

### Test Email Configuration:
```bash
cd backend
node test-otp.js
```

This will test:
- Email connection
- OTP generation
- Email sending
- Rate limiting

### Test OTP Endpoints:
```bash
# Test OTP request
curl -X POST http://localhost:5000/api/otp/request \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

## ⚠️ Important Notes

### Gmail App Passwords:
- **Don't use your regular Gmail password** - it won't work
- App passwords are 16-digit codes (format: xxxx xxxx xxxx xxxx)
- You need to enable 2FA first to create app passwords
- Each app password is specific to one application

### Security:
- Keep your app password secret
- Don't share it with anyone
- It's okay to commit the regular .env file (app passwords aren't secrets in development)

### Free Limits:
- **Gmail**: 100 emails per day (free account)
- **Outlook**: 300 emails per day (free account)
- **Yahoo**: 200 emails per day (free account)

This is usually more than enough for testing and small deployments.

## 🎯 Quick Test

### Minimal Test:
1. Update your .env with the credentials
2. Start your backend: `cd backend && npm start`
3. Open browser and go to: `http://localhost:3000/register` (or your frontend URL)
4. Fill out the registration form
5. Check the email you used for the OTP code
6. Enter the OTP and complete registration

### Success Indicators:
- ✅ You receive the email with OTP code
- ✅ The 6-digit code is clearly displayed
- ✅ You can enter the code in the form
- ✅ Registration completes successfully
- ✅ No errors in server console

## 🚨 Troubleshooting

### "Authentication failed":
- Double-check your email and password
- For Gmail, make sure you're using the 16-digit app password
- Verify 2FA is enabled

### "Connection refused":
- Check if you can receive emails from the email account manually
- Verify internet connection
- Check if port 587 is not blocked

### "Email not received":
- Check spam/junk folder
- Verify email address is correct
- Try requesting a new OTP

## 🎉 You're Ready!

Once you have your email credentials configured, your OTP system will be fully functional! Users will receive beautiful, professional email verification codes, and your 3-step registration will work perfectly.

## 📞 Need Help?

1. **Gmail Issues**: Check [Google's App Password Help](https://support.google.com/accounts/answer/185833)
2. **General SMTP Issues**: Test with your email provider's SMTP settings
3. **Testing**: Use `node test-otp.js` to verify everything works

---
**Pro Tip**: Start with Gmail as it's the most reliable for development and testing!