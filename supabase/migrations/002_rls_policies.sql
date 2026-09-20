-- ============================================================
-- MailSentinel X — RLS Policies
-- Migration 002: Row Level Security
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threat_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forensic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USERS policies
-- ============================================================
CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all users"
    ON public.users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

CREATE POLICY "Service role full access to users"
    ON public.users FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================
-- CASES policies — All analysts can view and create
-- ============================================================
CREATE POLICY "Analysts can view all cases"
    ON public.cases FOR SELECT
    USING (true);

CREATE POLICY "Analysts can create cases"
    ON public.cases FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Analysts can update cases"
    ON public.cases FOR UPDATE
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete cases"
    ON public.cases FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

CREATE POLICY "Service role full access to cases"
    ON public.cases FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================
-- EMAILS, INDICATORS, RELATIONSHIPS — inherit from case access
-- ============================================================
-- Emails
CREATE POLICY "Authenticated users can view emails"
    ON public.emails FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service role full access to emails"
    ON public.emails FOR ALL USING (auth.role() = 'service_role');

-- IP Indicators
CREATE POLICY "Authenticated users can view ip_indicators"
    ON public.ip_indicators FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service role full access to ip_indicators"
    ON public.ip_indicators FOR ALL USING (auth.role() = 'service_role');

-- Domains
CREATE POLICY "Authenticated users can view domains"
    ON public.domains FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service role full access to domains"
    ON public.domains FOR ALL USING (auth.role() = 'service_role');

-- URLs
CREATE POLICY "Authenticated users can view urls"
    ON public.urls FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service role full access to urls"
    ON public.urls FOR ALL USING (auth.role() = 'service_role');

-- Attachments
CREATE POLICY "Authenticated users can view attachments"
    ON public.attachments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service role full access to attachments"
    ON public.attachments FOR ALL USING (auth.role() = 'service_role');

-- Threat Relationships
CREATE POLICY "Authenticated users can view threat_relationships"
    ON public.threat_relationships FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service role full access to threat_relationships"
    ON public.threat_relationships FOR ALL USING (auth.role() = 'service_role');

-- Forensic Events
CREATE POLICY "Authenticated users can view forensic_events"
    ON public.forensic_events FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service role full access to forensic_events"
    ON public.forensic_events FOR ALL USING (auth.role() = 'service_role');

-- Campaigns
CREATE POLICY "Authenticated users can view campaigns"
    ON public.campaigns FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service role full access to campaigns"
    ON public.campaigns FOR ALL USING (auth.role() = 'service_role');

-- AI Analysis
CREATE POLICY "Authenticated users can view ai_analysis"
    ON public.ai_analysis FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service role full access to ai_analysis"
    ON public.ai_analysis FOR ALL USING (auth.role() = 'service_role');

-- Audit Logs
CREATE POLICY "Admins can view audit_logs"
    ON public.audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );
CREATE POLICY "Service role full access to audit_logs"
    ON public.audit_logs FOR ALL USING (auth.role() = 'service_role');
