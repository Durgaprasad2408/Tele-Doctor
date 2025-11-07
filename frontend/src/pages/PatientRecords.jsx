import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, User, Calendar, FileText, Eye, Download, Pill, Clock, Phone, Mail } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'

const PatientRecords = () => {
  const { user } = useAuth()
  const [patients, setPatients] = useState([])
  const [filteredPatients, setFilteredPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [patientAppointments, setPatientAppointments] = useState([])
  const [showPatientDetails, setShowPatientDetails] = useState(false)

  useEffect(() => {
    fetchPatientRecords()
  }, [])

  useEffect(() => {
    filterPatients()
  }, [searchTerm, patients])

  const fetchPatientRecords = async () => {
    try {
      // Fetch all appointments for this doctor
      const response = await axios.get('/api/appointments')
      const appointments = response.data.appointments

      // Extract unique patients from appointments
      const uniquePatients = []
      const patientIds = new Set()

      appointments.forEach(appointment => {
        if (!patientIds.has(appointment.patient._id)) {
          patientIds.add(appointment.patient._id)
          
          // Calculate patient statistics
          const patientAppointments = appointments.filter(apt => apt.patient._id === appointment.patient._id)
          const completedAppointments = patientAppointments.filter(apt => apt.status === 'completed')
          const totalPrescriptions = completedAppointments.reduce((total, apt) => 
            total + (apt.prescription?.medications?.length || 0), 0
          )

          uniquePatients.push({
            ...appointment.patient,
            totalAppointments: patientAppointments.length,
            completedAppointments: completedAppointments.length,
            totalPrescriptions,
            lastVisit: patientAppointments
              .sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate))[0]?.appointmentDate,
            nextAppointment: patientAppointments
              .filter(apt => new Date(apt.appointmentDate) > new Date() && apt.status !== 'cancelled')
              .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate))[0]?.appointmentDate
          })
        }
      })

      setPatients(uniquePatients)
    } catch (error) {
      console.error('Failed to fetch patient records:', error)
      toast.error('Failed to load patient records')
    } finally {
      setLoading(false)
    }
  }

  const filterPatients = () => {
    if (!searchTerm.trim()) {
      setFilteredPatients(patients)
      return
    }

    const filtered = patients.filter(patient => {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase()
      const email = patient.email.toLowerCase()
      const search = searchTerm.toLowerCase()
      
      return fullName.includes(search) || email.includes(search)
    })

    setFilteredPatients(filtered)
  }

  const fetchPatientAppointments = async (patientId) => {
    try {
      const response = await axios.get('/api/appointments')
      const appointments = response.data.appointments.filter(apt => apt.patient._id === patientId)
      setPatientAppointments(appointments.sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate)))
    } catch (error) {
      console.error('Failed to fetch patient appointments:', error)
      toast.error('Failed to load patient appointments')
    }
  }

  const viewPatientDetails = async (patient) => {
    setSelectedPatient(patient)
    setShowPatientDetails(true)
    await fetchPatientAppointments(patient._id)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A'
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Patient Records</h1>
        <p className="text-gray-600 mt-1">View and manage your patient consultation history</p>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search patients by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>

        <div className="card">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600">{patients.length}</p>
            <p className="text-sm text-gray-600">Total Patients</p>
          </div>
        </div>
      </div>

      {/* Patient List */}
      {filteredPatients.length === 0 ? (
        <div className="text-center py-12">
          <User className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            {searchTerm ? 'No patients found' : 'No patient records'}
          </h3>
          <p className="text-gray-600">
            {searchTerm 
              ? 'Try adjusting your search criteria'
              : 'Patient records will appear here after consultations'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient, index) => (
            <motion.div
              key={patient._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => viewPatientDetails(patient)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="text-primary-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {patient.firstName} {patient.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">{patient.email}</p>
                    {patient.phone && (
                      <p className="text-sm text-gray-500">{patient.phone}</p>
                    )}
                  </div>
                </div>
                <button className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                  <Eye size={16} />
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Age:</span>
                  <span className="font-medium">{calculateAge(patient.dateOfBirth)} years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Gender:</span>
                  <span className="font-medium capitalize">{patient.gender || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Visits:</span>
                  <span className="font-medium">{patient.totalAppointments}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed:</span>
                  <span className="font-medium">{patient.completedAppointments}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Visit:</span>
                  <span className="font-medium">{formatDate(patient.lastVisit)}</span>
                </div>
                {patient.nextAppointment && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Next Visit:</span>
                    <span className="font-medium text-green-600">{formatDate(patient.nextAppointment)}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{patient.totalPrescriptions} prescriptions</span>
                  <span>Click to view details</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Patient Details Modal */}
      {showPatientDetails && selectedPatient && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="text-primary-600" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </h2>
                  <p className="text-gray-600">{selectedPatient.email}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPatientDetails(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Patient Info */}
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-800 mb-3">Patient Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Age:</span>
                        <span>{calculateAge(selectedPatient.dateOfBirth)} years</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Gender:</span>
                        <span className="capitalize">{selectedPatient.gender || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date of Birth:</span>
                        <span>{formatDate(selectedPatient.dateOfBirth)}</span>
                      </div>
                      {selectedPatient.phone && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Phone:</span>
                          <div className="flex items-center">
                            <Phone size={12} className="mr-1" />
                            <span>{selectedPatient.phone}</span>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Email:</span>
                        <div className="flex items-center">
                          <Mail size={12} className="mr-1" />
                          <span className="truncate">{selectedPatient.email}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-800 mb-3">Statistics</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Appointments:</span>
                        <span className="font-medium">{selectedPatient.totalAppointments}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Completed:</span>
                        <span className="font-medium text-green-600">{selectedPatient.completedAppointments}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Prescriptions:</span>
                        <span className="font-medium">{selectedPatient.totalPrescriptions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Visit:</span>
                        <span className="font-medium">{formatDate(selectedPatient.lastVisit)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Appointment History */}
                <div className="lg:col-span-2">
                  <h3 className="font-medium text-gray-800 mb-4">Consultation History</h3>
                  
                  {patientAppointments.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="mx-auto text-gray-400 mb-2" size={32} />
                      <p className="text-gray-600">No consultation history</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {patientAppointments.map((appointment) => (
                        <div key={appointment._id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <Calendar className="text-gray-400" size={16} />
                                <span className="font-medium text-gray-800">
                                  {formatDateTime(appointment.appointmentDate)}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                                  {appointment.status}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                <strong>Symptoms:</strong> {appointment.symptoms}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-800">${appointment.consultationFee}</p>
                              <p className="text-xs text-gray-500">{appointment.paymentStatus}</p>
                            </div>
                          </div>

                          {appointment.prescription && appointment.prescription.medications && appointment.prescription.medications.length > 0 && (
                            <div className="bg-blue-50 rounded-lg p-3 mt-3">
                              <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                                <Pill className="mr-2" size={16} />
                                Prescription
                              </h4>
                              <div className="space-y-1">
                                {appointment.prescription.medications.map((med, idx) => (
                                  <div key={idx} className="text-sm text-blue-700">
                                    <strong>{med.name}</strong>
                                    {med.dosage && ` - ${med.dosage}`}
                                    {med.frequency && `, ${med.frequency}`}
                                    {med.duration && ` for ${med.duration}`}
                                  </div>
                                ))}
                              </div>
                              {appointment.prescription.notes && (
                                <p className="text-sm text-blue-700 mt-2 italic">
                                  <strong>Notes:</strong> {appointment.prescription.notes}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

export default PatientRecords