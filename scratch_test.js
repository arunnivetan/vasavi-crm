import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFullSnakeInsert() {
  const validUuid = 'c25a0718-d731-419b-a32b-8664d50937a1';

  console.log('Inserting row with full snake_case columns...');
  const payload = {
    id: validUuid,
    name: 'Sri Ram Ply',
    phone: '9876543210',
    project_type: 'Plywood',
    sales_stage: 'New Lead',
    final_bill: 5000,
    advance_paid: 1000,
    pending_balance: 4000
  };

  const { data, error } = await supabase
    .from('customers')
    .insert([payload])
    .select();

  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Successfully inserted full row:');
    console.log(JSON.stringify(data[0], null, 2));

    // Clean up
    await supabase.from('customers').delete().eq('id', validUuid);
    console.log('Cleaned up test row.');
  }
}

testFullSnakeInsert();
