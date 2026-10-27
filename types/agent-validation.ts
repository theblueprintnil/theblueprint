// types/agent-validation.ts
import { z } from 'zod';

export const NilComplianceSchema = z.object({
  isCompliant: z.boolean(),
  riskScore: z.number().min(0).max(100),
  violations: z.array(z.string()),
  recommendedModifications: z.array(z.string()),
});

export type NilComplianceResult = z.infer<typeof NilComplianceSchema>;
