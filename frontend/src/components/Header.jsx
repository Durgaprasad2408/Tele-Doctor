import { Bell, User, LogOut, Menu } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

const Header = () => {
  const { user, logout } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchUnreadCount()
    
    // Listen for new notifications
    const handleNewNotification = () => {
      fetchUnreadCount()
    }
    
    window.addEventListener('newNotification', handleNewNotification)
    
    // Refresh unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('newNotification', handleNewNotification)
    }
  }, [])

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get('/api/notifications?unreadOnly=true&limit=1')
      setUnreadCount(response.data.unreadCount || 0)
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
    }
  }

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 bg-white border-b border-gray-200 z-40">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4">
        <div className="flex-1">
          <h1 className="text-lg sm:text-xl font-semibold text-gray-800">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-sm text-gray-600 capitalize hidden sm:block">
            {user?.role} Dashboard
          </p>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Notifications */}
          <Link
            to="/notifications"
            className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors touch-target"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          
          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors touch-target"
            >
              <User size={20} />
              <span className="text-sm font-medium hidden sm:block">{user?.firstName}</span>
            </button>
            
            {showDropdown && (
              <>
                {/* Mobile overlay */}
                <div 
                  className="fixed inset-0 z-10 sm:hidden"
                  onClick={() => setShowDropdown(false)}
                />
                
                {/* Dropdown menu */}
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <Link
                    to="/profile"
                    className="flex items-center space-x-2 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => setShowDropdown(false)}
                  >
                    <User size={16} />
                    <span>Profile</span>
                  </Link>
                  <Link
                    to="/notifications"
                    className="flex items-center space-x-2 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => setShowDropdown(false)}
                  >
                    <Bell size={16} />
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <span className="ml-auto bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                  <hr className="my-1" />
                  <button
                    onClick={logout}
                    className="flex items-center space-x-2 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header