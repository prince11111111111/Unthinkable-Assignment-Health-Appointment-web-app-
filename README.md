# Healthcare Appointment & Follow-up Manager

A full-stack healthcare appointment platform with separate portals for patients, doctors, and admins. It integrates Google Gemini for AI symptom summaries and Google Calendar for event scheduling.

## Tech Stack
*   **Frontend**: React, Vite, Tailwind CSS, React Router
*   **Backend**: Node.js, Express, Prisma ORM
*   **Database**: Neon Serverless PostgreSQL
*   **AI**: Google Gemini API (gemini-1.5-flash)
*   **Emails**: Nodemailer
*   **Calendar**: Google Calendar API (OAuth 2.0)

## Prerequisites
*   Node.js (v18+)
*   Neon Database URL
*   Google Gemini API Key
*   Google Cloud Console credentials (for Calendar API)
*   Gmail App Password (for Nodemailer)

## Setup Guide

### 1. Database Setup (Neon)
1.  Go to [Neon](https://neon.tech/) and create a new project.
2.  Copy the PostgreSQL connection string.

### 2. Backend Setup
1.  Navigate to the `backend` directory: `cd backend`
2.  Install dependencies: `npm install`
3.  Copy `.env.example` to `.env` and fill in the values:
    ```
    PORT=5000
    DATABASE_URL="postgresql://[user]:[password]@[neon-host]/[dbname]?sslmode=require"
    JWT_SECRET="your_secure_random_string"
    GEMINI_API_KEY="your_gemini_api_key"
    EMAIL_USER="your_email@gmail.com"
    EMAIL_PASS="your_gmail_app_password"
    GOOGLE_CLIENT_ID="your_google_client_id"
    GOOGLE_CLIENT_SECRET="your_google_client_secret"
    GOOGLE_REDIRECT_URI="http://localhost:5000/api/calendar/callback"
    GOOGLE_REFRESH_TOKEN="your_google_refresh_token"
    ```
4.  Run Prisma migrations: `npx prisma db push` (or `npx prisma migrate dev`)
5.  Start the backend server: `npm run dev`

### 3. Frontend Setup
1.  Navigate to the `frontend` directory: `cd frontend`
2.  Install dependencies: `npm install`
3.  Start the development server: `npm run dev`

## Google Calendar Setup
1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project and enable the **Google Calendar API**.
3.  Go to **Credentials**, click **Create Credentials**, and select **OAuth client ID**.
4.  Set Application type to **Web application**.
5.  Add `http://localhost:5000/api/calendar/callback` to Authorized redirect URIs.
6.  Copy the `Client ID` and `Client Secret` to your `.env` file.
7.  Use Google OAuth Playground (https://developers.google.com/oauthplayground) to generate a Refresh Token for the Calendar API scope (`https://www.googleapis.com/auth/calendar.events`) and add it to your `.env`.

## Database Schema Highlights
The database uses Prisma. Core models include:
*   **User**: Handles authentication and RBAC (`ADMIN`, `DOCTOR`, `PATIENT`).
*   **DoctorProfile**: Stores specialization, working hours, and leave days.
*   **PatientProfile**: Links user to appointments.
*   **Appointment**: Central model tracking status, symptoms, LLM summaries, doctor notes, and the Google Event ID. It utilizes a `@@unique([doctorId, date])` constraint to prevent double-booking.

## LLM Prompts
*   **Pre-visit Summary**: 
    > Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Format as JSON with keys: urgency, chiefComplaint, questions. Symptoms: <symptoms>
*   **Post-visit Summary**:
    > Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps. Format as JSON with keys: patientFriendlySummary, medicationSchedule (array of strings), followUp. Notes: <notes>

## API Overview
*   `POST /api/auth/register` & `/login` - Authentication
*   `GET /api/patient/doctors` - List doctors
*   `POST /api/patient/book` - Book an appointment (Double-booking protected)
*   `POST /api/doctor/appointments/:id/summary` - Add doctor notes and trigger LLM summary
*   `POST /api/admin/doctors/:id/leave` - Mark doctor on leave and cancel affected appointments
