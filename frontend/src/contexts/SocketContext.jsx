import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

const SocketContext = createContext()

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token')
      if (token) {
        // Use environment variable for Socket.io connection
        const socketUrl = import.meta.env.VITE_API_URL || (
          import.meta.env.DEV ? 'http://localhost:5000' : 'https://medicine.com'
        )
        
        const newSocket = io(socketUrl, {
          auth: { token },
          transports: ['websocket', 'polling'],
          timeout: 20000,
          forceNew: true
        })

        newSocket.on('connect', () => {
          console.log('Connected to server')
          setConnected(true)
        })

        newSocket.on('disconnect', (reason) => {
          console.log('Disconnected from server:', reason)
          setConnected(false)
        })

        newSocket.on('connect_error', (error) => {
          console.error('Connection error:', error)
          setConnected(false)
        })

        newSocket.on('reconnect', (attemptNumber) => {
          console.log('Reconnected to server after', attemptNumber, 'attempts')
          setConnected(true)
        })

        newSocket.on('reconnect_error', (error) => {
          console.error('Reconnection error:', error)
        })

        // Listen for real-time notifications
        newSocket.on('new-notification', (notification) => {
          console.log('Received notification:', notification)
          
          // Show toast notification
          toast.success(notification.title, {
            duration: 4000,
            position: 'top-right'
          })
          
          // Trigger custom event to update notification count in header
          window.dispatchEvent(new CustomEvent('newNotification', { 
            detail: notification 
          }))
        })

        setSocket(newSocket)

        return () => {
          newSocket.close()
        }
      }
    } else {
      if (socket) {
        socket.close()
        setSocket(null)
        setConnected(false)
      }
    }
  }, [user])

  const value = {
    socket,
    connected
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}