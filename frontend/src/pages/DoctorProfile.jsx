import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Star, MapPin, Clock, DollarSign, Calendar, Phone, Mail, Award, Stethoscope } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const DoctorProfile = () => {
  const { doctorId } = useParams()
  const [doctor, setDoctor] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDoctor()
  }, [doctorId])

  const fetchDoctor = async () => {
    try {
      const response = await axios.get(`/api/users/doctors/${doctorId}`)
      setDoctor(response.data)
    } catch (error) {
      console.error('Failed to fetch doctor:', error)
      toast.error('Doctor not found')
    } finally {
      setLoading(false)
    }
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
        <Link to="/doctors" className="text-primary-600 hover:text-primary-700 mt-2 inline-block">
          Back to Doctors List
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          to="/doctors"
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Doctor Profile</h1>
          <p className="text-gray-600 mt-1">View detailed information about the doctor</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doctor Info Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1"
        >
          <div className="card text-center">
            <div className="w-32 h-32 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl font-bold text-primary-600">
                {doctor.firstName[0]}{doctor.lastName[0]}
              </span>
            </div>
            
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              Dr. {doctor.firstName} {doctor.lastName}
            </h2>
            
            <p className="text-primary-600 font-medium text-lg mb-4">
              {doctor.specialization}
            </p>

            <div className="flex items-center justify-center mb-4">
              <Star className="text-yellow-400 mr-1" size={20} />
              <span className="text-gray-600">4.8 (124 reviews)</span>
            </div>

            <Link
              to={`/book-appointment/${doctor._id}`}
              className="w-full btn-primary mb-4 block text-center"
            >
              Book Appointment
            </Link>

            <div className="text-left space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <Award className="mr-3 text-primary-600" size={16} />
                <span>{doctor.experience} years experience</span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <DollarSign className="mr-3 text-primary-600" size={16} />
                <span>${doctor.consultationFee} consultation fee</span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="mr-3 text-primary-600" size={16} />
                <span>30 minutes duration</span>
              </div>

              {doctor.phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="mr-3 text-primary-600" size={16} />
                  <span>{doctor.phone}</span>
                </div>
              )}

              <div className="flex items-center text-sm text-gray-600">
                <Mail className="mr-3 text-primary-600" size={16} />
                <span>{doctor.email}</span>
              </div>

              {doctor.licenseNumber && (
                <div className="flex items-center text-sm text-gray-600">
                  <Stethoscope className="mr-3 text-primary-600" size={16} />
                  <span>License: {doctor.licenseNumber}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Detailed Information */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* About Section */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">About Dr. {doctor.lastName}</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Specialization</h4>
                <p className="text-gray-600">{doctor.specialization}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Experience</h4>
                <p className="text-gray-600">
                  Dr. {doctor.lastName} has {doctor.experience} years of experience in {doctor.specialization.toLowerCase()}, 
                  providing comprehensive healthcare services to patients of all ages.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2">Education & Qualifications</h4>
                <p className="text-gray-600">
                  Licensed medical practitioner with extensive training in {doctor.specialization.toLowerCase()}.
                  License Number: {doctor.licenseNumber || 'Not provided'}
                </p>
              </div>
            </div>
          </div>

          {/* Services & Consultation */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Services & Consultation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-primary-50 p-4 rounded-lg">
                <h4 className="font-medium text-primary-800 mb-2">Video Consultation</h4>
                <p className="text-sm text-primary-700">
                  Secure video calls for remote consultations
                </p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">Digital Prescriptions</h4>
                <p className="text-sm text-green-700">
                  Electronic prescriptions sent directly to you
                </p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Chat Support</h4>
                <p className="text-sm text-blue-700">
                  Real-time messaging during consultations
                </p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-800 mb-2">Follow-up Care</h4>
                <p className="text-sm text-purple-700">
                  Continued care and monitoring
                </p>
              </div>
            </div>
          </div>

          {/* Availability */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Availability</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Consultation Hours</h4>
                <p className="text-gray-600">Monday - Friday: 9:00 AM - 5:00 PM</p>
                <p className="text-gray-600">Saturday: 9:00 AM - 1:00 PM</p>
                <p className="text-gray-600">Sunday: Closed</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Response Time</h4>
                <p className="text-gray-600">Usually responds within 2-4 hours</p>
                <p className="text-gray-600">Emergency consultations available</p>
              </div>
            </div>
          </div>

          {/* Patient Reviews */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Patient Reviews</h3>
            <div className="space-y-4">
              <div className="border-l-4 border-primary-500 pl-4">
                <div className="flex items-center mb-2">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} fill="currentColor" />
                    ))}
                  </div>
                  <span className="ml-2 text-sm text-gray-600">5.0</span>
                </div>
                <p className="text-gray-600 text-sm">
                  "Excellent doctor with great bedside manner. Very thorough and professional."
                </p>
                <p className="text-xs text-gray-500 mt-1">- Sarah M.</p>
              </div>
              
              <div className="border-l-4 border-primary-500 pl-4">
                <div className="flex items-center mb-2">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} fill="currentColor" />
                    ))}
                  </div>
                  <span className="ml-2 text-sm text-gray-600">5.0</span>
                </div>
                <p className="text-gray-600 text-sm">
                  "Very knowledgeable and took time to explain everything clearly. Highly recommend!"
                </p>
                <p className="text-xs text-gray-500 mt-1">- John D.</p>
              </div>
              
              <div className="border-l-4 border-primary-500 pl-4">
                <div className="flex items-center mb-2">
                  <div className="flex text-yellow-400">
                    {[...Array(4)].map((_, i) => (
                      <Star key={i} size={16} fill="currentColor" />
                    ))}
                    <Star size={16} className="text-gray-300" />
                  </div>
                  <span className="ml-2 text-sm text-gray-600">4.0</span>
                </div>
                <p className="text-gray-600 text-sm">
                  "Good consultation experience. The video call quality was excellent."
                </p>
                <p className="text-xs text-gray-500 mt-1">- Emily R.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default DoctorProfile