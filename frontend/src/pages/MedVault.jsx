import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FileText, Download, Calendar, User, Stethoscope, Clock, Pill, FileDown, Search, Filter } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'

const MedVault = () => {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('completed')
  const [downloadingPdf, setDownloadingPdf] = useState(null)

  useEffect(() => {
    fetchAppointments()
  }, [filterStatus])

  const fetchAppointments = async () => {
    try {
      const params = { status: filterStatus }
      const response = await axios.get('/api/appointments', { params })
      
      // Filter appointments that have prescriptions
      const appointmentsWithPrescriptions = response.data.appointments.filter(
        apt => apt.prescription && apt.prescription.medications && apt.prescription.medications.length > 0 && apt.patient
      )
      
      setAppointments(appointmentsWithPrescriptions)
    } catch (error) {
      console.error('Failed to fetch appointments:', error)
      toast.error('Failed to load medical records')
    } finally {
      setLoading(false)
    }
  }

  const generatePDF = async (appointment) => {
    try {
      setDownloadingPdf(appointment._id)
      
      // Create a temporary HTML element for the prescription
      const prescriptionHTML = createPrescriptionHTML(appointment)
      
      // Create a temporary div to hold the HTML
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = prescriptionHTML
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      tempDiv.style.top = '-9999px'
      tempDiv.style.width = '210mm' // A4 width
      tempDiv.style.backgroundColor = 'white'
      tempDiv.style.fontFamily = 'Arial, sans-serif'
      tempDiv.style.fontSize = '12px'
      tempDiv.style.lineHeight = '1.4'
      tempDiv.style.color = '#000'
      
      document.body.appendChild(tempDiv)
      
      // Import html2canvas and jsPDF
      const html2canvas = (await import('html2canvas')).default
      const { default: jsPDF } = await import('jspdf')
      
      // Convert HTML to canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794, // A4 width in pixels at 96 DPI
        height: 1123 // A4 height in pixels at 96 DPI
      })
      
      // Remove temporary div
      document.body.removeChild(tempDiv)
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgData = canvas.toDataURL('image/png')
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
      const imgX = (pdfWidth - imgWidth * ratio) / 2
      const imgY = 0
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio)
      
      // Generate filename
      const patientName = `${appointment.patient?.firstName || 'Unknown'}_${appointment.patient?.lastName || 'Patient'}`.replace(/[^a-zA-Z0-9]/g, '_')
      const doctorName = `Dr_${appointment.doctor?.firstName || 'Unknown'}_${appointment.doctor?.lastName || 'Doctor'}`.replace(/[^a-zA-Z0-9]/g, '_')
      const date = new Date(appointment.appointmentDate).toISOString().split('T')[0]
      const filename = `TeleMed_Prescription_${patientName}_${doctorName}_${date}.pdf`
      
      // Save the PDF
      pdf.save(filename)
      
      toast.success('Prescription downloaded successfully!')
    } catch (error) {
      console.error('Failed to generate PDF:', error)
      toast.error(`Failed to generate PDF: ${error.message}`)
    } finally {
      setDownloadingPdf(null)
    }
  }

  const createPrescriptionHTML = (appointment) => {
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    return `
      <div style="padding: 20px; max-width: 210mm; margin: 0 auto; background: white;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0284c7, #0369a1); color: white; padding: 20px; margin: -20px -20px 20px -20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🏥 TeleMed Healthcare</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Digital Prescription & Consultation Report</p>
        </div>

        <!-- Consultation Information -->
        <div style="margin-bottom: 25px;">
          <h2 style="color: #1f2937; font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
            Consultation Information
          </h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr style="background-color: #f9fafb;">
              <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold; width: 30%;">Consultation Date</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${formatDate(appointment.appointmentDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Patient Name</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${appointment.patient.firstName} ${appointment.patient.lastName}</td>
            </tr>
            <tr style="background-color: #f9fafb;">
              <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Patient Email</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${appointment.patient.email || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Patient Phone</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${appointment.patient.phone || 'Not provided'}</td>
            </tr>
            <tr style="background-color: #f9fafb;">
              <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Doctor Name</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Specialization</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${appointment.doctor.specialization || 'Not specified'}</td>
            </tr>
            <tr style="background-color: #f9fafb;">
              <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Consultation Fee</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">$${appointment.consultationFee || 0}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Symptoms Reported</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${appointment.symptoms || 'Not specified'}</td>
            </tr>
          </table>
        </div>

        <!-- Prescribed Medications -->
        ${appointment.prescription && appointment.prescription.medications && appointment.prescription.medications.length > 0 ? `
        <div style="margin-bottom: 25px;">
          <h2 style="color: #1f2937; font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #22c55e; padding-bottom: 5px;">
            💊 Prescribed Medications
          </h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #22c55e; color: white;">
                <th style="padding: 10px; border: 1px solid #16a34a; text-align: left; width: 5%;">#</th>
                <th style="padding: 10px; border: 1px solid #16a34a; text-align: left; width: 25%;">Medication Name</th>
                <th style="padding: 10px; border: 1px solid #16a34a; text-align: left; width: 15%;">Dosage</th>
                <th style="padding: 10px; border: 1px solid #16a34a; text-align: left; width: 20%;">Frequency</th>
                <th style="padding: 10px; border: 1px solid #16a34a; text-align: left; width: 15%;">Duration</th>
                <th style="padding: 10px; border: 1px solid #16a34a; text-align: left; width: 20%;">Instructions</th>
              </tr>
            </thead>
            <tbody>
              ${appointment.prescription.medications.map((med, index) => `
                <tr style="${index % 2 === 0 ? 'background-color: #f9fafb;' : ''}">
                  <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${index + 1}</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">${med.name || 'Not specified'}</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${med.dosage || 'Not specified'}</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${med.frequency || 'Not specified'}</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${med.duration || 'Not specified'}</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${med.instructions || 'None'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <!-- Doctor's Notes -->
        ${appointment.prescription && appointment.prescription.notes ? `
        <div style="margin-bottom: 25px;">
          <h2 style="color: #1f2937; font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #3b82f6; padding-bottom: 5px;">
            📝 Doctor's Notes
          </h2>
          <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #3b82f6; border-radius: 4px;">
            <p style="margin: 0; line-height: 1.6;">${appointment.prescription.notes}</p>
          </div>
        </div>
        ` : ''}

        <!-- Important Information -->
        <div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 15px; margin-bottom: 25px;">
          <h3 style="color: #92400e; font-size: 16px; font-weight: bold; margin: 0 0 10px 0;">⚠️ Important Information</h3>
          <ul style="margin: 0; padding-left: 20px; color: #92400e;">
            <li style="margin-bottom: 5px;">This is a legally valid digital prescription</li>
            <li style="margin-bottom: 5px;">Please follow the prescribed dosage and instructions</li>
            <li style="margin-bottom: 5px;">Consult your pharmacist or doctor if you have any questions</li>
            <li>Keep this prescription for your medical records</li>
          </ul>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; text-align: center; color: #6b7280; font-size: 11px;">
          <p style="margin: 0 0 5px 0;">Generated on: ${new Date().toLocaleString()}</p>
          <p style="margin: 0 0 5px 0;">TeleMed Healthcare Portal - Secure Digital Health Records</p>
          <p style="margin: 0;">Document ID: ${appointment._id}</p>
        </div>
      </div>
    `
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredAppointments = appointments.filter(appointment => {
    const searchLower = searchTerm.toLowerCase()
    const doctorName = `${appointment.doctor.firstName} ${appointment.doctor.lastName}`.toLowerCase()
    const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`.toLowerCase()
    const medications = appointment.prescription?.medications?.map(med => med.name.toLowerCase()).join(' ') || ''
    
    return doctorName.includes(searchLower) || 
           patientName.includes(searchLower) || 
           medications.includes(searchLower) ||
           appointment.symptoms.toLowerCase().includes(searchLower)
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
      <div>
        <h1 className="text-2xl font-bold text-gray-800">My Med Vault</h1>
        <p className="text-gray-600 mt-1">
          Access and download your digital prescriptions and consultation records
        </p>
      </div>

      {/* Search and Filter */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by doctor, patient, medication, or symptoms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="md:w-48">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field"
            >
              <option value="completed">Completed Consultations</option>
              <option value="all">All Consultations</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="text-blue-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-gray-800">{appointments.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <Pill className="text-green-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Prescriptions</p>
              <p className="text-2xl font-bold text-gray-800">
                {appointments.reduce((total, apt) => total + (apt.prescription?.medications?.length || 0), 0)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <Stethoscope className="text-purple-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Doctors Consulted</p>
              <p className="text-2xl font-bold text-gray-800">
                {new Set(appointments.map(apt => apt.doctor._id)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Records List */}
      {filteredAppointments.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No medical records found</h3>
          <p className="text-gray-600">
            {searchTerm 
              ? 'No records match your search criteria'
              : 'Complete consultations with prescriptions will appear here'
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
                <div className="flex-1">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <FileText className="text-primary-600" size={20} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">
                          Consultation with Dr. {appointment.doctor.firstName} {appointment.doctor.lastName}
                        </h3>
                        <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">
                          {appointment.prescription.medications.length} medication{appointment.prescription.medications.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center">
                          <Calendar className="mr-2" size={16} />
                          <span>{formatDate(appointment.appointmentDate)}</span>
                        </div>
                        <div className="flex items-center">
                          <User className="mr-2" size={16} />
                          <span>{appointment.doctor.specialization}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="mr-2" size={16} />
                          <span>Duration: 30 minutes</span>
                        </div>
                      </div>

                      {/* Medications Preview */}
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <h4 className="font-medium text-gray-800 mb-2">Prescribed Medications:</h4>
                        <div className="space-y-1">
                          {appointment.prescription.medications.slice(0, 3).map((med, idx) => (
                            <div key={idx} className="text-sm text-gray-600">
                              <strong>{med.name}</strong>
                              {med.dosage && ` - ${med.dosage}`}
                              {med.frequency && `, ${med.frequency}`}
                            </div>
                          ))}
                          {appointment.prescription.medications.length > 3 && (
                            <div className="text-sm text-gray-500 italic">
                              +{appointment.prescription.medications.length - 3} more medication{appointment.prescription.medications.length - 3 !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Symptoms */}
                      <div className="text-sm text-gray-600">
                        <strong>Symptoms:</strong> {appointment.symptoms}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ml-4">
                  <button
                    onClick={() => generatePDF(appointment)}
                    disabled={downloadingPdf === appointment._id}
                    className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {downloadingPdf === appointment._id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileDown className="mr-2" size={16} />
                        Download PDF
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MedVault