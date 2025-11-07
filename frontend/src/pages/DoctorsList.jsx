import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Star, Clock, DollarSign, AlertCircle, Filter } from 'lucide-react'
import axios from 'axios'

const DoctorsList = () => {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSpecialization, setSelectedSpecialization] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchDoctors()
  }, [selectedSpecialization, selectedDate])

  const fetchDoctors = async () => {
    try {
      let doctorsData = []
      
      if (selectedDate) {
        // Fetch only available doctors for the selected date
        const response = await axios.get(`/api/availability/doctors/date/${selectedDate}`, {
          params: selectedSpecialization ? { specialization: selectedSpecialization } : {}
        })
        doctorsData = response.data.doctors
        
        if (response.data.totalOnLeave > 0) {
          console.log(`${response.data.totalOnLeave} doctors are on leave on ${selectedDate}`)
        }
      } else {
        // Fetch all doctors
        const params = {}
        if (selectedSpecialization) {
          params.specialization = selectedSpecialization
        }
        
        const response = await axios.get('/api/users/doctors', { params })
        doctorsData = response.data.doctors
      }
      
      setDoctors(doctorsData)
    } catch (error) {
      console.error('Failed to fetch doctors:', error)
    } finally {
      setLoading(false)
    }
  }

  const specializations = [
    'General Medicine',
    'Cardiology',
    'Dermatology',
    'Pediatrics',
    'Psychiatry',
    'Orthopedics',
    'Gynecology',
    'Neurology',
    'Oncology',
    'Ophthalmology'
  ]

  const filteredDoctors = doctors.filter(doctor =>
    doctor.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
        <div className="spinner h-8 w-8 sm:h-12 sm:w-12"></div>
      </div>
    )
  }

  return (
    <div className="space-mobile">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-responsive-2xl font-bold text-gray-800">Find Doctors</h1>
        <p className="text-gray-600 mt-1 text-responsive-sm">Browse and book appointments with qualified healthcare professionals</p>
      </div>

      {/* Search and Filters */}
      <div className="card mb-6">
        {/* Mobile filter toggle */}
        <div className="flex items-center justify-between mb-4 sm:hidden">
          <h3 className="font-medium text-gray-800">Search & Filter</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-primary-600 hover:text-primary-700"
          >
            <Filter size={16} />
            <span className="text-sm">Filters</span>
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or specialization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>

        {/* Filters */}
        <div className={`grid grid-cols-1 gap-4 ${showFilters || 'hidden'} sm:grid sm:grid-cols-2 lg:grid-cols-2`}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Specialization
            </label>
            <select
              value={selectedSpecialization}
              onChange={(e) => setSelectedSpecialization(e.target.value)}
              className="input-field"
            >
              <option value="">All Specializations</option>
              {specializations.map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available on Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={getMinDate()}
              max={getMaxDate()}
              className="input-field"
            />
            {selectedDate && (
              <p className="text-xs text-gray-500 mt-1">
                Showing only doctors available on this date
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Results Info */}
      {selectedDate && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertCircle className="text-blue-600 mr-2 mt-0.5 flex-shrink-0" size={16} />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Filtered by availability</p>
              <p>
                Showing doctors available on {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}. Doctors on leave are not shown.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="mb-4">
        <p className="text-responsive-sm text-gray-600">
          {filteredDoctors.length} doctor{filteredDoctors.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Doctors Grid */}
      {filteredDoctors.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="text-gray-400" size={32} />
          </div>
          <h3 className="text-responsive-lg font-medium text-gray-800 mb-2">No doctors found</h3>
          <p className="text-gray-600 text-responsive-sm">
            {selectedDate 
              ? 'No doctors are available on the selected date. Try choosing a different date.'
              : 'Try adjusting your search criteria'
            }
          </p>
        </div>
      ) : (
        <div className="responsive-grid">
          {filteredDoctors.map((doctor, index) => (
            <motion.div
              key={doctor._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card hover:shadow-lg transition-shadow"
            >
              <div className="text-center mb-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg sm:text-2xl font-bold text-primary-600">
                    {doctor.firstName[0]}{doctor.lastName[0]}
                  </span>
                </div>
                <h3 className="text-responsive-base font-semibold text-gray-800">
                  Dr. {doctor.firstName} {doctor.lastName}
                </h3>
                <p className="text-primary-600 font-medium text-responsive-sm">{doctor.specialization}</p>
              </div>

              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                <div className="flex items-center text-responsive-xs text-gray-600">
                  <Clock className="mr-2 flex-shrink-0" size={16} />
                  <span>{doctor.experience} years experience</span>
                </div>
                <div className="flex items-center text-responsive-xs text-gray-600">
                  <DollarSign className="mr-2 flex-shrink-0" size={16} />
                  <span>${doctor.consultationFee} consultation fee</span>
                </div>
                <div className="flex items-center text-responsive-xs text-gray-600">
                  <Star className="mr-2 text-yellow-400 flex-shrink-0" size={16} />
                  <span>4.8 (124 reviews)</span>
                </div>
              </div>

              <div className="space-y-2">
                <Link
                  to={`/book-appointment/${doctor._id}`}
                  className="w-full btn-primary text-center block text-responsive-sm"
                >
                  Book Appointment
                </Link>
                <Link
                  to={`/doctors/${doctor._id}`}
                  className="w-full btn-secondary text-center block text-responsive-sm"
                >
                  View Profile
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DoctorsList