import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bell, Check, CheckCheck, Trash2, Calendar, MessageCircle, Video, FileText, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'

const Notifications = () => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('unread')
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchNotifications()
  }, [filter])

  const fetchNotifications = async () => {
    try {
      const params = {}
      if (filter === 'unread') {
        params.unreadOnly = true
      }
      
      const response = await axios.get('/api/notifications', { params })
      setNotifications(response.data.notifications)
      setUnreadCount(response.data.unreadCount)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`/api/notifications/${notificationId}/read`)
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, isRead: true }
            : notif
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      toast.error('Failed to mark notification as read')
    }
  }

  const markAllAsRead = async () => {
    try {
      await axios.put('/api/notifications/read-all')
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      )
      setUnreadCount(0)
      toast.success('All notifications marked as read')
    } catch (error) {
      toast.error('Failed to mark all notifications as read')
    }
  }

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`/api/notifications/${notificationId}`)
      setNotifications(prev => 
        prev.filter(notif => notif._id !== notificationId)
      )
      toast.success('Notification deleted')
    } catch (error) {
      toast.error('Failed to delete notification')
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'appointment_request':
      case 'appointment_confirmed':
      case 'appointment_cancelled':
      case 'appointment_completed':
        return Calendar
      case 'new_message':
        return MessageCircle
      case 'video_call_request':
        return Video
      case 'prescription_added':
        return FileText
      default:
        return Bell
    }
  }

  const getNotificationColor = (type) => {
    switch (type) {
      case 'appointment_request':
        return 'bg-blue-100 text-blue-600'
      case 'appointment_confirmed':
        return 'bg-green-100 text-green-600'
      case 'appointment_cancelled':
        return 'bg-red-100 text-red-600'
      case 'appointment_completed':
        return 'bg-purple-100 text-purple-600'
      case 'new_message':
        return 'bg-yellow-100 text-yellow-600'
      case 'video_call_request':
        return 'bg-indigo-100 text-indigo-600'
      case 'prescription_added':
        return 'bg-teal-100 text-teal-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const getNotificationLink = (notification) => {
    if (notification.data?.appointmentId) {
      switch (notification.type) {
        case 'new_message':
          return `/chat/${notification.data.appointmentId}`
        case 'video_call_request':
          return `/video-call/${notification.data.appointmentId}`
        default:
          return '/appointments'
      }
    }
    return '/appointments'
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now - date) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60))
      return `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.isRead
    if (filter === 'read') return notification.isRead
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
          <p className="text-gray-600 mt-1">
            Stay updated with your appointments and messages
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full">
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="btn-secondary flex items-center"
          >
            <CheckCheck className="mr-2" size={16} />
            Mark All Read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="card">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {['unread', 'read'].map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                filter === filterType
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              {filterType === 'unread' && unreadCount > 0 && (
                <span className="ml-2 px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            {filter === 'unread' ? 'No unread notifications' : filter === 'read' ? 'No read notifications' : 'No notifications'}
          </h3>
          <p className="text-gray-600">
            {filter === 'unread' 
              ? 'All caught up! You have no unread notifications.'
              : filter === 'read'
              ? 'No read notifications to display.'
              : 'Notifications about appointments and messages will appear here.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notification, index) => {
            const IconComponent = getNotificationIcon(notification.type)
            const notificationLink = getNotificationLink(notification)
            
            return (
              <motion.div
                key={notification._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`card hover:shadow-md transition-all cursor-pointer ${
                  !notification.isRead ? 'bg-blue-50 border-l-4 border-l-primary-500' : ''
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                    <IconComponent size={20} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <Link
                      to={notificationLink}
                      onClick={() => !notification.isRead && markAsRead(notification._id)}
                      className="block"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className={`text-sm font-medium ${
                            !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center mt-2 text-xs text-gray-500">
                            <User className="mr-1" size={12} />
                            <span>
                              {notification.sender.firstName} {notification.sender.lastName}
                            </span>
                            <span className="mx-2">•</span>
                            <span>{formatTime(notification.createdAt)}</span>
                            {notification.isEmailSent && (
                              <>
                                <span className="mx-2">•</span>
                                <span className="text-green-600">📧 Email sent</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          {!notification.isRead && (
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                markAsRead(notification._id)
                              }}
                              className="p-1 text-gray-400 hover:text-primary-600 rounded"
                              title="Mark as read"
                            >
                              <Check size={16} />
                            </button>
                          )}
                          
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              deleteNotification(notification._id)
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 rounded"
                            title="Delete notification"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Notifications