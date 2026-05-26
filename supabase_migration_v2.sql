-- ============================================================================
-- SRI VASAVI PLYWOODS - CRM & ERP CUSTOMER & BILL NUMBERING SYSTEM MIGRATION (v2)
-- Applies to Supabase database.
-- ============================================================================

-- 1. Add columns to customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS customer_no TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS latest_bill_no TEXT;

-- 2. Create bills table
CREATE TABLE IF NOT EXISTS public.bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    customer_no TEXT NOT NULL,
    bill_no TEXT UNIQUE NOT NULL,
    bill_date TEXT NOT NULL,
    final_amount NUMERIC NOT NULL,
    gst_percent NUMERIC NOT NULL,
    advance_paid NUMERIC NOT NULL,
    pending_balance NUMERIC NOT NULL,
    generated_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS and create policies
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all bills operations" ON public.bills;
CREATE POLICY "Allow all bills operations" ON public.bills FOR ALL TO public USING (true) WITH CHECK (true);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_bills_customer_id ON public.bills(customer_id);
CREATE INDEX IF NOT EXISTS idx_bills_bill_no ON public.bills(bill_no);
CREATE INDEX IF NOT EXISTS idx_bills_customer_no ON public.bills(customer_no);
CREATE INDEX IF NOT EXISTS idx_customers_customer_no ON public.customers(customer_no);
CREATE INDEX IF NOT EXISTS idx_customers_latest_bill_no ON public.customers(latest_bill_no);
