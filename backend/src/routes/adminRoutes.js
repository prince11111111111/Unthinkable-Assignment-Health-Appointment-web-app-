import express from 'express';
import prisma from '../config/db.js';
import { authMiddleware } from '../middlewares/auth.js';
import { sendEmail } from '../config/email.js';
import { cancelCalendarEvent } from '../config/calendar.js';

const router = express.Router();

router.get('/doctors', authMiddleware(['ADMIN']), async (req, res) => {
  try {
    const doctors = await prisma.doctorProfile.findMany({
      include: { user: { select: { name: true, email: true } } }
    });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

router.post('/doctors/:id/leave', authMiddleware(['ADMIN']), async (req, res) => {
  const doctorProfileId = req.params.id;
  const { leaveDate } = req.body;

  try {
    const leaveDay = new Date(leaveDate);
    
    const doctor = await prisma.doctorProfile.update({
      where: { id: doctorProfileId },
      data: {
        leaveDays: {
          push: leaveDay
        }
      },
      include: { user: true }
    });

    const allAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctorProfileId,
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

// --- USER MANAGEMENT ---

// Get all users
router.get('/users', authMiddleware(['ADMIN']), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update a user
router.patch('/users/:id', authMiddleware(['ADMIN']), async (req, res) => {
  const { name, email, phone, password } = req.body;
  try {
    const updateData = { name, email, phone };
    
    if (password && password.trim() !== '') {
      const bcrypt = await import('bcryptjs');
      updateData.password = await bcrypt.default.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: { id: true, name: true, email: true, phone: true, role: true }
    });
    res.json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete a user (Cascade delete profiles and appointments)
router.delete('/users/:id', authMiddleware(['ADMIN']), async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { doctorProfile: true, patientProfile: true }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'ADMIN') return res.status(403).json({ error: 'Cannot delete Admin accounts' });

    // Use a Prisma transaction to safely delete everything related to the user
    await prisma.$transaction(async (tx) => {
      if (user.role === 'DOCTOR' && user.doctorProfile) {
        await tx.appointment.deleteMany({ where: { doctorId: user.doctorProfile.id } });
        await tx.doctorProfile.delete({ where: { id: user.doctorProfile.id } });
      } else if (user.role === 'PATIENT' && user.patientProfile) {
        await tx.appointment.deleteMany({ where: { patientId: user.patientProfile.id } });
        await tx.patientProfile.delete({ where: { id: user.patientProfile.id } });
      }
      await tx.user.delete({ where: { id: userId } });
    });

    res.json({ message: 'User and all associated data deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// --- APPOINTMENT MANAGEMENT ---

// Get all appointments
router.get('/appointments', authMiddleware(['ADMIN']), async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: {
        patient: { include: { user: { select: { name: true, email: true } } } },
        doctor: { include: { user: { select: { name: true, email: true } } } }
      },
      orderBy: { date: 'desc' }
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Delete/Cancel an appointment
router.delete('/appointments/:id', authMiddleware(['ADMIN']), async (req, res) => {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { patient: { include: { user: true } }, doctor: { include: { user: true } } }
    });

    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    await prisma.appointment.delete({ where: { id: req.params.id } });

    if (appt.googleEventId) {
      await cancelCalendarEvent(appt.googleEventId);
    }

    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

export default router;
