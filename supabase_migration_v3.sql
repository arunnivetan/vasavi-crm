-- ============================================================================
-- SRI VASAVI PLYWOODS - CRM USER PERSISTENCE & AUDIT TRACKING MIGRATION (v3)
-- Applies to Supabase database.
-- ============================================================================

-- 1. Create crm_users table
CREATE TABLE IF NOT EXISTS public.crm_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'Staff',
    temp_password TEXT NOT NULL DEFAULT 'suresh',
    activity_color TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true NOT NULL
);

-- 2. Create crm_user_activities table
CREATE TABLE IF NOT EXISTS public.crm_user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.crm_users(id) ON DELETE CASCADE,
    customer_id TEXT,
    activity_type TEXT NOT NULL,
    activity_description TEXT NOT NULL,
    module_name TEXT,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ip_address TEXT,
    device_info TEXT
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.crm_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_user_activities ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies allowing all public access (matching existing app architecture)
DROP POLICY IF EXISTS "Allow all crm_users operations" ON public.crm_users;
CREATE POLICY "Allow all crm_users operations" ON public.crm_users FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all crm_user_activities operations" ON public.crm_user_activities;
CREATE POLICY "Allow all crm_user_activities operations" ON public.crm_user_activities FOR ALL TO public USING (true) WITH CHECK (true);

-- 5. Seed default staff profiles
INSERT INTO public.crm_users (user_code, full_name, role, temp_password, activity_color)
VALUES 
('suresh', 'R SURESH BABU', 'Admin', 'suresh', '#D4A64F'), -- Gold
('arun', 'R S ARUN NIVETAN', 'Admin', 'suresh', '#3B82F6'), -- Blue
('saranya', 'S SARANYA', 'Staff', 'suresh', '#A855F7'), -- Purple
('pratiksha', 'R S PRATIKSHA', 'Staff', 'suresh', '#10B981') -- Green
ON CONFLICT (user_code) DO NOTHING;
