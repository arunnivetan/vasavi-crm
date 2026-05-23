-- ============================================================================
-- SRI VASAVI PLYWOODS - CRM & ERP SUPABASE SQL DATABASE MIGRATION SCRIPT (DDL)
-- Sets up robust tables, indexes, triggers, storage buckets, and policies.
-- ============================================================================

-- Safely drop existing tables with cascade to avoid dependency lockouts
DROP TABLE IF EXISTS public.customer_files CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.quotations CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.reminders CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.materials CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.stages CASCADE;

-- Create update trigger function for automatically managing updated_at columns
CREATE OR REPLACE FUNCTION public.handle_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Create STAGES Lookup Table
CREATE TABLE public.stages (
    stage_name TEXT PRIMARY KEY,
    stage_color TEXT NOT NULL,
    stage_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create CUSTOMERS Master Table
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    requirement TEXT,
    project_type TEXT DEFAULT 'Hardware',
    sales_stage TEXT DEFAULT 'New Lead',
    assigned_staff TEXT,
    followup_date TIMESTAMP WITH TIME ZONE,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    tax_percent NUMERIC DEFAULT 18,
    tax_amount NUMERIC DEFAULT 0,
    amount NUMERIC DEFAULT 0,
    advance_paid NUMERIC DEFAULT 0,
    pending_amount NUMERIC DEFAULT 0,
    payment_status TEXT DEFAULT 'Pending',
    priority TEXT DEFAULT 'Medium',
    tags TEXT[] DEFAULT '{}',
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create MATERIALS Table
CREATE TABLE public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    material_name TEXT NOT NULL,
    qty NUMERIC DEFAULT 1 NOT NULL,
    unit TEXT DEFAULT 'pcs' NOT NULL,
    rate NUMERIC DEFAULT 0 NOT NULL,
    total NUMERIC DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create PAYMENTS Ledger Table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    amount_paid NUMERIC NOT NULL,
    payment_mode TEXT DEFAULT 'Cash' NOT NULL,
    updated_by TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create REMINDERS Alerts Table
CREATE TABLE public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    reminder_type TEXT NOT NULL,
    reminder_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'Pending' NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create ACTIVITIES Permanent Log Table
CREATE TABLE public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    action_type TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    updated_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Create QUOTATIONS Estimates Table
CREATE TABLE public.quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    quotation_number TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'Draft' NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC DEFAULT 0 NOT NULL,
    discount NUMERIC DEFAULT 0 NOT NULL,
    tax_amount NUMERIC DEFAULT 0 NOT NULL,
    total_amount NUMERIC DEFAULT 0 NOT NULL,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Create INVOICES Tax Records Table
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    invoice_number TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'Unpaid' NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC DEFAULT 0 NOT NULL,
    discount NUMERIC DEFAULT 0 NOT NULL,
    tax_amount NUMERIC DEFAULT 0 NOT NULL,
    total_amount NUMERIC DEFAULT 0 NOT NULL,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Create CUSTOMER FILES Storage Metadata Table
CREATE TABLE public.customer_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    file_url TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- ATTACH AUTO-TIMESTAMP UPDATE TRIGGERS
-- ============================================================================
CREATE TRIGGER update_stages_timestamp BEFORE UPDATE ON public.stages FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER update_customers_timestamp BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER update_materials_timestamp BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER update_payments_timestamp BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER update_reminders_timestamp BEFORE UPDATE ON public.reminders FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER update_quotations_timestamp BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER update_invoices_timestamp BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER update_customer_files_timestamp BEFORE UPDATE ON public.customer_files FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();

-- ============================================================================
-- HIGH PERFORMANCE INDEXES
-- ============================================================================
CREATE INDEX idx_customers_sales_stage ON public.customers(sales_stage);
CREATE INDEX idx_customers_created_at ON public.customers(created_at DESC);
CREATE INDEX idx_customers_is_deleted ON public.customers(is_deleted);
CREATE INDEX idx_materials_customer_id ON public.materials(customer_id);
CREATE INDEX idx_payments_customer_id ON public.payments(customer_id);
CREATE INDEX idx_reminders_customer_id ON public.reminders(customer_id);
CREATE INDEX idx_reminders_reminder_date ON public.reminders(reminder_date);
CREATE INDEX idx_activities_customer_id ON public.activities(customer_id);
CREATE INDEX idx_quotations_customer_id ON public.quotations(customer_id);
CREATE INDEX idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX idx_customer_files_customer_id ON public.customer_files(customer_id);

-- ============================================================================
-- SEED Lookup stages
-- ============================================================================
INSERT INTO public.stages (stage_name, stage_color, stage_order) VALUES
('New Lead', '#3B82F6', 1),
('Quotation Sent', '#F59E0B', 2),
('Negotiation', '#A855F7', 3),
('Converted', '#10B981', 4),
('Lost', '#EF4444', 5)
ON CONFLICT (stage_name) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) & DEVELOPMENT POLICIES
-- ============================================================================
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all stages operations" ON public.stages FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all customers operations" ON public.customers FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all materials operations" ON public.materials FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all payments operations" ON public.payments FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all reminders operations" ON public.reminders FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all activities operations" ON public.activities FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all quotations operations" ON public.quotations FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all invoices operations" ON public.invoices FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all customer_files operations" ON public.customer_files FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================================
-- STORAGE BUCKETS PROVISIONING & POLICIES (Bypasses CLI via direct SQL catalog insert)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('customer-images', 'customer-images', true),
  ('pdf-files', 'pdf-files', true),
  ('quotations', 'quotations', true),
  ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS for Storage Objects (standard in modern Supabase instances)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Permissive Storage RLS Policies for frictionless development uploads
DROP POLICY IF EXISTS "Allow public read access to buckets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to buckets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to buckets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes from buckets" ON storage.objects;

CREATE POLICY "Allow public read access to buckets" ON storage.objects FOR SELECT TO public USING (true);
CREATE POLICY "Allow public uploads to buckets" ON storage.objects FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public updates to buckets" ON storage.objects FOR UPDATE TO public USING (true);
CREATE POLICY "Allow public deletes from buckets" ON storage.objects FOR DELETE TO public USING (true);
