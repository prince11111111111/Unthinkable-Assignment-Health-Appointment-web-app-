import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password, name, phone, role } = req.body;
  try {
    if (role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount >= 1) {
        return res.status(403).json({ error: 'An Admin account already exists. Only one is allowed.' });
      }
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone: phone || null,
        role: role || 'PATIENT'
      }
    });

    if (user.role === 'PATIENT') {
      await prisma.patientProfile.create({ data: { userId: user.id } });
    } else if (user.role === 'DOCTOR') {
      await prisma.doctorProfile.create({
        data: {
          userId: user.id,
          specialization: 'General',
          workingHours: { "monday": ["09:00-17:00"] },
          slotDuration: 30
        }
      });
    }

    res.status(201).json({ message: 'User registered successfully', userId: user.id });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid password' });

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: '24h' }
    );

    res.json({ token, role: user.role, name: user.name, id: user.id });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Fetch current user details
router.get('/me', authMiddleware(), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, phone: true, role: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Update personal information
router.patch('/settings', authMiddleware(), async (req, res) => {
  const { name, email, phone } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name,
        email,
        phone
      },
      select: { id: true, name: true, email: true, phone: true, role: true }
    });
    res.json({ message: 'Settings updated successfully', user });
  } catch (error) {
    console.error('Settings update error:', error);
    if (error.code === 'P2002') return res.status(400).json({ error: 'Email already in use' });
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Delete own account
router.delete('/me', authMiddleware(), async (req, res) => {
  const userId = req.user.id;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { doctorProfile: true, patientProfile: true }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'ADMIN') return res.status(403).json({ error: 'Admins cannot delete their own account this way.' });

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

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
