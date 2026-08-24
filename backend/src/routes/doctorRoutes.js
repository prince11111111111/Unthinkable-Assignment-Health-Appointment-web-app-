import express from 'express';
import prisma from '../config/db.js';
import { authMiddleware } from '../middlewares/auth.js';
import { generatePostVisitSummary, generatePreVisitSummary } from '../config/llm.js';
import { sendEmail } from '../config/email.js';
import { createCalendarEvent, cancelCalendarEvent } from '../config/calendar.js';

const router = express.Router();

// Get own appointments
router.get('/appointments', authMiddleware(['DOCTOR']), async (req, res) => {
  const userId = req.user.id;
  try {
    const doctorProfile = await prisma.doctorProfile.findUnique({ where: { userId } });
    const appointments = await prisma.appointment.findMany({
      where: { doctorId: doctorProfile.id },
      include: { patient: { include: { user: { select: { name: true, email: true } } } } },
      orderBy: { date: 'asc' }
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Complete visit and submit summary
router.post('/appointments/:id/summary', authMiddleware(['DOCTOR']), async (req, res) => {
  const { notes, prescription } = req.body;
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { patient: { include: { user: true } } }
    });

    if (!appt) return res.status(404).json({ error: 'Not found' });

    const postVisitSummary = await generatePostVisitSummary(notes, prescription);

    const updatedAppt = await prisma.appointment.update({
      where: { id: appt.id },
      data: {
        status: 'COMPLETED',
        doctorNotes: notes,
        prescription,
        postVisitSummary
      }
    });

    await sendEmail(
      appt.patient.user.email,
      'Your Post-Visit Summary',
      `Dear ${appt.patient.user.name},\n\nHere is your summary:\n${postVisitSummary.patientFriendlySummary}\n\nFollow-up: ${postVisitSummary.followUp}`
    );

    res.json(updatedAppt);
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ error: 'Failed to submit summary' });
  }
});

// --- NEW DOCTOR CAPABILITIES ---

// Get all patients
router.get('/patients', authMiddleware(['DOCTOR']), async (req, res) => {
  try {
    const patients = await prisma.patientProfile.findMany({
      include: { user: { select: { name: true, email: true } } }
    });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// Book on behalf of patient
router.post('/appointments', authMiddleware(['DOCTOR']), async (req, res) => {
  const { patientId, date, symptoms } = req.body;
  const userId = req.user.id;

  try {
    const doctorProfile = await prisma.doctorProfile.findUnique({ 
      where: { userId },
      include: { user: true }
    });
    
    const patientProfile = await prisma.patientProfile.findUnique({ 
      where: { id: patientId },
      include: { user: true }
    });

    const requestedDate = new Date(date);
    const isLeave = doctorProfile.leaveDays.some(leave => 
      leave.getUTCFullYear() === requestedDate.getUTCFullYear() &&
      leave.getUTCMonth() === requestedDate.getUTCMonth() &&
      leave.getUTCDate() === requestedDate.getUTCDate()
    );
    if (isLeave) return res.status(400).json({ error: 'You are on leave on this date.' });

    const preVisitSummary = await generatePreVisitSummary(symptoms);

    const appointment = await prisma.appointment.create({
      data: {
        patientId: patientProfile.id,
        doctorId: doctorProfile.id,
        date: requestedDate,
        symptoms,
        preVisitSummary
      }
    });

    const eventId = await createCalendarEvent({
      summary: `Medical Appointment with Dr. ${doctorProfile.user.name}`,
      description: `Symptoms: ${symptoms}`,
      start: requestedDate,
      durationMinutes: doctorProfile.slotDuration,
      attendeeEmail: patientProfile.user.email
    });

    if (eventId) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { googleEventId: eventId }
      });
    }

    await sendEmail(
      patientProfile.user.email,
      'Appointment Confirmed by Doctor',
      `Dr. ${doctorProfile.user.name} has scheduled an appointment for you on ${requestedDate.toLocaleString()}.`
    );

    res.status(201).json(appointment);
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'This time slot is already booked.' });
    res.status(500).json({ error: 'Booking failed' });
  }
});

// Cancel appointment
router.delete('/appointments/:id', authMiddleware(['DOCTOR']), async (req, res) => {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { patient: { include: { user: true } } }
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
router.patch('/appointments/:id', authMiddleware(['DOCTOR']), async (req, res) => {
  const { date } = req.body;
  try {
    const userId = req.user.id;
    const doctorProfile = await prisma.doctorProfile.findUnique({ where: { userId } });
    
    const requestedDate = new Date(date);
    const isLeave = doctorProfile.leaveDays.some(leave => 
      leave.getUTCFullYear() === requestedDate.getUTCFullYear() &&
      leave.getUTCMonth() === requestedDate.getUTCMonth() &&
      leave.getUTCDate() === requestedDate.getUTCDate()
    );
    if (isLeave) return res.status(400).json({ error: 'You are on leave on this new date.' });

    await prisma.appointment.update({
      where: { id: req.params.id },
      data: { date: requestedDate }
    });
    
    res.json({ message: 'Appointment rescheduled' });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'This time slot is already booked.' });
    res.status(500).json({ error: 'Failed to reschedule appointment' });
  }
});

// Mark Leave
router.post('/leave', authMiddleware(['DOCTOR']), async (req, res) => {
  const { leaveDate } = req.body;
  try {
    const userId = req.user.id;
    const doctorProfile = await prisma.doctorProfile.findUnique({ 
      where: { userId },
      include: { user: true }
    });

    const leaveDay = new Date(leaveDate);
    
    await prisma.doctorProfile.update({
      where: { id: doctorProfile.id },
      data: {
        leaveDays: {
          push: leaveDay
        }
      }
    });

    const allAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctorProfile.id,
        status: 'SCHEDULED'
      },
      include: { patient: { include: { user: true } } }
    });

    const affectedAppointments = allAppointments.filter(appt => {
      const d = new Date(appt.date);
      return d.getFullYear() === leaveDay.getFullYear() &&
             d.getMonth() === leaveDay.getMonth() &&
             d.getDate() === leaveDay.getDate();
    });

    for (const appt of affectedAppointments) {
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { status: 'CANCELLED' }
      });

      if (appt.googleEventId) await cancelCalendarEvent(appt.googleEventId);

      await sendEmail(
        appt.patient.user.email,
        'Appointment Cancelled',
        `Dear ${appt.patient.user.name}, your appointment with Dr. ${doctorProfile.user.name} on ${appt.date.toLocaleString()} has been cancelled because the doctor is on leave. Please book another slot.`
      );
    }

    res.json({ message: 'Leave marked and affected appointments cancelled', affectedCount: affectedAppointments.length });
  } catch (error) {
    console.error('Leave marking error:', error);
    res.status(500).json({ error: 'Failed to process leave' });
  }
});

export default router;
