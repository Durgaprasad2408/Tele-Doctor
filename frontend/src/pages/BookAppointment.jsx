import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, Clock, DollarSign, User, FileText, AlertCircle } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const BookAppointment = () => {
  const { doctorId } = useParams()
  const navigate = useNavigate()
  const [doctor, setDoctor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [availableSlots, setAvailableSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [formData, setFormData] = useState({
    appointmentDate: '',
    appointmentTime: '',
    symptoms: ''
  })

  useEffect(() => {
    fetchDoctor()
  }, [doctorId])

  useEffect(() => {
    if (formData.appointmentDate) {
      fetchAvailableSlots()
    } else {
      setAvailableSlots([])
    }
  }, [formData.appointmentDate])

  const fetchDoctor = async () => {
    try {
      const response = await axios.get(`/api/users/doctors/${doctorId}`)
      setDoctor(response.data)
    } catch (error) {
      console.error('Failed to fetch doctor:', error)
      toast.error('Doctor not found')
      navigate('/doctors')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableSlots = async () => {
    setLoadingSlots(true)
    try {
      const response = await axios.get(`/api/availability/doctor/${doctorId}/date/${formData.appointmentDate}`)
      
      if (!response.data.available) {
        setAvailableSlots([])
        toast.warning(response.data.reason || 'Doctor is not available on this date')
      } else {
        setAvailableSlots(response.data.timeSlots)
      }
    } catch (error) {
      console.error('Failed to fetch available slots:', error)
      toast.error('Failed to check availability')
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Find the selected time slot
      const selectedSlot = availableSlots.find(slot => slot.time === formData.appointmentTime)
      if (!selectedSlot) {
        toast.error('Please select a valid time slot')
        return
      }

      const response = await axios.post('/api/appointments', {
        doctorId,
        appointmentDate: selectedSlot.datetime,
        symptoms: formData.symptoms
      })

      toast.success('Appointment booked successfully!')
      navigate('/appointments')
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to book appointment'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  // Get maximum date (3 months from now)
  const getMaxDate = () => {
    const maxDate = new Date()
    maxDate.setMonth(maxDate.getMonth() + 3)
    return maxDate.toISOString().split('T')[0]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!doctor) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-800">Doctor not found</h2>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Book Appointment</h1>
        <p className="text-gray-600 mt-1">Schedule a consultation with Dr. {doctor.firstName} {doctor.lastName}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doctor Info */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card"
        >
          <div className="text-center mb-4">
            <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-bold text-primary-600">
                {doctor.firstName[0]}{doctor.lastName[0]}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-gray-800">
              Dr. {doctor.firstName} {doctor.lastName}
            </h2>
            <p className="text-primary-600 font-medium">{doctor.specialization}</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center text-sm text-gray-600">
              <User className="mr-3" size={16} />
              <span>{doctor.experience} years experience</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <DollarSign className="mr-3" size={16} />
              <span>${doctor.consultationFee} consultation fee</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="mr-3" size={16} />
              <span>30 minutes duration</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-primary-50 rounded-lg">
            <h3 className="font-medium text-primary-800 mb-2">What to expect:</h3>
            <ul className="text-sm text-primary-700 space-y-1">
              <li>• Initial consultation and assessment</li>
              <li>• Discussion of symptoms and concerns</li>
              <li>• Professional medical advice</li>
              <li>• Prescription if needed</li>
            </ul>
          </div>
        </motion.div>

        {/* Booking Form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2"
        >
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-800 mb-6">Appointment Details</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline mr-2" size={16} />
                  Preferred Date
                </label>
                <input
                  type="date"
                  name="appointmentDate"
                  value={formData.appointmentDate}
                  onChange={handleChange}
                  min={getMinDate()}
                  max={getMaxDate()}
                  className="input-field"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Select a date to see available time slots
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="inline mr-2" size={16} />
                  Available Time Slots
                </label>
                
                {!formData.appointmentDate ? (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-600">Please select a date first</p>
                  </div>
                ) : loadingSlots ? (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="text-sm text-gray-600 mt-2">Checking availability...</p>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start">
                      <AlertCircle className="text-red-600 mr-2 mt-0.5" size={16} />
                      <div className="text-sm text-red-800">
                        <p className="font-medium">No available slots</p>
                        <p>The doctor is not available on this date. Please select another date.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {availableSlots.map((slot) => (
                      <label
                        key={slot.time}
                        className={`p-3 border rounded-lg text-center cursor-pointer transition-colors ${
                          formData.appointmentTime === slot.time
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-300 hover:border-primary-300 hover:bg-primary-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="appointmentTime"
                          value={slot.time}
                          onChange={handleChange}
                          className="sr-only"
                          required
                        />
                        <span className="text-sm font-medium">{slot.display}</span>
                      </label>
                    ))}
                  </div>
                )}
                
                {availableSlots.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    {availableSlots.length} time slots available
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="inline mr-2" size={16} />
                  Symptoms & Concerns
                </label>
                <textarea
                  name="symptoms"
                  value={formData.symptoms}
                  onChange={handleChange}
                  rows={4}
                  className="input-field"
                  placeholder="Please describe your symptoms, concerns, or reason for consultation..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  This information helps the doctor prepare for your consultation
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-2">Appointment Summary</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Doctor:</span>
                    <span>Dr. {doctor.firstName} {doctor.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Specialization:</span>
                    <span>{doctor.specialization}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>
                      {formData.appointmentDate 
                        ? new Date(formData.appointmentDate).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : 'Not selected'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time:</span>
                    <span>
                      {formData.appointmentTime 
                        ? availableSlots.find(slot => slot.time === formData.appointmentTime)?.display || formData.appointmentTime
                        : 'Not selected'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>30 minutes</span>
                  </div>
                  <div className="flex justify-between font-medium text-gray-800">
                    <span>Consultation Fee:</span>
                    <span>${doctor.consultationFee}</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => navigate('/doctors')}
                  className="flex-1 btn-secondary"
                >
                  Back to Doctors
                </button>
                <button
                  type="submit"
                  disabled={submitting || availableSlots.length === 0}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Booking...' : 'Book Appointment'}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default BookAppointment