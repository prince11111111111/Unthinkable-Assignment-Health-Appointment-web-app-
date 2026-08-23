import express from 'express';
import prisma from '../config/db.js';
import { authMiddleware } from '../middlewares/auth.js';
import { generatePostVisitSummary } from '../config/llm.js';
import { sendEmail } from '../config/email.js';

const router = express.Router();

router.get('/appointments', authMiddleware(['DOCTOR']), async (req, res) => {
  try {
    const doctorProfile = await prisma.doctorProfile.findUnique({ where: { userId: req.user.id } });
    const appointments = await prisma.appointment.findMany({
      where: { doctorId: doctorProfile.id },
      include: { patient: { include: { user: { select: { name: true, email: true } } } } }
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

router.post('/appointments/:id/summary', authMiddleware(['DOCTOR']), async (req, res) => {
  const { notes, prescription } = req.body;
  const appointmentId = req.params.id;

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: { include: { user: true } }, doctor: { include: { user: true } } }
    });

    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    const postVisitSummary = await generatePostVisitSummary(notes);

    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        doctorNotes: notes,
        prescription,
        postVisitSummary,
        status: 'COMPLETED'
      }
    });

    // Send summary to patient
    await sendEmail(
      appointment.patient.user.email,
      `Post-Visit Summary from Dr. ${appointment.doctor.user.name}`,
      `Hello ${appointment.patient.user.name},\n\nSummary: ${postVisitSummary.patientFriendlySummary}\n\nPrescription: ${prescription}\n\nFollow-up: ${postVisitSummary.followUp}`
    );

    res.json({ message: 'Summary added and emailed successfully', updatedAppointment });
  } catch (error) {
    console.error('Post-visit error:', error);
    res.status(500).json({ error: 'Failed to add summary' });
  }
});

export default router;
