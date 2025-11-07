import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, Clock, User, MessageCircle, Video, FileText, CheckCircle, XCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'

const Appointments = () => {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchAppointments()
  }, [filter])

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {user?.role === 'doctor' ? 'Patient Appointments' : 'My Appointments'}
          </h1>
          <p className="text-gray-600 mt-1">
            {user?.role === 'doctor' 
              ? 'Manage your patient consultations' 
              : 'Track your upcoming and past consultations'
            }
          </p>
        </div>
        
        {user?.role === 'patient' && (
          <Link to="/doctors" className="btn-primary">
            Book New Appointment
          </Link>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="card">
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

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No appointments found</h3>
          <p className="text-gray-600">
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

              {/* Prescription Section */}
              {appointment.prescription && appointment.prescription.medications && appointment.prescription.medications.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
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
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Appointments