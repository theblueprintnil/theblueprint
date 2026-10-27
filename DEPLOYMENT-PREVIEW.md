# Deployment Preparation Guide — Preview/Staging Environment

**Date**: 2026-10-01  
**Target**: Vercel Preview deployment (GitHub-connected)  
**Status**: Ready for Phase 3 & 4 execution

---

## ✅ Prerequisites Completed (Local Validation)

- [x] Local test suite: `web` (typecheck, lint, vitest) — **PASS**
- [x] Local test suite: `agent-engine` — **68 passed, 1 skipped**
- [x] Preflight: **9 passed, 3 warnings, 0 failed, 1 skipped**
- [x] JWT key pair: `keys/internal-web.public.pem` committed
- [x] Private key excluded via `.gitignore`

---

## 📋 Phase 3: Deploy agent-engine to Vercel

### Step 1: Create Vercel Project
1. Go to https://vercel.com/dashboard
2. **Add New → Project** → Import `theblueprintnil/theblueprint`
3. Settings:
   - **Project Name**: `blueprint-agent-engine`
   - **Framework**: Other
   - **Root Directory**: `agent-engine/`

### Step 2: Environment Variables (Production + Preview)

```bash
# Database - Direct connection
DATABASE_URL=postgresql://postgres:qLgRnaZEN41r1wWT@db.xtirahfgkjmsvasekpyu.supabase.co:5432/postgres

# Database - RLS-bound (app_agent)
AGENT_DATABASE_URL=postgresql://app_agent:Bp_Prev_2026_xK9mQ7wL3nR8tY4pV@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# AI Provider
OMNIROUTE_BASE_URL=http://localhost:20128/v1
OMNIROUTE_API_KEY=sk-78df131221ff7c80-3ffbfe-4ff882e6
OMNIROUTE_DEEPSEEK_MODEL=deepseek-chat
OMNIROUTE_ZAI_MODEL=glm-4-plus
LLM_TIMEOUT_SECONDS=60

# JWT Auth (verify web→engine)
AGENT_JWT_ISSUER=https://agents.blueprint.local
AGENT_JWT_AUDIENCE=blueprint-agent-gateway
AGENT_PINNED_PEM_DIR=keys/

# Optional
AGENT_PUBLISH_ENDPOINT=
AGENT_PUBLIC_BASE_URL=https://[YOUR-DEPLOYMENT-URL].vercel.app
```

### Step 3: Deploy & Verify
```bash
curl https://[YOUR-AGENT-ENGINE-URL].vercel.app/health
# Expected: {"status":"ok"}
```

### Step 4: Function Duration
- **Project Settings → Functions** → Set Max Duration to **600s** (Pro) or adjust `task_time_limit` in `tasks.py` (Hobby)

---

## 📋 Phase 4: Deploy web to Vercel

### Step 1: Create Vercel Project
1. **Add New → Project** → Import same repo
2. Settings:
   - **Project Name**: `blueprint-web`
   - **Framework**: Next.js (auto-detected)
   - **Root Directory**: `web/`
   - **Node.js**: 22.x (from package.json)

### Step 2: Environment Variables

```bash
# Database - Pooled (app_user)
DATABASE_URL=postgresql://app_user:Bp_Prev_2026_xK9mQ7wL3nR8tY4pV@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DATABASE_URL_APP=postgresql://app_user:Bp_Prev_2026_xK9mQ7wL3nR8tY4pV@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
APP_DB_PASSWORD=Bp_Prev_2026_xK9mQ7wL3nR8tY4pV

# Clerk (Test keys for Preview)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_[YOUR_KEY]
CLERK_SECRET_KEY=sk_test_[YOUR_KEY]
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xtirahfgkjmsvasekpyu.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[YOUR_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_KEY]

# Agent Orchestration
AGENT_SERVICE_URL=https://[YOUR-AGENT-ENGINE-URL].vercel.app
AGENT_JWT_ISSUER=https://agents.blueprint.local
AGENT_JWT_AUDIENCE=blueprint-agent-gateway
AGENT_INTERNAL_JWT_KEY_ID=internal-web
AGENT_INTERNAL_JWT_KEY="-----BEGIN PRIVATE KEY-----[YOUR_PRIVATE_KEY]-----END PRIVATE KEY-----"

# App
SESSION_SECRET=[GENERATE_RANDOM_STRING]
NEXT_PUBLIC_APP_URL=https://[YOUR-WEB-URL].vercel.app
```

### Step 3: Deploy & Verify
- Visit deployment URL
- Test: Homepage, /login, /signup, dashboard access

---

## 🔍 Post-Deployment Verification

```bash
# Update local .env
AGENT_SERVICE_URL="https://[YOUR-AGENT-ENGINE-URL].vercel.app"

# Run preflight probe
cd web && npm run preflight -- --probe
```

---

## ⚠️ Known Limitations (Preview)

1. Local workstation cannot reach Supabase (Vercel can)
2. OmniRoute points to localhost — update for live AI
3. Stripe not configured — upgrade buttons disabled
4. Publishing disabled (no AGENT_PUBLISH_ENDPOINT)

---

## 🔐 Security Checklist

- [ ] Private keys NOT committed
- [ ] Public key (`keys/internal-web.public.pem`) committed
- [ ] JWT issuer/audience match web ↔ engine
- [ ] Test keys for Preview / Production keys for Prod
- [ ] RLS policies applied

---

## 📚 Reference
- [docs/GO-LIVE.md](docs/GO-LIVE.md) — Full production checklist
- [docs/adr/0008-vercel-deployment_topology.md](docs/adr/0008-vercel-deployment_topology.md) — Architecture
- [VERCEL-DEPLOYMENT.md](VERCEL-DEPLOYMENT.md) — Detailed Phase 3 guide

---

**Updated**: 2026-10-01