import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './src/routes/authRoutes.js';
import patientRoutes from './src/routes/patientRoutes.js';
import doctorRoutes from './src/routes/doctorRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import './src/jobs/reminders.js'; // Initialize cron jobs

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
