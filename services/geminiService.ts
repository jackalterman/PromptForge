import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { ModelType } from '../types';

// Initialize the API client
// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Creates a new chat session with the specified model.
 */
export const createChatSession = (modelType: ModelType): Chat => {
  let modelName = 'gemini-2.5-flash';
  let config: any = undefined;

  if (modelType === ModelType.PRO) {
    modelName = 'gemini-3-pro-preview';
  } else if (modelType === ModelType.THINKING_PRO) {
    modelName = 'gemini-3-pro-preview';
    config = {
      thinkingConfig: { thinkingBudget: 4096 } // Budget for reasoning
    };
  }

  return ai.chats.create({
    model: modelName,
    config: config
  });
};

/**
 * Sends a message to an existing chat session.
 */
export const sendChatMessage = async (
  chat: Chat, 
  message: string
): Promise<{ text: string; duration: number }> => {
  const startTime = performance.now();
  
  try {
    // strict adherence: sendMessage only accepts { message: string } or string? 
    // The SDK types say sendMessage(message: string | ...).
    // Based on guidelines: chat.sendMessage({ message: "..." }) is correct.
    const response: GenerateContentResponse = await chat.sendMessage({ 
      message: message 
    });

    const endTime = performance.now();
    const text = response.text || "No text generated.";

    return {
      text,
      duration: endTime - startTime
    };
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    throw new Error(error.message || "Failed to send message.");
  }
};

/**
 * Legacy single-shot generation (kept for optimization or simple tasks if needed)
 */
export const generateCompletion = async (
  prompt: string,
  modelType: ModelType
): Promise<{ text: string; duration: number }> => {
  const startTime = performance.now();
  let modelName = 'gemini-2.5-flash';
  let config: any = undefined;

  if (modelType === ModelType.PRO) {
    modelName = 'gemini-3-pro-preview';
  } else if (modelType === ModelType.THINKING_PRO) {
    modelName = 'gemini-3-pro-preview';
    config = {
      thinkingConfig: { thinkingBudget: 4096 }
    };
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: config
    });

    const endTime = performance.now();
    const text = response.text || "No text generated.";

    return {
      text,
      duration: endTime - startTime
    };
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    throw new Error(error.message || "Failed to generate content.");
  }
};

export const optimizePrompt = async (currentPrompt: string): Promise<string> => {
  const metaPrompt = `
    You are an Expert Prompt Engineer. Your goal is to optimize the following prompt for an LLM to ensure better clarity, adherence to constraints, and higher quality output.
    
    ORIGINAL PROMPT:
    "${currentPrompt}"
    
    INSTRUCTIONS:
    1. Analyze the original prompt's intent.
    2. Identify ambiguities or weak instructions.
    3. Rewrite the prompt using best practices (Chain of Thought, clear delimiters, role definition, etc.).
    4. Maintain any variables (like {{variable}}) present in the original.
    5. Return ONLY the optimized prompt text. Do not add conversational filler.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: metaPrompt,
    });

    return response.text?.trim() || currentPrompt;
  } catch (error) {
    console.error("Optimization Error:", error);
    throw error;
  }
};