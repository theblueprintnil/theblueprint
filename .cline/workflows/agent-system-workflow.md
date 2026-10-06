# Agent System Workflow

Pipeline order is defined by the catalog and `api/workflow_config.json`.

## Pipeline

1. **Brand Intake Assistant** (`brand-intake-assistant`) — Collect the minimum information needed to build an athlete brand profile.
2. **Content Strategist** (`content-strategist`) — Generate content ideas and draft assets aligned to an athlete brand profile.
3. **Campaign Manager** (`campaign-manager`) — Create a structured campaign plan for an athlete sponsorship or content campaign.
4. **Content Compliance Reviewer** (`content-compliance-reviewer`) — Review a draft against campaign requirements and brand rules.
5. **Publishing Assistant** (`publishing-assistant`) — Prepare approved content for publishing.
6. **Sponsor CRM Assistant** (`sponsor-crm-assistant`) — Help manage sponsor leads and brand relationships.
7. **NIL Performance Analyst** (`nil-performance-analyst`) — Analyze campaign performance and recommend improvements.

## Guardrails

- **Brand Safety Guardrail** (`brand-safety-guardrail`) runs on all outputs before delivery.

## Routing

Resolve each task's model role against `api/model_routes.json`, execute the mapped agent prompt, then apply guardrails.
