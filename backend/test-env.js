import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('\n=== Environment Variables Check ===\n');

// Check all required variables
const checks = {
  'MONGODB_URI': process.env.MONGODB_URI,
  'JWT_SECRET': process.env.JWT_SECRET,
  'CLIENT_URL': process.env.CLIENT_URL,
  'BREVO_SMTP_HOST': process.env.BREVO_SMTP_HOST,
  'BREVO_SMTP_PORT': process.env.BREVO_SMTP_PORT,
  'BREVO_SMTP_USER': process.env.BREVO_SMTP_USER,
  'BREVO_SMTP_PASS': process.env.BREVO_SMTP_PASS,
  'CLOUDINARY_CLOUD_NAME': process.env.CLOUDINARY_CLOUD_NAME,
  'CLOUDINARY_API_KEY': process.env.CLOUDINARY_API_KEY,
  'CLOUDINARY_API_SECRET': process.env.CLOUDINARY_API_SECRET,
};

let allGood = true;

for (const [key, value] of Object.entries(checks)) {
  const status = value ? '✅ SET' : '❌ NOT SET';
  console.log(`${key}: ${status}`);
  
  if (key.includes('CLOUDINARY') || key.includes('BREVO')) {
    if (!value) {
      allGood = false;
      console.log(`  ⚠️  Required for ${key.includes('CLOUDINARY') ? 'file uploads' : 'emails'}!`);
    }
  }
}

console.log('\n=== Summary ===\n');

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  console.log('✅ Cloudinary: READY');
} else {
  console.log('❌ Cloudinary: NOT CONFIGURED');
  console.log('   Add these to .env:');
  console.log('   CLOUDINARY_CLOUD_NAME=your_cloud_name');
  console.log('   CLOUDINARY_API_KEY=your_api_key');
  console.log('   CLOUDINARY_API_SECRET=your_api_secret');
}

if (process.env.BREVO_SMTP_HOST && process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_PASS) {
  console.log('✅ Brevo Email: READY');
} else {
  console.log('❌ Brevo Email: NOT CONFIGURED');
  console.log('   Add these to .env:');
  console.log('   BREVO_SMTP_PASS=your_password');
}

console.log('\n');

if (allGood) {
  console.log('🎉 All services configured correctly!');
} else {
  console.log('⚠️  Some services need configuration. See above.');
}

console.log('\n');
