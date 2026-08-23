import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password, name, role } = req.body;
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'PATIENT' // Default to PATIENT if not provided
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

export default router;
