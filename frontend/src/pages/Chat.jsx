import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Send, Paperclip, Video, ArrowLeft, User, Upload, X, FileText, Image as ImageIcon, Film, Download } from 'lucide-react'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'

const Chat = () => {
  const { userId } = useParams() // Changed from appointmentId to userId
  const navigate = useNavigate()
  const { socket } = useSocket()
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [conversation, setConversation] = useState(null)
  const [otherUser, setOtherUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (userId) {
      fetchConversation()
    }
  }, [userId])

  useEffect(() => {
    if (socket && conversation) {
      socket.emit('join-conversation', conversation._id)

      socket.on('new-message', (message) => {
        console.log('📨 New message received:', message)
        setMessages(prev => [...prev, message])
        scrollToBottom()
      })

      return () => {
        socket.off('new-message')
      }
    }
  }, [socket, conversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchConversation = async () => {
    try {
      setLoading(true)
      
      // Get or create conversation with the other user
      const convResponse = await axios.get(`/api/chat/conversation/${userId}`)
      const conv = convResponse.data
      setConversation(conv)
      
      // Find the other participant
      const other = conv.participants.find(p => p._id !== user._id)
      setOtherUser(other)

      // Fetch messages for this conversation
      const messagesResponse = await axios.get(`/api/chat/conversation/${conv._id}/messages`)
      setMessages(messagesResponse.data.messages)
      
      // Mark messages as read
      await axios.put(`/api/chat/conversation/${conv._id}/read`)
      
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch conversation:', error)
      toast.error('Failed to load conversation')
      setLoading(false)
    }
  }

  const sendMessage = (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !socket || !otherUser) return

    socket.emit('send-message', {
      recipientId: otherUser._id,
      content: newMessage,
      messageType: 'text'
    })

    setNewMessage('')
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      console.log('📤 Uploading file:', file.name)

      // Upload file to Cloudinary via backend
      const response = await axios.post('/api/chat/upload-file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      const { fileUrl, fileName, fileSize, resourceType } = response.data

      console.log('✅ File uploaded:', fileUrl)

      // Determine message type based on resource type
      let messageType = 'file'
      if (resourceType === 'image') {
        messageType = 'image'
      } else if (resourceType === 'video') {
        messageType = 'video'
      }

      // Send file message via socket
      if (socket && otherUser) {
        socket.emit('send-message', {
          recipientId: otherUser._id,
          content: fileName,
          messageType,
          fileUrl,
          fileName,
          fileSize
        })

        toast.success('File sent successfully')
      }

      setShowFileUpload(false)
    } catch (error) {
      console.error('Failed to upload file:', error)
      toast.error(error.response?.data?.message || 'Failed to upload file')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const renderMessage = (message) => {
    const isOwn = message.sender._id === user._id

    // Image message
    if (message.messageType === 'image') {
      return (
        <div className={`max-w-xs lg:max-w-md ${isOwn ? 'ml-auto' : 'mr-auto'}`}>
          <div className={`rounded-lg overflow-hidden ${
            isOwn ? 'bg-primary-600' : 'bg-gray-200'
          }`}>
            <img
              src={message.fileUrl}
              alt={message.fileName}
              className="w-full h-auto max-h-64 object-cover cursor-pointer"
              onClick={() => window.open(message.fileUrl, '_blank')}
            />
            <div className={`p-2 ${isOwn ? 'text-primary-100' : 'text-gray-500'}`}>
              <p className="text-xs">{message.fileName}</p>
              <div className="flex items-center justify-between">
                <p className="text-xs">{formatTime(message.createdAt)}</p>
                {message.fileSize > 0 && (
                  <p className="text-xs">{formatFileSize(message.fileSize)}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Video message
    if (message.messageType === 'video') {
      return (
        <div className={`max-w-xs lg:max-w-md ${isOwn ? 'ml-auto' : 'mr-auto'}`}>
          <div className={`rounded-lg overflow-hidden ${
            isOwn ? 'bg-primary-600' : 'bg-gray-200'
          }`}>
            <video
              src={message.fileUrl}
              controls
              className="w-full h-auto max-h-64"
            />
            <div className={`p-2 ${isOwn ? 'text-primary-100' : 'text-gray-500'}`}>
              <div className="flex items-center space-x-1">
                <Film size={14} />
                <p className="text-xs">{message.fileName}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs">{formatTime(message.createdAt)}</p>
                {message.fileSize > 0 && (
                  <p className="text-xs">{formatFileSize(message.fileSize)}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }

    // File/Document message
    if (message.messageType === 'file') {
      const handleDownload = async (e) => {
        e.preventDefault()
        try {
          // Fetch the file
          const response = await fetch(message.fileUrl)
          const blob = await response.blob()
          
          // Create download link
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = message.fileName
          document.body.appendChild(link)
          link.click()
          
          // Cleanup
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
        } catch (error) {
          console.error('Download failed:', error)
          // Fallback to direct link
          window.open(message.fileUrl, '_blank')
        }
      }

      return (
        <div className={`max-w-xs lg:max-w-md ${isOwn ? 'ml-auto' : 'mr-auto'}`}>
          <div 
            onClick={handleDownload}
            className={`p-3 rounded-lg cursor-pointer hover:opacity-90 transition-opacity ${
              isOwn ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <FileText size={20} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{message.fileName}</p>
                  {message.fileSize > 0 && (
                    <p className={`text-xs ${isOwn ? 'text-primary-100' : 'text-gray-500'}`}>
                      {formatFileSize(message.fileSize)}
                    </p>
                  )}
                  <p className={`text-xs ${isOwn ? 'text-primary-100' : 'text-primary-600'}`}>
                    Click to download
                  </p>
                </div>
              </div>
              <Download size={18} className={isOwn ? 'text-primary-100' : 'text-gray-600'} />
            </div>
            <p className={`text-xs mt-2 ${
              isOwn ? 'text-primary-100' : 'text-gray-500'
            }`}>
              {formatTime(message.createdAt)}
            </p>
          </div>
        </div>
      )
    }

    // Text message
    return (
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'ml-auto' : 'mr-auto'}`}>
        <div className={`px-4 py-2 rounded-lg ${
          isOwn ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-800'
        }`}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          <p className={`text-xs mt-1 ${
            isOwn ? 'text-primary-100' : 'text-gray-500'
          }`}>
            {formatTime(message.createdAt)}
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!otherUser) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-800">User not found</h2>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 btn-secondary"
        >
          Go Back
        </button>
      </div>
    )
  }

  const otherUserName = otherUser.role === 'doctor' 
    ? `Dr. ${otherUser.firstName} ${otherUser.lastName}`
    : `${otherUser.firstName} ${otherUser.lastName}`

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Chat Header */}
      <div className="card mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              {otherUser.avatar ? (
                <img src={otherUser.avatar} alt={otherUserName} className="w-10 h-10 rounded-full" />
              ) : (
                <User className="text-primary-600" size={20} />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">{otherUserName}</h2>
              <p className="text-sm text-gray-600">
                {otherUser.role === 'doctor' ? otherUser.specialization : 'Patient'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 card overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="text-gray-400" size={24} />
              </div>
              <p className="text-gray-600">No messages yet</p>
              <p className="text-sm text-gray-500 mt-1">Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <motion.div
                key={message._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.sender._id === user._id ? 'justify-end' : 'justify-start'}`}
              >
                {renderMessage(message)}
              </motion.div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* File Upload Modal */}
        {showFileUpload && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-800">Upload File</h3>
                <button
                  onClick={() => setShowFileUpload(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-sm text-gray-600 mb-2">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    Images, Videos, PDFs, Documents (Max 10MB)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="mt-3 btn-primary disabled:opacity-50"
                  >
                    {uploading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </span>
                    ) : 'Choose File'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="border-t border-gray-200 p-4">
          <form onSubmit={sendMessage} className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowFileUpload(true)}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Attach file"
            >
              <Paperclip size={20} />
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 input-field"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Send message"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Chat
