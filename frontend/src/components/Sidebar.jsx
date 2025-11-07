import { NavLink } from 'react-router-dom'
import { X } from 'lucide-react'
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  MessageCircle, 
  User,
  Bell,
  Heart,
  FileText
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth()

  const patientNavItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/doctors', icon: Users, label: 'Find Doctors' },
    { to: '/appointments', icon: Calendar, label: 'My Appointments' },
    { to: '/messages', icon: MessageCircle, label: 'Messages' },
    { to: '/med-vault', icon: FileText, label: 'My Med Vault' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/profile', icon: User, label: 'Profile' },
  ]

  const doctorNavItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/appointments', icon: Calendar, label: 'Appointments' },
    { to: '/messages', icon: MessageCircle, label: 'Messages' },
    { to: '/med-vault', icon: FileText, label: 'Med Vault' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/profile', icon: User, label: 'Profile' },
  ]

  const navItems = user?.role === 'doctor' ? doctorNavItems : patientNavItems

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-50">
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-8">
            <div className="p-2 bg-primary-600 rounded-lg">
              <Heart className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">TeleMed</h2>
              <p className="text-xs text-gray-600">Healthcare Portal</p>
            </div>
          </div>
          
          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                  }`
                }
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <aside className={`mobile-menu ${isOpen ? 'open' : 'closed'}`}>
        <div className="p-4">
          {/* Mobile header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-primary-600 rounded-lg">
                <Heart className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">TeleMed</h2>
                <p className="text-xs text-gray-600">Healthcare Portal</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors touch-target"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* User info */}
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-primary-600">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-600 capitalize">{user?.role}</p>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `mobile-nav-item ${isActive ? 'active' : ''}`
                }
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
    </>
  )
}

export default Sidebar