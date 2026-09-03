# Server-Action Failure Handling

> entityType: pattern
>
> *External linked node (other context).*

## Observations

- In server actions, using a hoisted function declaration returning never (e.g., function failX(...): never { redirect(...) }) preserves TypeScript never-narrowing across the guard, whereas an inline arrow const failPath = (...) => redirect(...) does NOT narrow subsequent usages of the checked variable
- General TypeScript pattern for server-action guards (hoisted never-returning functions); the cited src/lib/nil/* files are not present in the current web/ checkout

## Relations

**Outgoing**

- `applies-to` → [[The Blueprint - API routes]]

**Incoming**

- none