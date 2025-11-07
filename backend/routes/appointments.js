import express from 'express';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import { requireRole } from '../middleware/auth.js';
import { createNotification, getNotificationTemplate } from '../services/notificationService.js';

const router = express.Router();

// Create appointment (patients only)
router.post('/', requireRole(['patient']), async (req, res) => {
  try {
    const { doctorId, appointmentDate, symptoms } = req.body;

    console.log('📅 Creating new appointment:', {
      patient: req.user._id,
      doctor: doctorId,
      appointmentDate,
      symptoms
    });

    // Verify doctor exists
    const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Check if appointment slot is available
    const existingAppointment = await Appointment.findOne({
      doctor: doctorId,
      appointmentDate: new Date(appointmentDate),
      status: { $in: ['pending', 'confirmed'] }
    });

    if (existingAppointment) {
      return res.status(400).json({ message: 'This time slot is not available' });
    }

    const appointment = new Appointment({
      patient: req.user._id,
      doctor: doctorId,
      appointmentDate: new Date(appointmentDate),
      symptoms,
      consultationFee: doctor.consultationFee
    });

    await appointment.save();
    await appointment.populate(['patient', 'doctor']);

    console.log('✅ Appointment created successfully:', appointment._id);

    // Create notification for doctor (no email functionality)
    const formattedDate = new Date(appointmentDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const template = getNotificationTemplate('appointment_request', {
      patientName: `${req.user.firstName} ${req.user.lastName}`,
      appointmentDate: formattedDate
    });

    await createNotification({
      recipient: doctorId,
      sender: req.user._id,
      type: 'appointment_request',
      title: template.title,
      message: template.message,
      data: { appointmentId: appointment._id },
      sendEmail: false
    });

    console.log('✅ Notification created for doctor');

    res.status(201).json(appointment);
  } catch (error) {
    console.error('❌ Appointment creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's appointments
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (req.user.role === 'patient') {
      query.patient = req.user._id;
    } else {
      query.doctor = req.user._id;
    }

    if (status) {
      query.status = status;
    }

    const appointments = await Appointment.find(query)
      .populate('patient', 'firstName lastName email phone')
      .populate('doctor', 'firstName lastName specialization')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ appointmentDate: -1 });

    const total = await Appointment.countDocuments(query);

    res.json({
      appointments,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update appointment status (doctors only)
router.put('/:id/status', requireRole(['doctor']), async (req, res) => {
  try {
    const { status } = req.body;
    
    console.log(`📋 Doctor updating appointment ${req.params.id} status to: ${status}`);
    
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, doctor: req.user._id },
      { status },
      { new: true }
    ).populate(['patient', 'doctor']);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    console.log('✅ Appointment status updated successfully');

    // Create notification for patient (no email functionality)
    const formattedDate = appointment.appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    if (status === 'confirmed') {
      // Create notification
      const template = getNotificationTemplate('appointment_confirmed', {
        doctorName: `${req.user.firstName} ${req.user.lastName}`,
        appointmentDate: formattedDate
      });

      await createNotification({
        recipient: appointment.patient._id,
        sender: req.user._id,
        type: 'appointment_confirmed',
        title: template.title,
        message: template.message,
        data: { appointmentId: appointment._id },
        sendEmail: false
      });

      console.log('✅ Confirmation notification sent to patient');
    } else if (status === 'cancelled') {
      // Create notification for cancellation
      const template = getNotificationTemplate('appointment_cancelled', {
        appointmentDate: formattedDate
      });

      await createNotification({
        recipient: appointment.patient._id,
        sender: req.user._id,
        type: 'appointment_cancelled',
        title: template.title,
        message: template.message,
        data: { appointmentId: appointment._id },
        sendEmail: false
      });

      console.log('✅ Cancellation notification sent to patient');
    }

    res.json(appointment);
  } catch (error) {
    console.error('❌ Error updating appointment status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add prescription (doctors only)
router.put('/:id/prescription', requireRole(['doctor']), async (req, res) => {
  try {
    const { prescription } = req.body;
    
    console.log(`💊 Doctor adding prescription to appointment ${req.params.id}`);
    
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, doctor: req.user._id },
      { prescription, status: 'completed' },
      { new: true }
    ).populate(['patient', 'doctor']);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    console.log('✅ Prescription added successfully');

    // Create in-app notifications (no email functionality)
    const prescriptionTemplate = getNotificationTemplate('prescription_added', {
      doctorName: `${req.user.firstName} ${req.user.lastName}`
    });

    await createNotification({
      recipient: appointment.patient._id,
      sender: req.user._id,
      type: 'prescription_added',
      title: prescriptionTemplate.title,
      message: prescriptionTemplate.message,
      data: { appointmentId: appointment._id },
      sendEmail: false
    });

    const completedTemplate = getNotificationTemplate('appointment_completed', {});

    await createNotification({
      recipient: appointment.patient._id,
      sender: req.user._id,
      type: 'appointment_completed',
      title: completedTemplate.title,
      message: completedTemplate.message,
      data: { appointmentId: appointment._id },
      sendEmail: false
    });

    console.log('✅ Consultation completion notifications sent');

    res.json(appointment);
  } catch (error) {
    console.error('❌ Error adding prescription:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;