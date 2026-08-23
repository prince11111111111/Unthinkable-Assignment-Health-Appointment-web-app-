import express from 'express';
import prisma from '../config/db.js';
import { authMiddleware } from '../middlewares/auth.js';
import { sendEmail } from '../config/email.js';
import { cancelCalendarEvent } from '../config/calendar.js';

const router = express.Router();

router.post('/doctors/:id/leave', authMiddleware(['ADMIN']), async (req, res) => {
  const doctorProfileId = req.params.id;
  const { leaveDate } = req.body;

  try {
    const leaveDay = new Date(leaveDate);
    
    // Update doctor's leave days
    const doctor = await prisma.doctorProfile.update({
      where: { id: doctorProfileId },
      data: {
        leaveDays: {
          push: leaveDay
        }
      },
      include: { user: true }
    });

    // Find affected appointments
    const nextDay = new Date(leaveDay);
    nextDay.setDate(nextDay.getDate() + 1);

    const affectedAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctorProfileId,
        date: {
          gte: leaveDay,
          lt: nextDay
        },
        status: 'SCHEDULED'
      },
      include: { patient: { include: { user: true } } }
    });

    // Cancel appointments, delete calendar events, send emails
    for (const appt of affectedAppointments) {
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { status: 'CANCELLED' }
      });

      if (appt.googleEventId) {
        await cancelCalendarEvent(appt.googleEventId);
      }

      await sendEmail(
        appt.patient.user.email,
        'Appointment Cancelled',
        `Dear ${appt.patient.user.name}, your appointment with Dr. ${doctor.user.name} on ${appt.date.toLocaleString()} has been cancelled due to doctor unavailability. Please book another slot.`
      );
    }

    res.json({ message: 'Leave marked and affected appointments cancelled', affectedCount: affectedAppointments.length });
  } catch (error) {
    console.error('Leave marking error:', error);
    res.status(500).json({ error: 'Failed to process leave' });
  }
});

export default router;
