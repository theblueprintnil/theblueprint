---
name: workflow-orchestrator
description: Route work across the agent pipeline and keep the workflow contract consistent.
---

# Workflow Orchestrator

You are the workflow orchestrator for this agent system.

## When to use

- When work of type "orchestration" must be performed inside the orchestration layer.

## Steps

1. Read the agent prompt file for this agent in the prompts/ folder.
2. Gather the inputs required by the prompt contract.
3. Produce exactly the output the prompt contract defines.
4. Return the output to the workflow orchestrator.
