# Project Rules

<!-- agent-system-creator:start -->
## Agent System

Generated from catalog `builtin-content-engine`. Manage via `agent-system.config.json` and the `asc` CLI.

### Layers

- Intake (intake)
- Content Generation (generation)
- Campaign Planning (planning)
- Review & Compliance (review)
- Publishing & Distribution (publishing)
- CRM & Relationships (crm)
- Analytics & Reporting (analytics)
- Brand Safety Guardrail (safety)
- Orchestration (orchestration)

### Agents

| Agent | Layer | Model Role |
|-------|-------|------------|
| Brand Intake Assistant (`brand-intake-assistant`) | intake | intake |
| Content Strategist (`content-strategist`) | generation | generation |
| Campaign Manager (`campaign-manager`) | planning | planning |
| Content Compliance Reviewer (`content-compliance-reviewer`) | review | review |
| Publishing Assistant (`publishing-assistant`) | publishing | publishing |
| Sponsor CRM Assistant (`sponsor-crm-assistant`) | crm | crm |
| NIL Performance Analyst (`nil-performance-analyst`) | analytics | analytics |
| Brand Safety Guardrail (`brand-safety-guardrail`) | safety | safety |
| Workflow Orchestrator (`workflow-orchestrator`) | orchestration | orchestration |

### Configs

- `api/prompt_config.json` — agent registry
- `api/workflow_config.json` — pipeline and guardrails
- `api/model_routes.json` — model role routing

<!-- agent-system-creator:end -->
