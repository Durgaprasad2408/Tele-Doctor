import cron from 'node-cron';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';

// Check for appointments that are 1 hour away and send reminders
const checkUpcomingAppointments = async () => {
  try {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const fiftyMinutesFromNow = new Date(now.getTime() + 50 * 60 * 1000);

    // Find appointments between 50-60 minutes from now that are confirmed
    const upcomingAppointments = await Appointment.find({
      appointmentDate: {
        $gte: fiftyMinutesFromNow,
        $lte: oneHourFromNow
      },
      status: 'confirmed',
      reminderSent: { $ne: true }
    }).populate(['patient', 'doctor']);

    console.log(`📅 Found ${upcomingAppointments.length} appointments needing reminders`);

    for (const appointment of upcomingAppointments) {
      try {
        // Mark reminder as sent (no email functionality)
        appointment.reminderSent = true;
        await appointment.save();

        console.log(`✅ Reminder marked as sent for appointment ${appointment._id}`);
      } catch (error) {
        console.error(`❌ Failed to mark reminder for appointment ${appointment._id}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Error checking upcoming appointments:', error);
  }
};

// Schedule the task to run every 10 minutes
export const startAppointmentScheduler = () => {
  console.log('🚀 Starting appointment reminder scheduler...');
  
  // Run every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    console.log('⏰ Running appointment reminder check...');
    await checkUpcomingAppointments();
  });
  
  console.log('✅ Appointment reminder scheduler started - checking every 10 minutes');
};

// Manual trigger for testing
export const triggerReminderCheck = async () => {
  console.log('🔧 Manually triggering reminder check...');
  await checkUpcomingAppointments();
};
