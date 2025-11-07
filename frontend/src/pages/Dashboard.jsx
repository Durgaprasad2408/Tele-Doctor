import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Calendar,
  Users,
  MessageCircle,
  Clock,
  TrendingUp,
  Heart,
  FileText,
  CalendarDays
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'

const Dashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalAppointments: 0,
    upcomingAppointments: 0,
    completedAppointments: 0,
    pendingAppointments: 0
  })
  const [recentAppointments, setRecentAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/appointments?limit=5')
      const appointments = response.data.appointments || []

      setRecentAppointments(appointments)

      // Calculate stats
      const now = new Date()
      const stats = {
        totalAppointments: appointments.length,
        upcomingAppointments: appointments.filter(
          (apt) => new Date(apt.appointmentDate) > now && apt.status !== 'cancelled'
        ).length,
        completedAppointments: appointments.filter((apt) => apt.status === 'completed').length,
        pendingAppointments: appointments.filter((apt) => apt.status === 'pending').length
      }

      setStats(stats)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-600 bg-green-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'completed':
        return 'text-blue-600 bg-blue-100'
      case 'cancelled':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-8 w-8 sm:h-12 sm:w-12"></div>
      </div>
    )
  }

  const dashboardCards = [
    {
      title: 'Total Appointments',
      value: stats.totalAppointments,
      icon: Calendar,
      color: 'bg-blue-500',
      change: '+12%'
    },
    {
      title: 'Upcoming',
      value: stats.upcomingAppointments,
      icon: Clock,
      color: 'bg-green-500',
      change: '+5%'
    },
    {
      title: 'Completed',
      value: stats.completedAppointments,
      icon: TrendingUp,
      color: 'bg-purple-500',
      change: '+8%'
    },
    {
      title: 'Pending',
      value: stats.pendingAppointments,
      icon: Heart,
      color: 'bg-orange-500',
      change: '+3%'
    }
  ]

  return (
    <div className="space-mobile">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-responsive-2xl font-bold text-gray-800">
          {user?.role === 'doctor' ? 'Doctor Dashboard' : 'Patient Dashboard'}
        </h1>
        <p className="text-gray-600 mt-1 text-responsive-sm">
          {user?.role === 'doctor'
            ? 'Manage your appointments and patients'
            : 'Track your health appointments and consultations'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="responsive-grid mb-6 sm:mb-8">
        {dashboardCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-responsive-xs font-medium text-gray-600">{card.title}</p>
                <p className="text-responsive-xl font-bold text-gray-800 mt-1">{card.value}</p>
                <p className="text-responsive-xs text-green-600 mt-1 hidden sm:block">
                  {card.change} from last month
                </p>
              </div>
              <div className={`p-2 sm:p-3 rounded-full ${card.color} flex-shrink-0`}>
                <card.icon className="text-white" size={20} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Appointments */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card mb-6 sm:mb-8"
      >
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-responsive-lg font-semibold text-gray-800">Recent Appointments</h2>
          <Link
            to="/appointments"
            className="text-primary-600 hover:text-primary-700 font-medium text-responsive-sm"
          >
            View All
          </Link>
        </div>

        {recentAppointments.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 text-responsive-base">No appointments yet</p>
            <p className="text-responsive-sm text-gray-500 mt-1">
              {user?.role === 'patient'
                ? 'Book your first appointment with a doctor'
                : 'Appointments will appear here once patients book with you'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {recentAppointments
              .filter((a) => a && (a.patient || a.doctor))
              .map((appointment) => {
                const patientName = appointment?.patient
                  ? `${appointment.patient.firstName || 'Unknown'} ${appointment.patient.lastName || ''}`
                  : 'Unknown Patient'
                const doctorName = appointment?.doctor
                  ? `Dr. ${appointment.doctor.firstName || 'Unknown'} ${appointment.doctor.lastName || ''}`
                  : 'Unknown Doctor'

                return (
                  <div
                    key={appointment._id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start space-x-3 sm:space-x-4 mb-3 sm:mb-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="text-primary-600" size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-800 text-responsive-sm truncate">
                          {user?.role === 'doctor' ? patientName : doctorName}
                        </h3>
                        <p className="text-responsive-xs text-gray-600">
                          {formatDate(appointment.appointmentDate)}
                        </p>
                        {user?.role === 'doctor' && (
                          <p className="text-responsive-xs text-gray-500 mt-1 line-clamp-2">
                            Symptoms: {appointment.symptoms || 'N/A'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end space-x-3">
                      <span
                        className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          appointment.status
                        )}`}
                      >
                        {appointment.status
                          ? appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)
                          : 'Unknown'}
                      </span>
                      {(appointment.status === 'confirmed' ||
                        appointment.status === 'completed') && (
                        <Link
                          to={`/chat/${appointment._id}`}
                          className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors touch-target"
                          title="Open Chat"
                        >
                          <MessageCircle size={16} />
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card"
      >
        <h2 className="text-responsive-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="responsive-grid-3">
          {user?.role === 'patient' ? (
            <>
              <Link
                to="/doctors"
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-center group touch-target"
              >
                <Users
                  className="mx-auto mb-2 text-gray-400 group-hover:text-primary-600"
                  size={24}
                />
                <span className="text-responsive-sm font-medium text-gray-600 group-hover:text-primary-700">
                  Find Doctors
                </span>
              </Link>
              <Link
                to="/med-vault"
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-center group touch-target"
              >
                <FileText
                  className="mx-auto mb-2 text-gray-400 group-hover:text-primary-600"
                  size={24}
                />
                <span className="text-responsive-sm font-medium text-gray-600 group-hover:text-primary-700">
                  My Records
                </span>
              </Link>
              <Link
                to="/appointments"
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-center group touch-target"
              >
                <Calendar
                  className="mx-auto mb-2 text-gray-400 group-hover:text-primary-600"
                  size={24}
                />
                <span className="text-responsive-sm font-medium text-gray-600 group-hover:text-primary-700">
                  View Appointments
                </span>
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/schedule"
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-center group touch-target"
              >
                <CalendarDays
                  className="mx-auto mb-2 text-gray-400 group-hover:text-primary-600"
                  size={24}
                />
                <span className="text-responsive-sm font-medium text-gray-600 group-hover:text-primary-700">
                  Manage Schedule
                </span>
              </Link>
              <Link
                to="/patient-records"
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-center group touch-target"
              >
                <Users
                  className="mx-auto mb-2 text-gray-400 group-hover:text-primary-600"
                  size={24}
                />
                <span className="text-responsive-sm font-medium text-gray-600 group-hover:text-primary-700">
                  Patient Records
                </span>
              </Link>
              <Link
                to="/appointments"
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-center group touch-target"
              >
                <Calendar
                  className="mx-auto mb-2 text-gray-400 group-hover:text-primary-600"
                  size={24}
                />
                <span className="text-responsive-sm font-medium text-gray-600 group-hover:text-primary-700">
                  View Appointments
                </span>
              </Link>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default Dashboard
