import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, Plus, X, Save, CalendarDays, AlertCircle, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'

const Schedule = () => {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [leaveRequests, setLeaveRequests] = useState([])
  const [showAddLeave, setShowAddLeave] = useState(false)
  const [newLeave, setNewLeave] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    type: 'vacation'
  })
  const [loading, setLoading] = useState(false)
  const [appointments, setAppointments] = useState([])

  useEffect(() => {
    fetchScheduleData()
  }, [selectedDate])

  const fetchScheduleData = async () => {
    try {
      // Fetch appointments for the selected month
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
      
      const [appointmentsResponse, leaveResponse] = await Promise.all([
        axios.get('/api/appointments', {
          params: {
            startDate: startOfMonth.toISOString(),
            endDate: endOfMonth.toISOString()
          }
        }),
        axios.get('/api/doctor/leave', {
          params: {
            year: selectedDate.getFullYear()
          }
        })
      ])
      
      setAppointments(appointmentsResponse.data.appointments || [])
      setLeaveRequests(leaveResponse.data || [])
      
    } catch (error) {
      console.error('Failed to fetch schedule data:', error)
      toast.error('Failed to load schedule data')
    }
  }

  const handleAddLeave = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await axios.post('/api/doctor/leave', newLeave)
      
      setLeaveRequests(prev => [...prev, response.data])
      setNewLeave({
        startDate: '',
        endDate: '',
        reason: '',
        type: 'vacation'
      })
      setShowAddLeave(false)
      toast.success('Leave request submitted successfully!')
    } catch (error) {
      console.error('Failed to submit leave request:', error)
      const message = error.response?.data?.message || 'Failed to submit leave request'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLeave = async (leaveId) => {
    try {
      await axios.delete(`/api/doctor/leave/${leaveId}`)
      setLeaveRequests(prev => prev.filter(leave => leave._id !== leaveId))
      toast.success('Leave request deleted successfully!')
    } catch (error) {
      console.error('Failed to delete leave request:', error)
      const message = error.response?.data?.message || 'Failed to delete leave request'
      toast.error(message)
    }
  }

  const handleApproveLeave = async (leaveId) => {
    try {
      const response = await axios.put(`/api/doctor/leave/${leaveId}/status`, {
        status: 'approved'
      })
      
      setLeaveRequests(prev => 
        prev.map(leave => 
          leave._id === leaveId ? response.data : leave
        )
      )
      toast.success('Leave request approved!')
    } catch (error) {
      console.error('Failed to approve leave request:', error)
      toast.error('Failed to approve leave request')
    }
  }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const getAppointmentsForDate = (date) => {
    if (!date) return []
    return appointments.filter(apt => {
      const aptDate = new Date(apt.appointmentDate)
      return aptDate.toDateString() === date.toDateString()
    })
  }

  const isDateOnLeave = (date) => {
    if (!date) return false
    return leaveRequests.some(leave => {
      if (leave.status !== 'approved') return false
      const startDate = new Date(leave.startDate)
      const endDate = new Date(leave.endDate)
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
      return date >= startDate && date <= endDate
    })
  }

  const navigateMonth = (direction) => {
    const newDate = new Date(selectedDate)
    newDate.setMonth(newDate.getMonth() + direction)
    setSelectedDate(newDate)
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const getMinDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Schedule Management</h1>
          <p className="text-gray-600 mt-1">Manage your availability and leave requests</p>
        </div>
        
        <button
          onClick={() => setShowAddLeave(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="mr-2" size={16} />
          Request Leave
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3 card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">
              {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ←
              </button>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => navigateMonth(1)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                →
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {dayNames.map(day => (
              <div key={day} className="p-3 text-center text-sm font-medium text-gray-600 bg-gray-50">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {getDaysInMonth(selectedDate).map((date, index) => {
              const dayAppointments = getAppointmentsForDate(date)
              const isOnLeave = isDateOnLeave(date)
              const isToday = date && date.toDateString() === new Date().toDateString()
              
              return (
                <div
                  key={index}
                  className={`min-h-[100px] p-2 border border-gray-200 ${
                    !date ? 'bg-gray-50' : isOnLeave ? 'bg-red-50' : 'bg-white hover:bg-gray-50'
                  } transition-colors`}
                >
                  {date && (
                    <>
                      <div className={`text-sm font-medium mb-1 ${
                        isToday ? 'text-primary-600' : isOnLeave ? 'text-red-600' : 'text-gray-800'
                      }`}>
                        {date.getDate()}
                        {isToday && <span className="ml-1 text-xs">(Today)</span>}
                      </div>
                      
                      {isOnLeave && (
                        <div className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded mb-1">
                          On Leave
                        </div>
                      )}
                      
                      {dayAppointments.slice(0, 2).map((apt, idx) => (
                        <div
                          key={apt._id}
                          className={`text-xs p-1 rounded mb-1 truncate ${
                            apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                            apt.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}
                          title={`${apt.patient.firstName} ${apt.patient.lastName} - ${new Date(apt.appointmentDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                        >
                          {new Date(apt.appointmentDate).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })} - {apt.patient.firstName}
                        </div>
                      ))}
                      
                      {dayAppointments.length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{dayAppointments.length - 2} more
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Today's Schedule */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
              <Clock className="mr-2" size={16} />
              Today's Schedule
            </h3>
            
            {getAppointmentsForDate(new Date()).length === 0 ? (
              <p className="text-sm text-gray-600">No appointments today</p>
            ) : (
              <div className="space-y-2">
                {getAppointmentsForDate(new Date()).map(apt => (
                  <div key={apt._id} className="p-2 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-800">
                      {apt.patient.firstName} {apt.patient.lastName}
                    </div>
                    <div className="text-xs text-gray-600">
                      {new Date(apt.appointmentDate).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded mt-1 inline-block ${
                      apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      apt.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {apt.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leave Requests */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
              <CalendarDays className="mr-2" size={16} />
              Leave Requests
            </h3>
            
            {leaveRequests.length === 0 ? (
              <p className="text-sm text-gray-600">No leave requests</p>
            ) : (
              <div className="space-y-2">
                {leaveRequests.slice(0, 5).map(leave => (
                  <div key={leave._id} className="p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-800">
                          {leave.type.charAt(0).toUpperCase() + leave.type.slice(1)} Leave
                        </div>
                        <div className="text-xs text-gray-600">
                          {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                        </div>
                        <div className={`text-xs px-2 py-1 rounded mt-1 inline-block ${
                          leave.status === 'approved' ? 'bg-green-100 text-green-700' :
                          leave.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {leave.status}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        {leave.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveLeave(leave._id)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="Approve"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => handleDeleteLeave(leave._id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Legend</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-100 rounded mr-2"></div>
                <span>Confirmed Appointments</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-100 rounded mr-2"></div>
                <span>Pending Appointments</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-100 rounded mr-2"></div>
                <span>Leave Days</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Leave Modal */}
      {showAddLeave && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Request Leave</h2>
              <button
                onClick={() => setShowAddLeave(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddLeave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Leave Type
                </label>
                <select
                  value={newLeave.type}
                  onChange={(e) => setNewLeave({ ...newLeave, type: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="vacation">Vacation</option>
                  <option value="sick">Sick Leave</option>
                  <option value="emergency">Emergency</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newLeave.startDate}
                    onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
                    min={getMinDate()}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={newLeave.endDate}
                    onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })}
                    min={newLeave.startDate || getMinDate()}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason
                </label>
                <textarea
                  value={newLeave.reason}
                  onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                  rows={3}
                  className="input-field"
                  placeholder="Please provide a reason for your leave request..."
                  required
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start">
                  <AlertCircle className="text-yellow-600 mr-2 mt-0.5" size={16} />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Important:</p>
                    <p>During your leave period, you will not be visible to patients for booking appointments.</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddLeave(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Save className="mr-2" size={16} />
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

export default Schedule