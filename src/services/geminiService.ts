
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ChatMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export const chatWithGemini = async (history: ChatMessage[], message: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [...history, { role: "user", parts: [{ text: message }] }],
      config: {
        systemInstruction: "You are a helpful assistant for the Wafid Medical Booking system. You help users understand the medical examination process for GCC countries. You can answer questions about required documents, medical center locations, and how to use this booking app. Keep your responses concise and professional."
      }
    });

    return response.text || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw new Error("Failed to get response from AI assistant.");
  }
};
