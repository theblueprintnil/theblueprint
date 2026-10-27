// lib/agents/logger.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function logAgentExecution(agentName: string, input: string, result: any, iterations: number, success: boolean) {
  await supabase.from('agent_audit_logs').insert({
    agent_name: agentName,
    input_payload: input,
    output_result: result,
    iterations_required: iterations,
    status: success ? 'completed' : 'failed_max_retries',
    created_at: new Date().toISOString(),
  });
}