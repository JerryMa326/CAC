import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

let genAI: GoogleGenerativeAI | null = null;

export function initializeGemini(apiKey?: string) {
  const key = apiKey || API_KEY;
  if (!key) {
    console.warn('⚠️ No Gemini API key provided');
    return;
  }
  genAI = new GoogleGenerativeAI(key);
}

export interface IdeologyAnalysis {
  economic: string; // e.g., "Libertarian", "Socialist", "Centrist"
  social: string; // e.g., "Progressive", "Conservative", "Moderate"
  summary: string;
}

export async function analyzeIdeology(
  name: string,
  party: string,
  bioSummary?: string
): Promise<IdeologyAnalysis | null> {
  if (!genAI) {
    initializeGemini();
    if (!genAI) {
      throw new Error('Gemini API not initialized. Please provide an API key.');
    }
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `Analyze the political ideology of ${name} (${party}).
${bioSummary ? `Biography: ${bioSummary}` : ''}

Provide a concise analysis in the following JSON format:
{
  "economic": "one of: Libertarian, Free Market Conservative, Centrist, Social Democrat, Democratic Socialist, Socialist",
  "social": "one of: Progressive, Liberal, Moderate, Conservative, Social Conservative, Traditionalist",
  "summary": "2-3 sentence summary of their overall ideology and key positions"
}

Return ONLY valid JSON, no markdown or extra text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse ideology analysis');
    }

    const analysis: IdeologyAnalysis = JSON.parse(jsonMatch[0]);
    return analysis;
  } catch (error) {
    console.error('❌ Error analyzing ideology:', error);
    return null;
  }
}
