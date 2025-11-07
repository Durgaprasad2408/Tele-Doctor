import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, PhoneOff, User } from 'lucide-react'
import { useSocket } from '../contexts/SocketContext'
import { useNavigate } from 'react-router-dom'

const CallNotification = () => {
  const { socket } = useSocket()
  const navigate = useNavigate()
  const [incomingCall, setIncomingCall] = useState(null)
  const [callSound, setCallSound] = useState(null)

  useEffect(() => {
    // Create call sound
    const audio = new Audio('/call-sound.mp3')
    audio.loop = true
    setCallSound(audio)

    if (socket) {
      socket.on('incoming-video-call', handleIncomingCall)
      socket.on('call-cancelled', handleCallCancelled)
      socket.on('call-declined', handleCallDeclined)

      return () => {
        socket.off('incoming-video-call')
        socket.off('call-cancelled')
        socket.off('call-declined')
      }
    }
  }, [socket])

  const handleIncomingCall = (data) => {
    console.log('Incoming call notification:', data)
    setIncomingCall(data)
    // Play call sound
    if (callSound) {
      callSound.play().catch(console.error)
    }
  }

  const handleCallCancelled = () => {
    setIncomingCall(null)
    if (callSound) {
      callSound.pause()
      callSound.currentTime = 0
    }
  }

  const handleCallDeclined = () => {
    setIncomingCall(null)
    if (callSound) {
      callSound.pause()
      callSound.currentTime = 0
    }
  }

  const acceptCall = () => {
    if (socket && incomingCall) {
      console.log('Accepting call:', incomingCall)
      
      // Accept the call via socket
      socket.emit('accept-call', {
        appointmentId: incomingCall.appointmentId,
        callerId: incomingCall.from
      })
      
      // Stop call sound
      if (callSound) {
        callSound.pause()
        callSound.currentTime = 0
      }
      
      // Clear notification
      setIncomingCall(null)
      
      // Navigate to video call page
      navigate(`/video-call/${incomingCall.appointmentId}`)
    }
  }

  const declineCall = () => {
    if (socket && incomingCall) {
      console.log('Declining call:', incomingCall)
      
      socket.emit('decline-call', {
        appointmentId: incomingCall.appointmentId,
        callerId: incomingCall.from
      })
      
      setIncomingCall(null)
      if (callSound) {
        callSound.pause()
        callSound.currentTime = 0
      }
    }
  }

  return (
    <AnimatePresence>
      {incomingCall && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl"
          >
            <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="text-primary-600" size={32} />
            </div>
            
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Incoming Video Call
            </h2>
            
            <p className="text-gray-600 mb-6">
              {incomingCall.callerName} is calling you for a video consultation
            </p>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={declineCall}
                className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
              >
                <PhoneOff size={24} />
              </button>
              
              <button
                onClick={acceptCall}
                className="p-4 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors"
              >
                <Phone size={24} />
              </button>
            </div>
            
            <p className="text-xs text-gray-500 mt-4">
              This call will be encrypted and secure
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default CallNotification