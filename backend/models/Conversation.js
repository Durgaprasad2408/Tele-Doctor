import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    content: String,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: Date,
    messageType: {
      type: String,
      enum: ['text', 'file', 'image'],
      default: 'text'
    }
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  }
}, {
  timestamps: true
});

// Index for efficient querying
conversationSchema.index({ participants: 1 });

// Method to get conversation between two users
conversationSchema.statics.findOrCreate = async function(user1Id, user2Id) {
  let conversation = await this.findOne({
    participants: { $all: [user1Id, user2Id], $size: 2 }
  }).populate('participants', 'firstName lastName role avatar specialization');

  if (!conversation) {
    conversation = await this.create({
      participants: [user1Id, user2Id],
      unreadCount: {
        [user1Id]: 0,
        [user2Id]: 0
      }
    });
    await conversation.populate('participants', 'firstName lastName role avatar specialization');
  }

  return conversation;
};

export default mongoose.model('Conversation', conversationSchema);
