import express from 'express';
import prisma from '../config/db.js';
import { authMiddleware } from '../middlewares/auth.js';
import { generatePreVisitSummary } from '../config/llm.js';
import { createCalendarEvent, cancelCalendarEvent } from '../config/calendar.js';
import { sendEmail } from '../config/email.js';

const router = express.Router();

// Get all doctors
router.get('/doctors', authMiddleware(['PATIENT']), async (req, res) => {
  try {
    const doctors = await prisma.doctorProfile.findMany({
      include: { user: { select: { name: true, email: true } } }
    });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

// Book appointment
router.post('/book', authMiddleware(['PATIENT']), async (req, res) => {
  const { doctorId, date, symptoms } = req.body;
  const userId = req.user.id;

  try {
    const patientProfile = await prisma.patientProfile.findUnique({ where: { userId } });
    const doctorProfile = await prisma.doctorProfile.findUnique({ 
      where: { id: doctorId },
      include: { user: true }
    });
    
    // Check Leave Days
    const requestedDate = new Date(date);
    const isLeave = doctorProfile.leaveDays.some(leave => 
      leave.getUTCFullYear() === requestedDate.getUTCFullYear() &&
      leave.getUTCMonth() === requestedDate.getUTCMonth() &&
      leave.getUTCDate() === requestedDate.getUTCDate()
    );
    if (isLeave) return res.status(400).json({ error: 'Doctor is on leave on this date. Please select another date.' });

    // AI Pre-visit summary
    const preVisitSummary = await generatePreVisitSummary(symptoms);

    const appointment = await prisma.appointment.create({
      data: {
        patientId: patientProfile.id,
        doctorId,
        date: requestedDate,
        symptoms,
        preVisitSummary
      }
    });

    // Calendar Integration
    const eventId = await createCalendarEvent({
      summary: `Medical Appointment with Dr. ${doctorProfile.user.name}`,
      description: `Symptoms: ${symptoms}`,
      start: requestedDate,
      durationMinutes: doctorProfile.slotDuration,
      attendeeEmail: req.user.email
    });

    if (eventId) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { googleEventId: eventId }
      });
    }

    await sendEmail(
      req.user.email,
      'Appointment Confirmed',
      `Your appointment with Dr. ${doctorProfile.user.name} on ${requestedDate.toLocaleString()} is confirmed.`
    );

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Booking error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'This time slot is already booked.' });
    }
    res.status(500).json({ error: 'Booking failed' });
  }
});

// Get own appointments
router.get('/appointments', authMiddleware(['PATIENT']), async (req, res) => {
  const userId = req.user.id;
  try {
    const patientProfile = await prisma.patientProfile.findUnique({ where: { userId } });
    const appointments = await prisma.appointment.findMany({
      where: { patientId: patientProfile.id },
      include: { doctor: { include: { user: { select: { name: true } } } } },
      orderBy: { date: 'asc' }
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Cancel appointment
router.delete('/appointments/:id', authMiddleware(['PATIENT']), async (req, res) => {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { doctor: { include: { user: true } }, patient: { include: { user: true } } }
    });
    
    if (!appt) return res.status(404).json({ error: 'Not found' });

    await prisma.appointment.update({
      where: { id: appt.id },
      data: { status: 'CANCELLED' }
    });

    if (appt.googleEventId) await cancelCalendarEvent(appt.googleEventId);

    res.json({ message: 'Appointment cancelled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

// Reschedule appointment
router.patch('/appointments/:id', authMiddleware(['PATIENT']), async (req, res) => {
  const { date } = req.body;
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { doctor: { include: { user: true } } }
    });
    
    if (!appt) return res.status(404).json({ error: 'Not found' });

    // Check Leave Days
    const requestedDate = new Date(date);
    const isLeave = appt.doctor.leaveDays.some(leave => 
      leave.getUTCFullYear() === requestedDate.getUTCFullYear() &&
      leave.getUTCMonth() === requestedDate.getUTCMonth() &&
      leave.getUTCDate() === requestedDate.getUTCDate()
    );
    if (isLeave) return res.status(400).json({ error: 'Doctor is on leave on this new date.' });

    await prisma.appointment.update({
      where: { id: appt.id },
      data: { date: requestedDate }
    });

    // We skip regenerating AI and skip modifying google cal in this simplified reschedule 
    // to avoid complex Google Cal update API for now. In a real app we'd update the event.
    
    res.json({ message: 'Appointment rescheduled' });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'This time slot is already booked.' });
    res.status(500).json({ error: 'Failed to reschedule appointment' });
  }
});

export default router;
