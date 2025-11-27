import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ModelType } from '../types';

// Initialize the API client
// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    // Thinking config is allowed for 3.0 Pro Preview in this context as per examples,
    // though guidelines mention 2.5 series. We follow the specific Thinking Budget example.
    config = {
      thinkingConfig: { thinkingBudget: 4096 } // Budget for reasoning
    };
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: config
    });

    const endTime = performance.now();
    
    // The GenerateContentResponse object features a text property (not a method).
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