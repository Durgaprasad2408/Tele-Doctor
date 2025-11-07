import express from 'express';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import DoctorLeave from '../models/DoctorLeave.js';

const router = express.Router();

// Get available time slots for a doctor on a specific date
router.get('/doctor/:doctorId/date/:date', async (req, res) => {
  try {
    const { doctorId, date } = req.params;
    const requestedDate = new Date(date);
    
    console.log(`🔍 Checking availability for doctor ${doctorId} on ${date}`);

    // Verify doctor exists
    const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Check if doctor is on leave
    const leaveOnDate = await DoctorLeave.findOne({
      doctor: doctorId,
      status: 'approved',
      startDate: { $lte: requestedDate },
      endDate: { $gte: requestedDate }
    });

    if (leaveOnDate) {
      console.log(`❌ Doctor is on leave: ${leaveOnDate.type}`);
      return res.json({
        available: false,
        reason: 'Doctor is on leave',
        leaveType: leaveOnDate.type,
        timeSlots: []
      });
    }

    // Check if the date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    requestedDate.setHours(0, 0, 0, 0);
    
    if (requestedDate < today) {
      return res.json({
        available: false,
        reason: 'Date is in the past',
        timeSlots: []
      });
    }

    // Get existing appointments for this doctor on this date
    const startOfDay = new Date(requestedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(requestedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await Appointment.find({
      doctor: doctorId,
      appointmentDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $in: ['pending', 'confirmed'] }
    });

    console.log(`📋 Found ${existingAppointments.length} existing appointments`);

    // Generate all possible time slots (9 AM to 5 PM, 30-minute intervals)
    const allTimeSlots = [];
    for (let hour = 9; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeSlot = new Date(requestedDate);
        timeSlot.setHours(hour, minute, 0, 0);
        allTimeSlots.push(timeSlot);
      }
    }

    // Filter out booked time slots
    const bookedTimes = existingAppointments.map(apt => 
      new Date(apt.appointmentDate).getTime()
    );

    const availableTimeSlots = allTimeSlots.filter(slot => {
      const slotTime = slot.getTime();
      
      // Check if this exact time is booked
      if (bookedTimes.includes(slotTime)) {
        return false;
      }

      // If it's today, only show future time slots
      if (requestedDate.getTime() === today.getTime()) {
        const now = new Date();
        return slot > now;
      }

      return true;
    });

    console.log(`✅ Found ${availableTimeSlots.length} available time slots`);

    // Format time slots for response
    const formattedTimeSlots = availableTimeSlots.map(slot => ({
      time: slot.toTimeString().slice(0, 5), // HH:MM format
      datetime: slot.toISOString(),
      display: slot.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
    }));

    res.json({
      available: true,
      timeSlots: formattedTimeSlots,
      totalSlots: formattedTimeSlots.length
    });

  } catch (error) {
    console.error('❌ Error checking availability:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get available doctors for a specific date (excludes doctors on leave)
router.get('/doctors/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { specialization } = req.query;
    const requestedDate = new Date(date);
    
    console.log(`🔍 Finding available doctors for ${date}`);

    // Get all doctors
    const query = { role: 'doctor', isActive: true };
    if (specialization) {
      query.specialization = new RegExp(specialization, 'i');
    }

    const allDoctors = await User.find(query).select('-password');

    // Get doctors who are on leave on this date
    const doctorsOnLeave = await DoctorLeave.find({
      status: 'approved',
      startDate: { $lte: requestedDate },
      endDate: { $gte: requestedDate }
    }).distinct('doctor');

    console.log(`❌ ${doctorsOnLeave.length} doctors are on leave`);

    // Filter out doctors who are on leave
    const availableDoctors = allDoctors.filter(doctor => 
      !doctorsOnLeave.some(leaveDoctor => 
        leaveDoctor.toString() === doctor._id.toString()
      )
    );

    console.log(`✅ ${availableDoctors.length} doctors are available`);

    res.json({
      doctors: availableDoctors,
      totalAvailable: availableDoctors.length,
      totalOnLeave: doctorsOnLeave.length
    });

  } catch (error) {
    console.error('❌ Error finding available doctors:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;