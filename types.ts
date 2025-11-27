export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  tags: string[];
  category: string; // Changed from strict union to string to allow custom categories
}

export interface Variable {
  name: string;
  value: string;
}

export interface OptimizationResult {
  original: string;
  optimized: string;
  reasoning: string;
}

export interface GenerationResult {
  text: string;
  model: string;
  duration: number;
  tokens?: number;
}

export enum ModelType {
  FLASH = 'gemini-2.5-flash',
  PRO = 'gemini-3-pro-preview',
  THINKING_PRO = 'gemini-3-pro-preview-thinking',
}