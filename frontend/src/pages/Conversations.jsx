import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MessageCircle, User, Search } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import axios from 'axios'
import toast from 'react-hot-toast'

const Conversations = () => {
  const { user } = useAuth()
  const { socket } = useSocket()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    if (socket) {
      socket.on('new-message', (message) => {
        // Update conversation list when new message arrives
        fetchConversations()
      })

      return () => {
        socket.off('new-message')
      }
    }
  }, [socket])

  const fetchConversations = async () => {
    try {
      const response = await axios.get('/api/chat/conversations')
      setConversations(response.data)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
      toast.error('Failed to load conversations')
      setLoading(false)
    }
  }

  const getOtherParticipant = (conversation) => {
    return conversation.participants.find(p => p._id !== user._id)
  }

  const getUnreadCount = (conversation) => {
    return conversation.unreadCount?.[user._id] || 0
  }

  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return ''
    
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    // Less than 1 minute
    if (diff < 60000) return 'Just now'
    
    // Less than 1 hour
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000)
      return `${mins}m ago`
    }
    
    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000)
      return `${hours}h ago`
    }
    
    // Less than 7 days
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000)
      return `${days}d ago`
    }
    
    // Show date
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const filteredConversations = conversations.filter(conv => {
    if (!searchTerm) return true
    const other = getOtherParticipant(conv)
    const name = `${other.firstName} ${other.lastName}`.toLowerCase()
    return name.includes(searchTerm.toLowerCase())
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Messages</h1>
        <p className="text-gray-600">Your conversations with {user?.role === 'doctor' ? 'patients' : 'doctors'}</p>
      </div>

      {/* Search Bar */}
      <div className="card mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="card">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="text-gray-400" size={32} />
            </div>
            <p className="text-gray-600 font-medium">No conversations yet</p>
            <p className="text-sm text-gray-500 mt-1">
              {searchTerm ? 'No conversations match your search' : 'Your messages will appear here'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredConversations.map((conversation) => {
              const otherUser = getOtherParticipant(conversation)
              const unreadCount = getUnreadCount(conversation)
              const lastMessage = conversation.lastMessage

              return (
                <Link
                  key={conversation._id}
                  to={`/chat/${otherUser._id}`}
                  className="block hover:bg-gray-50 transition-colors"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4"
                  >
                    <div className="flex items-center space-x-4">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                          {otherUser.avatar ? (
                            <img
                              src={otherUser.avatar}
                              alt={`${otherUser.firstName} ${otherUser.lastName}`}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <User className="text-primary-600" size={24} />
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-xs text-white font-medium">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`text-sm font-medium truncate ${
                            unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {otherUser.role === 'doctor' 
                              ? `Dr. ${otherUser.firstName} ${otherUser.lastName}`
                              : `${otherUser.firstName} ${otherUser.lastName}`
                            }
                          </h3>
                          {lastMessage?.timestamp && (
                            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                              {formatLastMessageTime(lastMessage.timestamp)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <p className={`text-sm truncate ${
                            unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
                          }`}>
                            {lastMessage ? (
                              <>
                                {lastMessage.sender === user._id && (
                                  <span className="text-gray-400 mr-1">You:</span>
                                )}
                                {lastMessage.content}
                              </>
                            ) : (
                              <span className="text-gray-400 italic">No messages yet</span>
                            )}
                          </p>
                        </div>

                        <p className="text-xs text-gray-500 mt-1">
                          {otherUser.role === 'doctor' && otherUser.specialization}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Conversations
