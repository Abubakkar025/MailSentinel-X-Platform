-- ============================================================
-- MailSentinel X — Database Schema
-- Migration 001: Initial Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'analyst' CHECK (role IN ('analyst', 'admin')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. CAMPAIGNS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    first_seen TIMESTAMPTZ,
    last_seen TIMESTAMPTZ,
    case_count INTEGER DEFAULT 0,
    shared_indicators JSONB DEFAULT '{}',
    threat_type TEXT,
    severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. CASES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
    severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    threat_type TEXT CHECK (threat_type IN ('phishing', 'bec', 'spoofing', 'malware', 'credential_harvesting', 'social_engineering', 'suspicious', 'benign')),
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_factors JSONB DEFAULT '[]',
    verdict TEXT,
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    is_demo BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cases_status ON public.cases(status);
CREATE INDEX idx_cases_severity ON public.cases(severity);
CREATE INDEX idx_cases_threat_type ON public.cases(threat_type);
CREATE INDEX idx_cases_created_at ON public.cases(created_at DESC);
CREATE INDEX idx_cases_is_demo ON public.cases(is_demo);
CREATE INDEX idx_cases_campaign_id ON public.cases(campaign_id);

-- ============================================================
-- 4. EMAILS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    raw_headers TEXT,
    subject TEXT,
    from_address TEXT,
    from_display_name TEXT,
    to_addresses JSONB DEFAULT '[]',
    cc_addresses JSONB DEFAULT '[]',
    reply_to TEXT,
    return_path TEXT,
    message_id TEXT,
    date_sent TIMESTAMPTZ,
    received_chain JSONB DEFAULT '[]',
    x_mailer TEXT,
    content_type TEXT,
    body_text TEXT,
    body_html TEXT,
    spf_result TEXT,
    dkim_result TEXT,
    dmarc_result TEXT,
    auth_results_raw TEXT,
    original_filename TEXT,
    file_sha256 TEXT,
    file_size_bytes INTEGER,
    storage_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_emails_case_id ON public.emails(case_id);
CREATE INDEX idx_emails_from_address ON public.emails(from_address);
CREATE INDEX idx_emails_file_sha256 ON public.emails(file_sha256);

-- ============================================================
-- 5. IP INDICATORS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ip_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    email_id UUID REFERENCES public.emails(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    source TEXT,
    hop_number INTEGER,
    hostname TEXT,
    country TEXT,
    city TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    asn TEXT,
    asn_org TEXT,
    isp TEXT,
    abuse_score INTEGER,
    is_malicious BOOLEAN DEFAULT false,
    reputation_data JSONB DEFAULT '{}',
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ip_indicators_case_id ON public.ip_indicators(case_id);
CREATE INDEX idx_ip_indicators_ip_address ON public.ip_indicators(ip_address);
CREATE INDEX idx_ip_indicators_is_malicious ON public.ip_indicators(is_malicious);

-- ============================================================
-- 6. DOMAINS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    email_id UUID REFERENCES public.emails(id) ON DELETE CASCADE,
    domain_name TEXT NOT NULL,
    source TEXT,
    registrar TEXT,
    registration_date TIMESTAMPTZ,
    expiry_date TIMESTAMPTZ,
    age_days INTEGER,
    is_newly_registered BOOLEAN DEFAULT false,
    whois_data JSONB DEFAULT '{}',
    reputation_score INTEGER,
    is_suspicious BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_domains_case_id ON public.domains(case_id);
CREATE INDEX idx_domains_domain_name ON public.domains(domain_name);
CREATE INDEX idx_domains_is_suspicious ON public.domains(is_suspicious);

-- ============================================================
-- 7. URLS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.urls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    email_id UUID REFERENCES public.emails(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    display_text TEXT,
    domain TEXT,
    is_shortened BOOLEAN DEFAULT false,
    final_url TEXT,
    is_malicious BOOLEAN DEFAULT false,
    scan_result JSONB DEFAULT '{}',
    threat_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_urls_case_id ON public.urls(case_id);
CREATE INDEX idx_urls_domain ON public.urls(domain);
CREATE INDEX idx_urls_is_malicious ON public.urls(is_malicious);

-- ============================================================
-- 8. ATTACHMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    email_id UUID REFERENCES public.emails(id) ON DELETE CASCADE,
    filename TEXT,
    content_type TEXT,
    file_size_bytes INTEGER,
    sha256_hash TEXT NOT NULL,
    md5_hash TEXT,
    is_executable BOOLEAN DEFAULT false,
    is_macro_enabled BOOLEAN DEFAULT false,
    has_double_extension BOOLEAN DEFAULT false,
    is_malicious BOOLEAN DEFAULT false,
    scan_result JSONB DEFAULT '{}',
    storage_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attachments_case_id ON public.attachments(case_id);
CREATE INDEX idx_attachments_sha256 ON public.attachments(sha256_hash);
CREATE INDEX idx_attachments_is_malicious ON public.attachments(is_malicious);

-- ============================================================
-- 9. THREAT RELATIONSHIPS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.threat_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK (source_type IN ('email', 'ip', 'domain', 'url', 'attachment', 'campaign')),
    source_id UUID NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('email', 'ip', 'domain', 'url', 'attachment', 'campaign')),
    target_id UUID NOT NULL,
    relationship TEXT NOT NULL,
    confidence DOUBLE PRECISION DEFAULT 1.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_threat_rel_case_id ON public.threat_relationships(case_id);
CREATE INDEX idx_threat_rel_source ON public.threat_relationships(source_type, source_id);
CREATE INDEX idx_threat_rel_target ON public.threat_relationships(target_type, target_id);

-- ============================================================
-- 10. FORENSIC EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.forensic_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    actor TEXT NOT NULL DEFAULT 'system',
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}',
    evidence_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_forensic_events_case_id ON public.forensic_events(case_id);
CREATE INDEX idx_forensic_events_type ON public.forensic_events(event_type);
CREATE INDEX idx_forensic_events_created_at ON public.forensic_events(created_at);

-- ============================================================
-- 11. AI ANALYSIS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    context_data JSONB DEFAULT '{}',
    model TEXT DEFAULT 'gemini-2.0-flash',
    tokens_used INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_analysis_case_id ON public.ai_analysis(case_id);

-- ============================================================
-- 12. AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER tr_cases_updated_at BEFORE UPDATE ON public.cases
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER tr_campaigns_updated_at BEFORE UPDATE ON public.campaigns
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Generate case number sequence
CREATE SEQUENCE IF NOT EXISTS case_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_case_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'MS-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(nextval('case_number_seq')::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ENABLE REALTIME (for Supabase)
-- ============================================================
-- Uncomment these when using Supabase:
-- ALTER PUBLICATION supabase_realtime ADD TABLE cases;
-- ALTER PUBLICATION supabase_realtime ADD TABLE forensic_events;
-- ALTER PUBLICATION supabase_realtime ADD TABLE ai_analysis;
