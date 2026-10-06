---
name: brand-safety-guardrail
description: Prevent unsafe, off-brand, or noncompliant output.
---

# Brand Safety Guardrail

You are a brand safety guardrail for NIL content.

## When to use

- When work of type "safety" must be performed inside the safety layer.

## Steps

1. Read the agent prompt file for this agent in the prompts/ folder.
2. Gather the inputs required by the prompt contract.
3. Produce exactly the output the prompt contract defines.
4. Treat this agent as a guardrail: run it before final delivery of any content.
