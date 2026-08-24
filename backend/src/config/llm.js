import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

export const generatePreVisitSummary = async (symptoms) => {
  if (!genAI) {
    return { urgency: 'Unknown', chiefComplaint: 'API Key missing', questions: ['Please provide more details.'] };
  }
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Format as JSON with keys: urgency, chiefComplaint, questions. Symptoms: ${symptoms}`;
    
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("No JSON found in response");
  } catch (error) {
    console.error("LLM Error pre-visit:", error);
    return { urgency: 'Unknown', chiefComplaint: 'Error generating summary', questions: [] };
  }
};

export const generatePostVisitSummary = async (notes, prescription) => {
  if (!genAI) {
    return { patientFriendlySummary: 'API Key missing', medicationSchedule: [], followUp: '' };
  }
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Convert these clinical notes and prescription into a patient-friendly summary with medication schedule and follow-up steps. Format as JSON with keys: patientFriendlySummary, medicationSchedule (array of strings), followUp. Notes: ${notes} Prescription: ${prescription}`;
    
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("No JSON found in response");
  } catch (error) {
    console.error("LLM Error post-visit:", error);
    return { patientFriendlySummary: 'Error generating summary', medicationSchedule: [], followUp: '' };
  }
};
