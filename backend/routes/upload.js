import fs from 'fs';
import path from 'path';
import multer from 'multer';
import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { fileURLToPath } from 'url';
import { authenticateToken } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure Cloudinary with better error handling
const configureCloudinary = () => {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.warn('Cloudinary credentials not found in environment variables');
      return false;
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    console.log('Cloudinary configured successfully');
    return true;
  } catch (error) {
    console.error('Failed to configure Cloudinary:', error);
    return false;
  }
};

const isCloudinaryConfigured = configureCloudinary();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, PDFs, and documents
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported'), false);
    }
  }
});

// Fallback upload function (saves to local uploads folder if Cloudinary fails)
const uploadToLocal = (file, folder) => {
  return new Promise((resolve, reject) => {
    try {
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads', folder);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Generate unique filename
      const filename = `${Date.now()}_${file.originalname}`;
      const filepath = path.join(uploadsDir, filename);

      // Write file
      fs.writeFileSync(filepath, file.buffer);

      // Return local URL
      const fileUrl = `/uploads/${folder}/${filename}`;
      resolve({ secure_url: fileUrl });
    } catch (error) {
      reject(error);
    }
  });
};

// Upload chat file
router.post('/chat-file', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    console.log('File upload request received:', {
      filename: req.file?.originalname,
      size: req.file?.size,
      mimetype: req.file?.mimetype
    });

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { appointmentId } = req.body;
    
    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required' });
    }

    let uploadResult;

    try {
      if (isCloudinaryConfigured) {
        console.log('Uploading to Cloudinary...');
        // Upload to Cloudinary
        uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: 'auto',
              folder: `telemedicine/chat/${appointmentId}`,
              public_id: `${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9]/g, '_')}`,
              use_filename: true,
              unique_filename: false
            },
            (error, result) => {
              if (error) {
                console.error('Cloudinary upload error:', error);
                reject(error);
              } else {
                console.log('Cloudinary upload successful:', result.secure_url);
                resolve(result);
              }
            }
          );
          
          uploadStream.end(req.file.buffer);
        });
      } else {
        console.log('Cloudinary not configured, using local storage...');
        // Fallback to local storage
        uploadResult = await uploadToLocal(req.file, `chat/${appointmentId}`);
      }

      res.json({
        fileUrl: uploadResult.secure_url,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype
      });

    } catch (uploadError) {
      console.error('Upload error:', uploadError);
      
      // Try local storage as fallback
      if (isCloudinaryConfigured) {
        console.log('Cloudinary failed, trying local storage...');
        try {
          uploadResult = await uploadToLocal(req.file, `chat/${appointmentId}`);
          res.json({
            fileUrl: uploadResult.secure_url,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            fileType: req.file.mimetype
          });
        } catch (localError) {
          console.error('Local storage also failed:', localError);
          throw new Error('Both Cloudinary and local storage failed');
        }
      } else {
        throw uploadError;
      }
    }

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ 
      message: 'Failed to upload file',
      error: error.message,
      details: 'Please check server configuration and try again'
    });
  }
});

// Upload prescription file
router.post('/prescription-file', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { appointmentId } = req.body;
    
    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required' });
    }

    let uploadResult;

    try {
      if (isCloudinaryConfigured) {
        // Upload to Cloudinary
        uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: 'auto',
              folder: `telemedicine/prescriptions/${appointmentId}`,
              public_id: `${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9]/g, '_')}`,
              use_filename: true,
              unique_filename: false
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          
          uploadStream.end(req.file.buffer);
        });
      } else {
        // Fallback to local storage
        uploadResult = await uploadToLocal(req.file, `prescriptions/${appointmentId}`);
      }

      res.json({
        fileUrl: uploadResult.secure_url,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype
      });

    } catch (uploadError) {
      // Try local storage as fallback
      if (isCloudinaryConfigured) {
        uploadResult = await uploadToLocal(req.file, `prescriptions/${appointmentId}`);
        res.json({
          fileUrl: uploadResult.secure_url,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          fileType: req.file.mimetype
        });
      } else {
        throw uploadError;
      }
    }

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ 
      message: 'Failed to upload file',
      error: error.message 
    });
  }
});

export default router;