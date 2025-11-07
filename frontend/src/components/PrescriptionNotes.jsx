import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Plus, Trash2, Save, X } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const PrescriptionNotes = ({ appointmentId, onClose, existingPrescription = null }) => {
  const [prescription, setPrescription] = useState({
    medications: existingPrescription?.medications || [
      { name: '', dosage: '', frequency: '', duration: '', instructions: '' }
    ],
    notes: existingPrescription?.notes || ''
  })
  const [loading, setLoading] = useState(false)

  const addMedication = () => {
    setPrescription(prev => ({
      ...prev,
      medications: [
        ...prev.medications,
        { name: '', dosage: '', frequency: '', duration: '', instructions: '' }
      ]
    }))
  }

  const removeMedication = (index) => {
    setPrescription(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }))
  }

  const updateMedication = (index, field, value) => {
    setPrescription(prev => ({
      ...prev,
      medications: prev.medications.map((med, i) => 
        i === index ? { ...med, [field]: value } : med
      )
    }))
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      
      // Validate that at least one medication has a name
      const validMedications = prescription.medications.filter(med => med.name.trim())
      
      if (validMedications.length === 0 && !prescription.notes.trim()) {
        toast.error('Please add at least one medication or notes')
        return
      }

      await axios.put(`/api/appointments/${appointmentId}/prescription`, {
        prescription: {
          ...prescription,
          medications: validMedications
        }
      })

      toast.success('Prescription saved successfully!')
      onClose()
    } catch (error) {
      console.error('Failed to save prescription:', error)
      toast.error('Failed to save prescription')
    } finally {
      setLoading(false)
    }
  }

  const frequencyOptions = [
    'Once daily',
    'Twice daily',
    'Three times daily',
    'Four times daily',
    'Every 4 hours',
    'Every 6 hours',
    'Every 8 hours',
    'Every 12 hours',
    'As needed',
    'Before meals',
    'After meals',
    'At bedtime'
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <FileText className="text-primary-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Digital Prescription</h2>
              <p className="text-sm text-gray-600">Add medications and consultation notes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          <div className="space-y-6">
            {/* Medications Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-800">Medications</h3>
                <button
                  onClick={addMedication}
                  className="btn-primary flex items-center text-sm"
                >
                  <Plus className="mr-1" size={16} />
                  Add Medication
                </button>
              </div>

              <div className="space-y-4">
                {prescription.medications.map((medication, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">
                        Medication {index + 1}
                      </span>
                      {prescription.medications.length > 1 && (
                        <button
                          onClick={() => removeMedication(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Medication Name *
                        </label>
                        <input
                          type="text"
                          value={medication.name}
                          onChange={(e) => updateMedication(index, 'name', e.target.value)}
                          className="input-field"
                          placeholder="e.g., Amoxicillin"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Dosage
                        </label>
                        <input
                          type="text"
                          value={medication.dosage}
                          onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                          className="input-field"
                          placeholder="e.g., 500mg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Frequency
                        </label>
                        <select
                          value={medication.frequency}
                          onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                          className="input-field"
                        >
                          <option value="">Select frequency</option>
                          {frequencyOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Duration
                        </label>
                        <input
                          type="text"
                          value={medication.duration}
                          onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                          className="input-field"
                          placeholder="e.g., 7 days"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Special Instructions
                        </label>
                        <input
                          type="text"
                          value={medication.instructions}
                          onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                          className="input-field"
                          placeholder="e.g., Take with food, Avoid alcohol"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* General Notes Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">Consultation Notes</h3>
              <textarea
                value={prescription.notes}
                onChange={(e) => setPrescription(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                className="input-field"
                placeholder="Add any additional notes, recommendations, or follow-up instructions..."
              />
            </div>

            {/* Disclaimer */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> This digital prescription is legally valid. 
                Please ensure all medication details are accurate before saving. 
                Patients should follow the prescribed dosage and consult their pharmacist if they have any questions.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Save className="mr-2" size={16} />
            {loading ? 'Saving...' : 'Save Prescription'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default PrescriptionNotes