-- ============================================================================
-- SRI VASAVI PLYWOODS - CRM & ERP SUPABASE SQL DATABASE SCHEMA (DDL)
-- Copy and paste this script directly into your Supabase SQL Editor
-- ============================================================================

-- 1. Create CUSTOMERS Table
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    "customerName" TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    requirement TEXT,
    "projectType" TEXT DEFAULT 'Hardware',
    stage TEXT DEFAULT 'New Lead',
    "assignedStaff" TEXT,
    "followupDate" TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    "taxPercent" NUMERIC DEFAULT 18,
    "taxAmount" NUMERIC DEFAULT 0,
    amount NUMERIC DEFAULT 0,
    "advancePaid" NUMERIC DEFAULT 0,
    "pendingAmount" NUMERIC DEFAULT 0,
    "paymentStatus" TEXT DEFAULT 'Pending',
    priority TEXT DEFAULT 'Medium',
    tags TEXT[] DEFAULT '{}',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "isDeleted" BOOLEAN DEFAULT false
);

-- 2. Create ACTIVITIES Table
CREATE TABLE IF NOT EXISTS activities (
    id BIGSERIAL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "updatedBy" TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create NOTES Table
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "noteText" TEXT NOT NULL,
    "addedBy" TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Create PAYMENTS Table
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "amountPaid" NUMERIC NOT NULL,
    "paymentMode" TEXT DEFAULT 'Cash',
    "updatedBy" TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    note TEXT
);

-- 5. Create REMINDERS Table
CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "reminderType" TEXT NOT NULL,
    "reminderDate" TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    notes TEXT
);

-- 6. Create STAGES Table
CREATE TABLE IF NOT EXISTS stages (
    "stageName" TEXT PRIMARY KEY,
    "stageColor" TEXT NOT NULL,
    "stageOrder" INTEGER NOT NULL
);

-- Enable Row Level Security (RLS) or add default policies if required
-- By default in a simple setup, you can allow all operations for anon roles
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read" ON customers FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON customers FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON customers FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read" ON activities FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON activities FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous read" ON notes FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON notes FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous read" ON payments FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON payments FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous read" ON reminders FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON reminders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON reminders FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous read" ON stages FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON stages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON stages FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON stages FOR DELETE USING (true);

-- Insert Default Stages
INSERT INTO stages ("stageName", "stageColor", "stageOrder") VALUES
('New Lead', '#3B82F6', 1),
('Contacted', '#F59E0B', 2),
('Site Visit', '#A855F7', 3),
('Confirmed', '#10B981', 4),
('Completed', '#14B8A6', 5)
ON CONFLICT ("stageName") DO NOTHING;
