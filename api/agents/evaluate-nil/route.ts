import { NextResponse } from 'next/server';
import { runSelfCorrectingAgent } from '@/lib/agents/self-correcting-agent';
import { logAgentExecution } from '@/lib/agents/logger';

export async function POST(req: Request) {
  try {
    const { contractText } = await req.json();
    const prompt = `Analyze the following NIL contract for NCAA and state compliance:\n\n${contractText}`;

    const result = await runSelfCorrectingAgent({ prompt, maxRetries: 3 });

    // Log for governance & audit trail
    await logAgentExecution('NilComplianceAgent', contractText, result, result.iterations, result.success);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}