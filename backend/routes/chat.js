import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';

const router = express.Router();

// Configure Cloudinary on first use
let cloudinaryConfigured = false;
let configAttempted = false;

const ensureCloudinaryConfigured = () => {
  if (configAttempted) {
    return cloudinaryConfigured;
  }

  configAttempted = true;

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ Cloudinary credentials missing!');
    console.error('   CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✓ SET' : '✗ NOT SET');
    console.error('   CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✓ SET' : '✗ NOT SET');
    console.error('   CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✓ SET' : '✗ NOT SET');
    console.error('   Please add these to your .env file');
    cloudinaryConfigured = false;
    return false;
  }

  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });

    console.log('✅ Cloudinary configured successfully for chat uploads');
    console.log('   Cloud name:', process.env.CLOUDINARY_CLOUD_NAME);
    cloudinaryConfigured = true;
    return true;
  } catch (error) {
    console.error('❌ Failed to configure Cloudinary:', error.message);
    cloudinaryConfigured = false;
    return false;
  }
};

// Configure multer for file uploads (memory storage for Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, documents
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|mp4|mov|avi/;
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, and documents are allowed.'));
    }
  }
});

// Get all conversations for current user
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
    .populate('participants', 'firstName lastName role avatar specialization')
    .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get or create conversation with a specific user
router.get('/conversation/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify the other user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const conversation = await Conversation.findOrCreate(req.user._id, userId);
    
    res.json(conversation);
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages for a conversation
router.get('/conversation/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    // Verify user is part of the conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'firstName lastName role avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Message.countDocuments({ conversation: conversationId });

    res.json({
      messages: messages.reverse(), // Reverse to show oldest first
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload file for chat
router.post('/upload-file', upload.single('file'), async (req, res) => {
  try {
    // Check Cloudinary configuration
    if (!ensureCloudinaryConfigured()) {
      console.error('🚫 File upload attempt blocked - Cloudinary not configured');
      return res.status(503).json({ 
        message: 'File upload service not configured. Please add Cloudinary credentials to .env file.',
        details: 'Contact administrator to configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET'
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('📤 Uploading chat file:', req.file.originalname);

    // Determine resource type based on mimetype
    let resourceType = 'auto';
    if (req.file.mimetype.startsWith('video/')) {
      resourceType = 'video';
    } else if (req.file.mimetype.startsWith('image/')) {
      resourceType = 'image';
    } else {
      resourceType = 'raw'; // For documents
    }

    // Upload to Cloudinary
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'telemed/chat',
          resource_type: resourceType,
          public_id: `${Date.now()}-${req.file.originalname.replace(/\s+/g, '-')}`,
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary upload error:', error);
            reject(error);
          } else {
            console.log('✅ File uploaded to Cloudinary:', result.secure_url);
            resolve(result);
          }
        }
      );

      uploadStream.end(req.file.buffer);
    });

    const result = await uploadPromise;

    res.json({
      success: true,
      fileUrl: result.secure_url,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      resourceType: result.resource_type
    });

  } catch (error) {
    console.error('❌ File upload error:', error);
    res.status(500).json({ 
      message: 'Failed to upload file',
      error: error.message 
    });
  }
});

// Mark messages as read in a conversation
router.put('/conversation/:conversationId/read', async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // Update messages
    await Message.updateMany(
      {
        conversation: conversationId,
        recipient: req.user._id,
        isRead: false
      },
      { isRead: true }
    );

    // Update conversation unread count
    await Conversation.findByIdAndUpdate(conversationId, {
      [`unreadCount.${req.user._id}`]: 0
    });

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unread message count
router.get('/unread-count', async (req, res) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.user._id,
      isRead: false
    });

    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check Cloudinary configuration status
router.get('/upload-status', (req, res) => {
  const status = {
    configured: ensureCloudinaryConfigured(),
    credentials: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'NOT SET',
      apiKey: process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT SET',
      apiSecret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET'
    }
  };

  if (status.configured) {
    status.message = 'File uploads are enabled';
  } else {
    status.message = 'File uploads are disabled - Cloudinary not configured';
    status.help = 'Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to .env file';
  }

  res.json(status);
});

export default router;
