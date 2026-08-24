# MediCare - AI-Powered Medical Appointment System

A full-stack, AI-powered medical appointment booking system built with React, Node.js, Express, Prisma, and PostgreSQL. It features three distinct user roles (Patient, Doctor, Admin) and integrates Google Calendar, Email Notifications, and Google Gemini AI for smart clinical summaries.

## Features

### 1. Multi-Role Dashboards
* **Patients:** Can browse doctors, book appointments, reschedule, cancel, and view AI-generated follow-up plans.
* **Doctors:** Can view their schedule, book on behalf of patients, complete visits to generate AI summaries, and mark leave days (which automatically cancels existing appointments).
* **Admins:** Can manage all users (Doctors/Patients) and appointments, search records in real-time, and securely update profiles.

### 2. Google Gemini AI Integration
* **Pre-Visit Analysis:** Automatically analyzes patient symptoms during booking to determine urgency, identify the chief complaint, and suggest questions for the doctor.
* **Post-Visit Summaries:** Converts doctor's clinical shorthand notes and prescriptions into patient-friendly follow-up plans and medication schedules.

### 3. Google Calendar & Email Automations
* **Automated Invites:** Automatically creates Google Calendar events when an appointment is booked and invites the patient.
* **Automated Cancellations:** Instantly removes Google Calendar events and sends email notifications when an appointment is cancelled or a doctor marks a leave day.
* **Email Summaries:** Emails the patient their AI-generated Post-Visit Summary immediately after the doctor completes the visit.

## Tech Stack
* **Frontend:** React, Vite, Tailwind CSS, React Router
* **Backend:** Node.js, Express, Prisma ORM, PostgreSQL (Neon)
* **Integrations:** Google Generative AI (Gemini), Google Calendar API, Nodemailer

## Setup Instructions

### 1. Prerequisites
* Node.js installed
* A PostgreSQL database (e.g., Neon.tech)
* Google Gemini API Key
* Google Cloud Console App (for Calendar API credentials)
* Gmail App Password (for Nodemailer)

### 2. Backend Setup
1. Navigate to the `backend` directory: `cd backend`
2. Install dependencies: `npm install`
3. Create a `.env` file based on `.env.example` and fill in your credentials.
4. Push the Prisma schema to your database: `npx prisma db push`
5. Start the server: `npm run dev`

### 3. Frontend Setup
1. Navigate to the `frontend` directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev`

## Security Notes
* **Cascading Deletes:** Deleting a user (via Admin or self-deletion in Settings) safely cleans up all associated profiles and appointments.
* **Single Admin Rule:** The system is strictly locked to a single Admin account to prevent privilege escalation.
* **Timezone Safety:** Leave days are strictly enforced using UTC day-matching to prevent timezone drift bugs when booking.
