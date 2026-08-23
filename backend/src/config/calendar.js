import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

if (process.env.GOOGLE_REFRESH_TOKEN) {
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
}

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

export const createCalendarEvent = async (appointmentDetails) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    console.log('[Mock Calendar] Event created:', appointmentDetails.summary);
    return 'mock-event-id';
  }
  try {
    const event = {
      summary: appointmentDetails.summary,
      description: appointmentDetails.description,
      start: { dateTime: appointmentDetails.startTime, timeZone: 'UTC' },
      end: { dateTime: appointmentDetails.endTime, timeZone: 'UTC' },
    };
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });
    return response.data.id;
  } catch (error) {
    console.error('Calendar Event Creation Failed:', error);
    return null;
  }
};

export const cancelCalendarEvent = async (eventId) => {
  if (!process.env.GOOGLE_CLIENT_ID || eventId === 'mock-event-id') {
    console.log('[Mock Calendar] Event cancelled:', eventId);
    return;
  }
  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });
  } catch (error) {
    console.error('Calendar Event Deletion Failed:', error);
  }
};
