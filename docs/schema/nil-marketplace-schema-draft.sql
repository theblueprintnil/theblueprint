CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TYPE user_role AS ENUM ('athlete', 'brand', 'admin', 'compliance_officer');
CREATE TYPE deal_status AS ENUM ('draft', 'offered', 'active', 'completed', 'cancelled', 'disputed');
CREATE TYPE compliance_status AS ENUM ('pending_review', 'approved', 'flagged', 'rejected');
CREATE TYPE payout_status AS ENUM ('pending', 'in_transit', 'paid', 'failed');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.athlete_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  university TEXT NOT NULL,
  sport TEXT NOT NULL,
  position TEXT,
  graduation_year INT,
  bio TEXT,

  social_handles JSONB DEFAULT '{}'::jsonb,
  audience_metrics JSONB DEFAULT '{}'::jsonb,
  market_value_estimate NUMERIC(10, 2),
  is_verified BOOLEAN DEFAULT FALSE,

  stripe_account_id TEXT UNIQUE,
  stripe_payouts_enabled BOOLEAN DEFAULT FALSE,

  embedding vector(1536),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.brand_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  verification_status TEXT DEFAULT 'pending',

  stripe_customer_id TEXT UNIQUE,

  embedding vector(1536),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES public.athlete_profiles(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brand_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  compensation_amount NUMERIC(12, 2) NOT NULL,
  status deal_status DEFAULT 'offered',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.payout_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  athlete_id UUID REFERENCES public.athlete_profiles(id) ON DELETE CASCADE,
  stripe_transfer_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  platform_fee NUMERIC(10, 2) DEFAULT 0.00,
  tax_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  status payout_status DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.compliance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  athlete_id UUID REFERENCES public.athlete_profiles(id) ON DELETE CASCADE,
  school_disclosure_status compliance_status DEFAULT 'pending_review',
  ncaa_conflict_flag BOOLEAN DEFAULT FALSE,
  prohibited_category_flag BOOLEAN DEFAULT FALSE,
  disclosure_submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
