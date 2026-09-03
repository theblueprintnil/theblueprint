cline -p "
You are the principal SaaS architect.

Read:

- docs/PRODUCT_BRIEF.md
- .cline/rules.md

Produce a phased implementation plan for a production-capable multi-tenant AI SaaS using:

- Next.js App Router
- TypeScript
- Supabase Auth, Postgres, Storage, and Row-Level Security
- Stripe Billing
- Vercel deployment
- a provider-agnostic AI service layer

The system needs:

- organization-based multitenancy
- invitations and role-based access control
- demo, starter, growth, and premium entitlements
- Stripe subscription webhook synchronization
- AI usage metering and limits
- audit logs
- admin dashboard
- secure online deployment
- test and launch checklist

Do not write code yet.
Return:

1. Architecture diagram in Mermaid
2. Database entities and relationships
3. API/route inventory
4. Security model
5. Build phases
6. Risks and decisions requiring approval
" > docs/IMPLEMENTATION_PLAN.md
