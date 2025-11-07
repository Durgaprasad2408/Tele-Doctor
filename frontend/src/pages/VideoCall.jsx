import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Video, VideoOff, Mic, MicOff, Phone, ArrowLeft, User, PhoneOff, FileText, MessageCircle, X } from 'lucide-react'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'
import useWebRTC from '../hooks/useWebRTC'
import PrescriptionNotes from '../components/PrescriptionNotes'
import axios from 'axios'
import toast from 'react-hot-toast'

const VideoCall = () => {
  const { appointmentId } = useParams()
  const navigate = useNavigate()
  const { socket } = useSocket()
  const { user } = useAuth()
  const [appointment, setAppointment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [callStatus, setCallStatus] = useState('idle') // idle, calling, ringing, connected, ended
  const [showPrescription, setShowPrescription] = useState(false)
  const [showChatPanel, setShowChatPanel] = useState(false)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')

  const {
    localStream,
    remoteStream,
    isCallActive,
    isConnecting,
    callInitiated,
    localVideoRef,
    remoteVideoRef,
    startCall,
    answerCall,
    handleAnswer,
    handleIceCandidate,
    toggleVideo,
    toggleAudio,
    endCall,
    initializeMedia
  } = useWebRTC(socket, appointmentId)

  useEffect(() => {
    fetchAppointment()
    fetchMessages()
    initializeMedia()
  }, [appointmentId])

  useEffect(() => {
    if (socket && appointmentId) {
      socket.emit('join-appointment', appointmentId)

      // WebRTC signaling events
      socket.on('video-call-offer', handleReceiveOffer)
      socket.on('video-call-answer', handleReceiveAnswer)
      socket.on('ice-candidate', handleReceiveIceCandidate)
      
      // Call management events
      socket.on('call-accepted', handleCallAccepted)
      socket.on('call-declined', handleCallDeclined)
      socket.on('call-ended', handleCallEnded)
      socket.on('user-busy', handleUserBusy)
      socket.on('user-offline', handleUserOffline)

      // Chat events
      socket.on('new-message', (message) => {
        setMessages(prev => [...prev, message])
      })

      return () => {
        socket.off('video-call-offer')
        socket.off('video-call-answer')
        socket.off('ice-candidate')
        socket.off('call-accepted')
        socket.off('call-declined')
        socket.off('call-ended')
        socket.off('user-busy')
        socket.off('user-offline')
        socket.off('new-message')
      }
    }
  }, [socket, appointmentId])

  const fetchAppointment = async () => {
    try {
      const response = await axios.get('/api/appointments')
      const appointment = response.data.appointments.find(apt => apt._id === appointmentId)
      setAppointment(appointment)
    } catch (error) {
      console.error('Failed to fetch appointment:', error)
      toast.error('Failed to load appointment details')
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`/api/chat/appointment/${appointmentId}`)
      setMessages(response.data)
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  const sendMessage = (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !socket) return

    socket.emit('send-message', {
      appointmentId,
      content: newMessage,
      messageType: 'text'
    })

    setNewMessage('')
  }

  const handleReceiveOffer = async (data) => {
    console.log('Received WebRTC offer')
    setCallStatus('connected')
    await answerCall(data.offer)
  }

  const handleReceiveAnswer = async (data) => {
    console.log('Received WebRTC answer')
    await handleAnswer(data.answer)
    setCallStatus('connected')
  }

  const handleReceiveIceCandidate = async (data) => {
    await handleIceCandidate(data.candidate)
  }

  const handleCallAccepted = (data) => {
    console.log('Call accepted, transitioning to connected state')
    setCallStatus('connected')
    toast.success('Call accepted! Connecting...')
  }

  const handleCallDeclined = () => {
    setCallStatus('ended')
    toast.error('Call declined')
    setTimeout(() => navigate('/appointments'), 2000)
  }

  const handleCallEnded = () => {
    setCallStatus('ended')
    endCall()
    toast.info('Call ended')
    setTimeout(() => navigate('/appointments'), 2000)
  }

  const handleUserBusy = () => {
    setCallStatus('ended')
    toast.error('User is busy')
    setTimeout(() => navigate('/appointments'), 2000)
  }

  const handleUserOffline = () => {
    setCallStatus('ended')
    toast.error('User is offline')
    setTimeout(() => navigate('/appointments'), 2000)
  }

  const initiateCall = async () => {
    if (!appointment) return

    const otherUser = user?.role === 'doctor' ? appointment.patient : appointment.doctor
    const callerName = `${user.firstName} ${user.lastName}`
    
    setCallStatus('calling')
    
    socket.emit('initiate-video-call', {
      appointmentId,
      to: otherUser._id,
      callerName,
      callerRole: user.role
    })

    toast.info('Calling... Please wait for the other person to accept.')
  }

  const handleToggleVideo = () => {
    const enabled = toggleVideo()
    setIsVideoEnabled(enabled)
  }

  const handleToggleAudio = () => {
    const enabled = toggleAudio()
    setIsAudioEnabled(enabled)
  }

  const handleEndCall = () => {
    setCallStatus('ended')
    endCall()
    navigate('/appointments')
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-8 w-8 sm:h-12 sm:w-12"></div>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="text-center py-12">
        <h2 className="text-responsive-xl font-semibold text-gray-800">Appointment not found</h2>
        <Link to="/appointments" className="text-primary-600 hover:text-primary-700 mt-2 inline-block">
          Back to Appointments
        </Link>
      </div>
    )
  }

  const otherUser = user?.role === 'doctor' ? appointment.patient : appointment.doctor
  const otherUserName = user?.role === 'doctor' 
    ? `${otherUser.firstName} ${otherUser.lastName}`
    : `Dr. ${otherUser.firstName} ${otherUser.lastName}`

  const getStatusMessage = () => {
    if (isCallActive) return 'Connected'
    if (isConnecting || callInitiated) return 'Connecting...'
    
    switch (callStatus) {
      case 'calling': return 'Calling...'
      case 'ringing': return 'Incoming call...'
      case 'connected': return 'Setting up connection...'
      case 'ended': return 'Call ended'
      default: return 'Ready to call'
    }
  }

  const getStatusColor = () => {
    if (isCallActive) return 'bg-green-100 text-green-600'
    if (isConnecting || callInitiated) return 'bg-blue-100 text-blue-600'
    
    switch (callStatus) {
      case 'calling': return 'bg-yellow-100 text-yellow-600'
      case 'ringing': return 'bg-blue-100 text-blue-600'
      case 'connected': return 'bg-blue-100 text-blue-600'
      case 'ended': return 'bg-red-100 text-red-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <div className="video-call-container">
      {/* Header */}
      <div className="card mb-2 lg:mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link
              to="/appointments"
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors touch-target"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h2 className="text-responsive-base font-semibold text-gray-800">Video Consultation</h2>
              <p className="text-responsive-xs text-gray-600">with {otherUserName}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
              {getStatusMessage()}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="video-call-main">
        {/* Video Container */}
        <div className="video-call-video">
          <div className="card p-0 overflow-hidden h-full">
            <div className="relative h-full bg-gray-900 rounded-lg overflow-hidden min-h-[300px] sm:min-h-[400px] lg:min-h-[500px]">
              {/* Remote Video */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              
              {/* Remote Video Placeholder */}
              {!remoteStream && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="text-center">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="text-gray-400" size={32} />
                    </div>
                    <p className="text-white text-responsive-base font-medium">{otherUserName}</p>
                    <p className="text-gray-400 text-responsive-sm">{getStatusMessage()}</p>
                    
                    {(isConnecting || callInitiated) && (
                      <div className="mt-4">
                        <div className="spinner h-6 w-6 sm:h-8 sm:w-8 mx-auto border-white"></div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Local Video */}
              <div className="absolute top-2 right-2 sm:top-4 sm:right-4 w-24 h-18 sm:w-48 sm:h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!isVideoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <VideoOff className="text-white" size={16} />
                  </div>
                )}
              </div>

              {/* Call Status Overlay */}
              {(callStatus === 'calling' && !callInitiated) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center"
                >
                  <div className="text-center text-white px-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-responsive-lg font-medium">Calling {otherUserName}...</p>
                    <p className="text-gray-300 mt-2 text-responsive-sm">Waiting for them to accept</p>
                  </div>
                </motion.div>
              )}

              {/* Controls */}
              <div className="absolute bottom-2 sm:bottom-6 left-1/2 transform -translate-x-1/2">
                <div className="flex items-center space-x-2 sm:space-x-4 bg-black bg-opacity-50 rounded-full px-3 py-2 sm:px-6 sm:py-3">
                  <button
                    onClick={handleToggleAudio}
                    disabled={!localStream}
                    className={`p-2 sm:p-3 rounded-full transition-colors disabled:opacity-50 touch-target ${
                      isAudioEnabled 
                        ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {isAudioEnabled ? <Mic size={16} /> : <MicOff size={16} />}
                  </button>
                  
                  <button
                    onClick={handleToggleVideo}
                    disabled={!localStream}
                    className={`p-2 sm:p-3 rounded-full transition-colors disabled:opacity-50 touch-target ${
                      isVideoEnabled 
                        ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {isVideoEnabled ? <Video size={16} /> : <VideoOff size={16} />}
                  </button>

                  {/* Chat Toggle */}
                  <button
                    onClick={() => setShowChatPanel(!showChatPanel)}
                    className={`p-2 sm:p-3 rounded-full transition-colors touch-target ${
                      showChatPanel
                        ? 'bg-primary-600 hover:bg-primary-700 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                  >
                    <MessageCircle size={16} />
                  </button>

                  {/* Prescription Button (Doctor Only) */}
                  {user?.role === 'doctor' && (
                    <button
                      onClick={() => setShowPrescription(true)}
                      className="p-2 sm:p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors touch-target"
                      title="Add Prescription"
                    >
                      <FileText size={16} />
                    </button>
                  )}

                  {callStatus === 'idle' && (
                    <button
                      onClick={initiateCall}
                      disabled={!localStream}
                      className="p-2 sm:p-3 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors disabled:opacity-50 touch-target"
                    >
                      <Phone size={16} />
                    </button>
                  )}

                  {(callStatus !== 'idle' && callStatus !== 'ended') && (
                    <button
                      onClick={handleEndCall}
                      className="p-2 sm:p-3 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors touch-target"
                    >
                      <PhoneOff size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Panel - Mobile Modal */}
        <AnimatePresence>
          {showChatPanel && (
            <>
              {/* Mobile Chat Modal */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden"
                onClick={() => setShowChatPanel(false)}
              />
              
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="fixed inset-x-0 bottom-0 bg-white rounded-t-xl z-50 h-2/3 lg:hidden"
              >
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="font-medium text-gray-800">Chat</h3>
                    <button
                      onClick={() => setShowChatPanel(false)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg touch-target"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((message) => (
                      <div
                        key={message._id}
                        className={`flex ${message.sender._id === user._id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                          message.sender._id === user._id
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-200 text-gray-800'
                        }`}>
                          <p>{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender._id === user._id ? 'text-primary-100' : 'text-gray-500'
                          }`}>
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-4 border-t border-gray-200 safe-area-bottom">
                    <form onSubmit={sendMessage} className="flex space-x-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm touch-target"
                      >
                        Send
                      </button>
                    </form>
                  </div>
                </div>
              </motion.div>

              {/* Desktop Chat Panel */}
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="video-call-sidebar hidden lg:flex card overflow-hidden flex-col"
              >
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-medium text-gray-800">Chat</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message._id}
                      className={`flex ${message.sender._id === user._id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                        message.sender._id === user._id
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-200 text-gray-800'
                      }`}>
                        <p>{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.sender._id === user._id ? 'text-primary-100' : 'text-gray-500'
                        }`}>
                          {formatTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="p-4 border-t border-gray-200">
                  <form onSubmit={sendMessage} className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Call Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2 lg:mt-4 card"
      >
        <div className="text-center">
          <p className="text-responsive-xs text-gray-600">
            This is a secure, encrypted video consultation. Your privacy is protected.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-2 text-xs text-gray-500">
            <span>🔒 End-to-end encrypted</span>
            <span className="hidden sm:inline">•</span>
            <span>📱 Works on all devices</span>
            <span className="hidden sm:inline">•</span>
            <span>🎥 HD video quality</span>
          </div>
        </div>
      </motion.div>

      {/* Prescription Modal */}
      <AnimatePresence>
        {showPrescription && (
          <PrescriptionNotes
            appointmentId={appointmentId}
            onClose={() => setShowPrescription(false)}
            existingPrescription={appointment?.prescription}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default VideoCall