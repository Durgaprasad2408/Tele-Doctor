import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import Appointment from '../models/Appointment.js';
import { createNotification, getNotificationTemplate } from '../services/notificationService.js';

export const setupSocketHandlers = (io) => {
  const activeUsers = new Map();
  const activeCalls = new Map();

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.firstName} connected`);
    
    // Store active user
    activeUsers.set(socket.userId, {
      socketId: socket.id,
      user: socket.user,
      status: 'online'
    });

    // Broadcast user online status
    socket.broadcast.emit('user-online', {
      userId: socket.userId,
      user: socket.user
    });

    // Join user's personal room for direct notifications
    socket.join(`user-${socket.userId}`);

    // Join conversation rooms
    socket.on('join-conversation', async (conversationId) => {
      try {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.userId
        });

        if (conversation) {
          socket.join(`conversation-${conversationId}`);
          console.log(`User ${socket.user.firstName} joined conversation ${conversationId}`);
        }
      } catch (error) {
        console.error('Error joining conversation:', error);
      }
    });

    // Handle sending messages (NEW SYSTEM)
    socket.on('send-message', async (data) => {
      try {
        const { recipientId, content, messageType = 'text', fileUrl = '', fileName = '', fileSize = 0 } = data;

        console.log(`📨 Message from ${socket.userId} to ${recipientId}`);

        // Get or create conversation
        const conversation = await Conversation.findOrCreate(socket.userId, recipientId);

        // Create message
        const message = new Message({
          conversation: conversation._id,
          sender: socket.userId,
          recipient: recipientId,
          content,
          messageType,
          fileUrl,
          fileName,
          fileSize
        });

        await message.save();
        await message.populate('sender', 'firstName lastName role avatar');

        // Update conversation last message
        conversation.lastMessage = {
          content: messageType === 'text' ? content : `Sent a ${messageType}`,
          sender: socket.userId,
          timestamp: new Date(),
          messageType
        };

        // Increment unread count for recipient
        const currentUnread = conversation.unreadCount.get(recipientId.toString()) || 0;
        conversation.unreadCount.set(recipientId.toString(), currentUnread + 1);

        await conversation.save();

        // Send message to conversation room
        io.to(`conversation-${conversation._id}`).emit('new-message', message);

        // Send to recipient's personal room
        io.to(`user-${recipientId}`).emit('new-message', message);

        // Create notification for recipient
        const template = getNotificationTemplate('new_message', {
          senderName: `${socket.user.firstName} ${socket.user.lastName}`
        });

        await createNotification({
          recipient: recipientId,
          sender: socket.userId,
          type: 'new_message',
          title: template.title,
          message: template.message,
          data: { 
            conversationId: conversation._id,
            messageId: message._id 
          },
          sendEmail: false
        });

        // Send real-time notification
        const recipientSocket = activeUsers.get(recipientId.toString());
        if (recipientSocket) {
          io.to(recipientSocket.socketId).emit('new-notification', {
            type: 'new_message',
            title: template.title,
            message: template.message,
            conversationId: conversation._id,
            sender: `${socket.user.firstName} ${socket.user.lastName}`,
            content: messageType === 'text' ? content : `Sent a ${messageType}`
          });
        }

        console.log(`✅ Message sent successfully`);

      } catch (error) {
        console.error('❌ Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Join appointment rooms (for video calls)
    socket.on('join-appointment', async (appointmentId) => {
      try {
        const appointment = await Appointment.findOne({
          _id: appointmentId,
          $or: [
            { patient: socket.userId },
            { doctor: socket.userId }
          ]
        });

        if (appointment) {
          socket.join(`appointment-${appointmentId}`);
          console.log(`User ${socket.user.firstName} joined appointment ${appointmentId}`);
        }
      } catch (error) {
        console.error('Error joining appointment:', error);
      }
    });

    // Video call initiation
    socket.on('initiate-video-call', async (data) => {
      try {
        const { appointmentId, to, callerName, callerRole } = data;

        console.log(`📞 Video call initiated from ${socket.userId} to ${to} for appointment ${appointmentId}`);

        const recipientSocket = activeUsers.get(to);
        if (!recipientSocket) {
          return socket.emit('user-offline', { message: 'User is not online' });
        }

        if (activeCalls.has(socket.userId) || activeCalls.has(to)) {
          return socket.emit('user-busy', { message: 'User is busy' });
        }

        const callData = {
          appointmentId,
          caller: socket.userId,
          recipient: to,
          status: 'calling',
          callerSocket: socket.id,
          recipientSocket: recipientSocket.socketId
        };

        activeCalls.set(socket.userId, callData);
        activeCalls.set(to, callData);

        io.to(recipientSocket.socketId).emit('incoming-video-call', {
          appointmentId,
          from: socket.userId,
          callerName,
          callerRole
        });

        const template = getNotificationTemplate('video_call_request', { callerName });

        await createNotification({
          recipient: to,
          sender: socket.userId,
          type: 'video_call_request',
          title: template.title,
          message: template.message,
          data: { appointmentId },
          sendEmail: false
        });

        console.log(`✅ Call notification sent to ${to}`);

      } catch (error) {
        console.error('❌ Error initiating video call:', error);
        socket.emit('error', { message: 'Failed to initiate call' });
      }
    });

    // Accept call
    socket.on('accept-call', async (data) => {
      try {
        const { appointmentId, callerId } = data;
        
        console.log(`✅ Call accepted by ${socket.userId} from ${callerId}`);
        
        const callData = activeCalls.get(callerId);
        if (callData) {
          callData.status = 'accepted';
          activeCalls.set(callerId, callData);
          activeCalls.set(socket.userId, callData);
        }

        const callerSocket = activeUsers.get(callerId);
        if (callerSocket) {
          io.to(callerSocket.socketId).emit('call-accepted', { 
            appointmentId,
            recipientId: socket.userId 
          });
          io.to(callerSocket.socketId).emit('start-webrtc-call', { appointmentId });
        }

      } catch (error) {
        console.error('❌ Error accepting call:', error);
        socket.emit('error', { message: 'Failed to accept call' });
      }
    });

    // Decline call
    socket.on('decline-call', (data) => {
      const { appointmentId, callerId } = data;
      
      console.log(`❌ Call declined by ${socket.userId} from ${callerId}`);
      
      activeCalls.delete(callerId);
      activeCalls.delete(socket.userId);

      const callerSocket = activeUsers.get(callerId);
      if (callerSocket) {
        io.to(callerSocket.socketId).emit('call-declined', { appointmentId });
      }
    });

    // End call
    socket.on('end-call', (data) => {
      const { appointmentId } = data;
      
      console.log(`📴 Call ended by ${socket.userId}`);
      
      const userCall = activeCalls.get(socket.userId);
      if (userCall) {
        const otherUserId = userCall.caller === socket.userId ? userCall.recipient : userCall.caller;
        
        activeCalls.delete(socket.userId);
        activeCalls.delete(otherUserId);

        const otherUserSocket = activeUsers.get(otherUserId);
        if (otherUserSocket) {
          io.to(otherUserSocket.socketId).emit('call-ended', { appointmentId });
        }

        socket.to(`appointment-${appointmentId}`).emit('call-ended', { appointmentId });
      }
    });

    // WebRTC signaling
    socket.on('video-call-offer', (data) => {
      const { appointmentId, offer } = data;
      console.log(`📡 WebRTC offer sent by ${socket.userId}`);
      
      socket.to(`appointment-${appointmentId}`).emit('video-call-offer', {
        offer,
        from: socket.userId
      });
    });

    socket.on('video-call-answer', (data) => {
      const { appointmentId, answer } = data;
      console.log(`📡 WebRTC answer sent by ${socket.userId}`);
      
      socket.to(`appointment-${appointmentId}`).emit('video-call-answer', {
        answer,
        from: socket.userId
      });
    });

    socket.on('ice-candidate', (data) => {
      const { appointmentId, candidate } = data;
      
      socket.to(`appointment-${appointmentId}`).emit('ice-candidate', {
        candidate,
        from: socket.userId
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${socket.user.firstName} disconnected`);
      
      activeUsers.delete(socket.userId);
      
      const userCall = activeCalls.get(socket.userId);
      if (userCall) {
        const otherUserId = userCall.caller === socket.userId ? userCall.recipient : userCall.caller;
        
        activeCalls.delete(socket.userId);
        activeCalls.delete(otherUserId);

        const otherUserSocket = activeUsers.get(otherUserId);
        if (otherUserSocket) {
          io.to(otherUserSocket.socketId).emit('call-ended', { 
            appointmentId: userCall.appointmentId,
            reason: 'User disconnected'
          });
        }
      }

      socket.broadcast.emit('user-offline', {
        userId: socket.userId,
        user: socket.user
      });
    });
  });
};
