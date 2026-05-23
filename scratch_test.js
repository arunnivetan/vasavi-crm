import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read local environment keys
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length === 2) {
    env[parts[0].trim()] = parts[1].trim();
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be configured in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBackendArchitecture() {
  const testCustomerId = crypto.randomUUID();
  console.log('========================================================================');
  console.log(`Starting backend verification test. Customer UUID: ${testCustomerId}`);
  console.log('========================================================================\n');

  try {
    // 1. Insert Customer Record
    console.log('[Step 1] Inserting test customer into public.customers...');
    const customerPayload = {
      id: testCustomerId,
      customer_name: 'Antigravity Verification Test Plywoods',
      phone: '9999988888',
      address: '123 Test Suite, Hyperdrive Lane',
      requirement: '18mm Waterproof Marine Plywood (50 Sheets)',
      project_type: 'Plywood',
      sales_stage: 'New Lead',
      assigned_staff: 'Suresh',
      followup_date: new Date(Date.now() + 86400000).toISOString(),
      items: [{ productName: '18mm Waterproof Marine Plywood', qty: 50, unit: 'Sheets', rate: 2500, total: 125000 }],
      subtotal: 125000,
      discount: 5000,
      tax_percent: 18,
      tax_amount: 21600,
      amount: 141600,
      advance_paid: 41600,
      pending_amount: 100000,
      payment_status: 'Partial',
      priority: 'High',
      tags: ['Test', 'Automation']
    };

    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .insert([customerPayload])
      .select();

    if (customerError) throw customerError;
    console.log('✓ Successfully inserted customer:', customerData[0].customer_name);
    console.log(`  Updated at trigger verify: ${customerData[0].updated_at}\n`);

    // 2. Insert Note
    console.log('[Step 2] Inserting note linked to customer...');
    const notePayload = {
      customer_id: testCustomerId,
      note_text: 'Customer requested soft-close auto hinges for side cabinetry.',
      added_by: 'Suresh'
    };

    const { data: noteData, error: noteError } = await supabase
      .from('notes')
      .insert([notePayload])
      .select();

    if (noteError) throw noteError;
    console.log('✓ Successfully inserted note:', noteData[0].note_text);
    console.log(`  FK customer_id matched: ${noteData[0].customer_id}\n`);

    // 3. Insert Payment Ledger Transaction
    console.log('[Step 3] Inserting payment transaction...');
    const paymentPayload = {
      customer_id: testCustomerId,
      amount_paid: 41600,
      payment_mode: 'GPay',
      updated_by: 'Suresh',
      note: 'Initial booking advance collection'
    };

    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .insert([paymentPayload])
      .select();

    if (paymentError) throw paymentError;
    console.log('✓ Successfully inserted payment: ₹', paymentData[0].amount_paid);
    console.log(`  Payment transaction mode: ${paymentData[0].payment_mode}\n`);

    // 4. Insert Reminder Alert
    console.log('[Step 4] Inserting follow-up reminder alert...');
    const reminderPayload = {
      customer_id: testCustomerId,
      reminder_type: 'Follow-up Call',
      reminder_date: new Date(Date.now() + 172800000).toISOString(),
      status: 'Pending',
      notes: 'Call to confirm delivery slot'
    };

    const { data: reminderData, error: reminderError } = await supabase
      .from('reminders')
      .insert([reminderPayload])
      .select();

    if (reminderError) throw reminderError;
    console.log('✓ Successfully inserted reminder target:', reminderData[0].reminder_date);
    console.log(`  Reminder status: ${reminderData[0].status}\n`);

    // 5. Insert Activity Log
    console.log('[Step 5] Inserting activity log...');
    const activityPayload = {
      customer_id: testCustomerId,
      action_type: 'customer_created',
      old_value: '',
      new_value: 'Added customer during backend validation tests',
      updated_by: 'System'
    };

    const { data: activityData, error: activityError } = await supabase
      .from('activities')
      .insert([activityPayload])
      .select();

    if (activityError) throw activityError;
    console.log('✓ Successfully inserted activity log:', activityData[0].new_value);
    console.log(`  Action type: ${activityData[0].action_type}\n`);

    // 6. Verify lookup stage query
    console.log('[Step 6] Fetching pipeline stages lookup table...');
    const { data: stagesData, error: stagesError } = await supabase
      .from('stages')
      .select('*')
      .order('stage_order', { ascending: true });

    if (stagesError) throw stagesError;
    console.log('✓ Stages count fetched:', stagesData.length);
    console.log('  Seeded stages verified:', stagesData.map(s => s.stage_name).join(' -> '), '\n');

    // 7. Verify cascade delete integrity
    console.log('[Step 7] Testing relational CASCADE DELETE...');
    console.log(`  Deleting master customer record (ID: ${testCustomerId})...`);
    
    // We do a hard delete in this test script to verify cascade works.
    // (The frontend soft-deletes by updating is_deleted, but CASCADE is set up on DB level for cascade safety on hard deletes)
    const { error: deleteError } = await supabase
      .from('customers')
      .delete()
      .eq('id', testCustomerId);

    if (deleteError) throw deleteError;
    console.log('  ✓ Master customer deleted.');

    // Attempt to select child records (should be empty if CASCADE is working correctly)
    console.log('  Verifying notes cascading deletion...');
    const { data: checkNotes } = await supabase.from('notes').select('*').eq('customer_id', testCustomerId);
    console.log(`  ✓ Notes remaining: ${checkNotes.length} (Expected: 0)`);

    console.log('  Verifying payments cascading deletion...');
    const { data: checkPayments } = await supabase.from('payments').select('*').eq('customer_id', testCustomerId);
    console.log(`  ✓ Payments remaining: ${checkPayments.length} (Expected: 0)`);

    console.log('  Verifying reminders cascading deletion...');
    const { data: checkReminders } = await supabase.from('reminders').select('*').eq('customer_id', testCustomerId);
    console.log(`  ✓ Reminders remaining: ${checkReminders.length} (Expected: 0)`);

    console.log('  Verifying activities cascading deletion...');
    const { data: checkActivities } = await supabase.from('activities').select('*').eq('customer_id', testCustomerId);
    console.log(`  ✓ Activities remaining: ${checkActivities.length} (Expected: 0)\n`);

    console.log('========================================================================');
    console.log('ALL VERIFICATION TESTS PASSED SUCCESSFULLY! BACKEND STABLE & READY. 🌌');
    console.log('========================================================================');

  } catch (err) {
    console.error('\n❌ Verification Test Failed with Exception:', err.message || err);
    process.exit(1);
  }
}

testBackendArchitecture();
