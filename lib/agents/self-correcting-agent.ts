// lib/agents/self-correcting-agent.ts
import { GoogleGenAI, Type } from '@google/genai';
import { NilComplianceSchema, NilComplianceResult } from '@/types/agent-validation';

const ai = new GoogleGenAI();

interface AgentRunOptions {
  prompt: string;
  maxRetries?: number;
}

export async function runSelfCorrectingAgent({
  prompt,
  maxRetries = 3,
}: AgentRunOptions): Promise<{ success: boolean; data?: NilComplianceResult; error?: string; iterations: number }> {
  let attempt = 0;
  let currentPrompt = prompt;
  let validationErrors: string[] = [];

  while (attempt < maxRetries) {
    attempt++;

    try {
      // 1. Generate response from Gemini with Structured Outputs
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [
          {
            role: 'user',
            parts: [
              { text: currentPrompt },
              ...(validationErrors.length > 0
                ? [{ text: `\n\nPREVIOUS ATTEMPT FAILED VALIDATION. Fix these errors:\n- ${validationErrors.join('\n- ')}` }]
                : []),
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isCompliant: { type: Type.BOOLEAN },
              riskScore: { type: Type.NUMBER },
              violations: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendedModifications: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['isCompliant', 'riskScore', 'violations', 'recommendedModifications'],
          },
        },
      });

      const rawText = response.text();
      if (!rawText) throw new Error('Empty response from model');

      const parsedData = JSON.parse(rawText);

      // 2. Validate against Zod schema and business logic rules
      const validationResult = NilComplianceSchema.safeParse(parsedData);

      if (validationResult.success) {
        // Additional custom business logic check (e.g., threshold rules)
        if (validationResult.data.riskScore > 80 && validationResult.data.isCompliant) {
          validationErrors = ['Risk score is too high (>80) to mark as fully compliant without manual review.'];
          continue;
        }

        return {
          success: true,
          data: validationResult.data,
          iterations: attempt,
        };
      } else {
        validationErrors = validationResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      }
    } catch (err: any) {
      validationErrors = [err.message || 'Unknown execution error'];
    }
  }

  return {
    success: false,
    error: `Agent failed to pass validation after ${maxRetries} attempts. Last errors: ${validationErrors.join(', ')}`,
    iterations: attempt,
  };
}