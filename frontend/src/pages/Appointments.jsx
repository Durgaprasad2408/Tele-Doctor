import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, Clock, User, MessageCircle, Video, FileText, CheckCircle, XCircle, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'

const Appointments = () => {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    fetchAppointments()
  }, [filter])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && !event.target.closest('.filter-dropdown')) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  const fetchAppointments = async () => {
    try {
      const params = {}
      if (filter !== 'all') {
        params.status = filter
      }
      
      const response = await axios.get('/api/appointments', { params })
      setAppointments(response.data.appointments)
    } catch (error) {
      console.error('Failed to fetch appointments:', error)
      toast.error('Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }

  const updateAppointmentStatus = async (appointmentId, status) => {
    try {
      await axios.put(`/api/appointments/${appointmentId}/status`, { status })
      toast.success(`Appointment ${status}`)
      fetchAppointments()
    } catch (error) {
      toast.error('Failed to update appointment')
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'text-green-600 bg-green-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'completed': return 'text-blue-600 bg-blue-100'
      case 'cancelled': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const isUpcoming = (dateString) => {
    return new Date(dateString) > new Date()
  }

  const filteredAppointments = appointments.filter(appointment => {
    if (filter === 'all') return true
    return appointment.status === filter
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-2xl font-bold text-gray-800">
            {user?.role === 'doctor' ? 'Patient Appointments' : 'My Appointments'}
          </h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">
            {user?.role === 'doctor'
              ? 'Manage your patient consultations'
              : 'Track your upcoming and past consultations'
            }
          </p>
        </div>

        {user?.role === 'patient' && (
          <Link to="/doctors" className="btn-primary w-full md:w-auto text-center">
            Book New Appointment
          </Link>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="card">
        {/* Mobile Dropdown */}
        <div className="block md:hidden">
          <div className="relative filter-dropdown">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full bg-gray-100 p-3 rounded-lg flex items-center justify-between text-sm font-medium text-gray-700 touch-target"
            >
              <span>Filter: {filter.charAt(0).toUpperCase() + filter.slice(1)}</span>
              <ChevronDown className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} size={16} />
            </button>

            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setFilter(status)
                      setDropdownOpen(false)
                    }}
                    className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors touch-target ${
                      filter === status
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                    } ${status === 'cancelled' ? 'rounded-b-lg' : ''} ${status === 'all' ? 'rounded-t-lg' : ''}`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Tabs */}
        <div className="hidden md:block">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <div className="text-center py-8 sm:py-12 px-4">
          <Calendar className="mx-auto text-gray-400 mb-4" size={40} />
          <h3 className="text-responsive-lg font-medium text-gray-800 mb-2">No appointments found</h3>
          <p className="text-responsive-sm text-gray-600 max-w-md mx-auto">
            {filter === 'all'
              ? user?.role === 'patient'
                ? 'Book your first appointment with a doctor'
                : 'No appointments scheduled yet'
              : `No ${filter} appointments`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appointment, index) => (
            <motion.div
              key={appointment._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card hover:shadow-lg transition-shadow"
            >
              {/* Mobile Layout (hidden on md+) */}
              <div className="block md:hidden">
                {/* Header with Avatar and Basic Info */}
                <div className="flex items-start space-x-3 mb-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="text-primary-600" size={18} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h3 className="text-base font-semibold text-gray-800 truncate">
                        {user?.role === 'doctor'
                          ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
                          : `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`
                        }
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium self-start sm:self-center ${getStatusColor(appointment.status)}`}>
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Appointment Details */}
                <div className="space-y-3 mb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Calendar className="mr-2 text-gray-400 flex-shrink-0" size={16} />
                      <span className="truncate">{formatDate(appointment.appointmentDate)}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="mr-2 text-gray-400 flex-shrink-0" size={16} />
                      <span>{formatTime(appointment.appointmentDate)}</span>
                    </div>
                  </div>

                  {user?.role === 'doctor' && appointment.symptoms && (
                    <div className="flex items-start">
                      <FileText className="mr-2 text-gray-400 flex-shrink-0 mt-0.5" size={16} />
                      <span className="text-sm text-gray-600">
                        <span className="font-medium">Symptoms:</span> {appointment.symptoms}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons and Pricing */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-center sm:justify-start space-x-2">
                    {/* Action Buttons */}
                    {appointment.status === 'confirmed' && isUpcoming(appointment.appointmentDate) && (
                      <>
                        <Link
                          to={`/chat/${user?.role === 'doctor' ? appointment.patient._id : appointment.doctor._id}`}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors touch-target"
                          title="Chat"
                        >
                          <MessageCircle size={18} />
                        </Link>
                        <Link
                          to={`/video-call/${appointment._id}`}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors touch-target"
                          title="Video Call"
                        >
                          <Video size={18} />
                        </Link>
                      </>
                    )}

                    {/* Doctor Actions */}
                    {user?.role === 'doctor' && appointment.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => updateAppointmentStatus(appointment._id, 'confirmed')}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors touch-target"
                          title="Confirm"
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button
                          onClick={() => updateAppointmentStatus(appointment._id, 'cancelled')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors touch-target"
                          title="Cancel"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-center sm:text-right">
                    <p className="text-sm font-semibold text-gray-800">
                      ${appointment.consultationFee}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {appointment.paymentStatus}
                    </p>
                  </div>
                </div>
              </div>

              {/* Desktop Layout (hidden on small screens) */}
              <div className="hidden md:block">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="text-primary-600" size={20} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">
                          {user?.role === 'doctor'
                            ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
                            : `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`
                          }
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="mr-2" size={16} />
                          <span>{formatDate(appointment.appointmentDate)}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="mr-2" size={16} />
                          <span>{formatTime(appointment.appointmentDate)}</span>
                        </div>
                        {user?.role === 'doctor' && (
                          <div className="flex items-center md:col-span-2">
                            <FileText className="mr-2" size={16} />
                            <span>Symptoms: {appointment.symptoms}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Action Buttons */}
                    {appointment.status === 'confirmed' && isUpcoming(appointment.appointmentDate) && (
                      <>
                        <Link
                          to={`/chat/${user?.role === 'doctor' ? appointment.patient._id : appointment.doctor._id}`}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Chat"
                        >
                          <MessageCircle size={20} />
                        </Link>
                        <Link
                          to={`/video-call/${appointment._id}`}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Video Call"
                        >
                          <Video size={20} />
                        </Link>
                      </>
                    )}

                    {/* Doctor Actions */}
                    {user?.role === 'doctor' && appointment.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => updateAppointmentStatus(appointment._id, 'confirmed')}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Confirm"
                        >
                          <CheckCircle size={20} />
                        </button>
                        <button
                          onClick={() => updateAppointmentStatus(appointment._id, 'cancelled')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Cancel"
                        >
                          <XCircle size={20} />
                        </button>
                      </div>
                    )}

                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-800">
                        ${appointment.consultationFee}
                      </p>
                      <p className="text-xs text-gray-500">
                        {appointment.paymentStatus}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prescription Section */}
              {appointment.prescription && appointment.prescription.medications && appointment.prescription.medications.length > 0 && (
                <>
                  {/* Mobile Prescription Layout */}
                  <div className="mt-4 pt-4 border-t border-gray-200 block md:hidden">
                    <h4 className="font-medium text-gray-800 mb-3 text-sm">Prescription</h4>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-3">
                      {appointment.prescription.medications.map((med, idx) => (
                        <div key={idx} className="bg-white rounded-md p-3 border border-gray-200">
                          <div className="font-medium text-gray-800 text-sm mb-1">{med.name}</div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div><span className="font-medium">Dosage:</span> {med.dosage}</div>
                            <div><span className="font-medium">Frequency:</span> {med.frequency}</div>
                            {med.instructions && (
                              <div><span className="font-medium">Instructions:</span> {med.instructions}</div>
                            )}
                          </div>
                        </div>
                      ))}
                      {appointment.prescription.notes && (
                        <div className="bg-blue-50 rounded-md p-3 border border-blue-200">
                          <p className="text-xs text-blue-800 italic">
                            <span className="font-medium">Notes:</span> {appointment.prescription.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Desktop Prescription Layout */}
                  <div className="mt-4 pt-4 border-t border-gray-200 hidden md:block">
                    <h4 className="font-medium text-gray-800 mb-2">Prescription</h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      {appointment.prescription.medications.map((med, idx) => (
                        <div key={idx} className="text-sm text-gray-600 mb-1">
                          <strong>{med.name}</strong> - {med.dosage}, {med.frequency}
                          {med.instructions && <span className="text-gray-500"> ({med.instructions})</span>}
                        </div>
                      ))}
                      {appointment.prescription.notes && (
                        <p className="text-sm text-gray-600 mt-2 italic">
                          Notes: {appointment.prescription.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Appointments