# System Design Write-up: Healthcare Appointment Manager

## 1. Double-Booking & Simultaneous Booking Prevention
The system leverages the database's ACID properties to handle concurrency safely without relying on a temporary "slot hold" mechanism. By defining a unique constraint `@@unique([doctorId, date])` in the Prisma schema, the PostgreSQL database strictly ensures that no two appointments can share the same doctor and exact timestamp. When two users attempt to book the same slot simultaneously, the application attempts to execute an `INSERT` statement. The transaction that reaches the database first successfully commits. The subsequent transaction encounters a `UniqueConstraintViolation` error (Prisma error code `P2002`). The Express backend catches this specific error and gracefully returns a HTTP 409 Conflict status with the message "This slot has already been booked by someone else", guaranteeing data integrity while providing immediate user feedback.

## 2. Doctor Leave Conflict Handling
When an admin marks a doctor as on leave for a specific date, the system immediately iterates through all `SCHEDULED` appointments falling within that day (`date: { gte: leaveDay, lt: nextDay }`). 
1.  **Database Update:** It updates the status of these appointments to `CANCELLED`.
2.  **Calendar Sync:** It uses the stored `googleEventId` to delete the corresponding events from Google Calendar via the `googleapis` library, ensuring the doctor's calendar reflects the cancellation.
3.  **Notifications:** It triggers an automated email to each affected patient, explicitly stating that the doctor is unavailable and advising them to book a new slot. This proactive approach prevents patients from showing up to cancelled appointments.

## 3. Notification Failure Handling
Notifications (Emails and Calendar syncs) are critical but vulnerable to third-party outages. The current implementation logs a mock email/event if the environment variables (like API keys) are missing, ensuring the main application flow (like booking an appointment) doesn't break due to misconfiguration. For production, the system can integrate BullMQ (a Redis-based message queue) to handle these tasks asynchronously. If a third-party service like SendGrid or Google API fails (e.g., rate limits, temporary downtime), the message queue will automatically retry the job using an exponential backoff strategy, guaranteeing eventual consistency without slowing down the HTTP response to the user.

## 4. Graceful LLM Failure Handling
The system uses Google Gemini for pre-visit and post-visit summaries. AI services can occasionally timeout or fail. To handle this:
-   **Pre-visit Summary:** The call to `generatePreVisitSummary` is wrapped in a `try...catch` block. If the API key is missing or the LLM throws an error, it returns a fallback JSON: `{ urgency: 'Unknown', chiefComplaint: 'Error generating summary', questions: [] }`. The appointment booking proceeds normally, storing the patient's raw symptoms.
-   **Post-visit Summary:** Similarly, if `generatePostVisitSummary` fails, it returns a fallback response. The doctor's raw notes are still saved successfully to the database. This guarantees that the core clinical workflow is never interrupted by an AI service outage.

*Word count: ~450 words.*
