import { supabase } from './supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('YOUR_PROJECT') && 
  supabaseUrl.startsWith('https://');

console.log(`[Database Engine] Supabase configured status: ${isSupabaseConfigured}`);

// --- DATA SCHEMA TRANSLATION MAPPERS ---
const mapToSupabase = (c) => {
  if (!c) return {};
  return {
    id: c.id,
    name: c.customerName || '',
    phone: c.phone || '',
    address: c.address || '',
    project_type: c.projectType || 'Hardware',
    sales_stage: c.stage || 'New Lead',
    final_bill: parseFloat(c.amount || 0),
    advance_paid: parseFloat(c.advancePaid || 0),
    pending_balance: parseFloat(c.pendingAmount || 0),
    priority: c.priority || 'Medium',
    items: c.items || [],
    subtotal: parseFloat(c.subtotal || 0),
    discount: parseFloat(c.discount || 0),
    tax_percent: parseFloat(c.taxPercent || 18),
    tax_amount: parseFloat(c.taxAmount || 0),
    payment_status: c.paymentStatus || 'Pending',
    is_deleted: c.isDeleted || false,
    created_at: c.createdAt || new Date().toISOString()
  };
};

const mapFromSupabase = (s) => {
  if (!s) return {};
  return {
    id: s.id,
    customerName: s.name || '',
    phone: s.phone || '',
    address: s.address || '',
    projectType: s.project_type || 'Hardware',
    stage: s.sales_stage || 'New Lead',
    amount: parseFloat(s.final_bill || 0),
    advancePaid: parseFloat(s.advance_paid || 0),
    pendingAmount: parseFloat(s.pending_balance || 0),
    priority: s.priority || 'Medium',
    items: s.items || [],
    subtotal: parseFloat(s.subtotal || 0),
    discount: parseFloat(s.discount || 0),
    taxPercent: parseFloat(s.tax_percent || 18),
    taxAmount: parseFloat(s.tax_amount || 0),
    paymentStatus: s.payment_status || 'Pending',
    isDeleted: s.is_deleted || false,
    createdAt: s.created_at || new Date().toISOString(),
    requirement: (s.items || []).map(item => `${item?.productName || ''} (${item?.qty || 0} ${item?.unit || ''} @ Rs. ${item?.rate || 0})`).join(', ') || 'Standard supplies'
  };
};

const defaultStages = [
  { stageName: 'New Lead', stageColor: '#3B82F6', stageOrder: 1 },
  { stageName: 'Contacted', stageColor: '#F59E0B', stageOrder: 2 },
  { stageName: 'Site Visit', stageColor: '#A855F7', stageOrder: 3 },
  { stageName: 'Confirmed', stageColor: '#10B981', stageOrder: 4 },
  { stageName: 'Completed', stageColor: '#14B8A6', stageOrder: 5 }
];

export const databaseService = {
  // --- CUSTOMERS CRUD (PURE SUPABASE) ---
  
  async createCustomer(customer) {
    try {
      console.log('[Database Service] Creating customer:', customer?.id);
      const dbObj = mapToSupabase(customer);
      const { data, error } = await supabase
        .from('customers')
        .insert([dbObj])
        .select();
      
      if (error) {
        console.error('[Database Service] Supabase insert customer error:', error);
        throw error;
      }
      return data && data.length > 0 ? mapFromSupabase(data[0]) : null;
    } catch (err) {
      console.error('[Database Service] createCustomer Exception:', err.message || err);
      throw err;
    }
  },

  async getCustomers() {
    try {
      console.log('[Database Service] Fetching active customers...');
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Database Service] Supabase select customers error:', error);
        throw error;
      }
      return (data || []).map(mapFromSupabase);
    } catch (err) {
      console.error('[Database Service] getCustomers Exception:', err.message || err);
      throw err;
    }
  },

  async updateCustomer(customerId, updatedFields) {
    try {
      console.log('[Database Service] Updating customer:', customerId, updatedFields);
      
      // Step 1: fetch existing record to merge fields safely and correctly
      const { data: existing, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (fetchError) {
        console.error('[Database Service] Supabase fetch single customer error:', fetchError);
        throw fetchError;
      }

      const merged = { ...mapFromSupabase(existing), ...updatedFields };
      const dbObj = mapToSupabase(merged);

      const { data, error } = await supabase
        .from('customers')
        .update(dbObj)
        .eq('id', customerId)
        .select();

      if (error) {
        console.error('[Database Service] Supabase update customer error:', error);
        throw error;
      }
      return data && data.length > 0 ? mapFromSupabase(data[0]) : null;
    } catch (err) {
      console.error('[Database Service] updateCustomer Exception:', err.message || err);
      throw err;
    }
  },

  async deleteCustomer(customerId) {
    try {
      console.log('[Database Service] Soft deleting customer:', customerId);
      const { error } = await supabase
        .from('customers')
        .update({ is_deleted: true })
        .eq('id', customerId);

      if (error) {
        console.error('[Database Service] Supabase soft-delete customer error:', error);
        throw error;
      }
      return true;
    } catch (err) {
      console.error('[Database Service] deleteCustomer Exception:', err.message || err);
      throw err;
    }
  },

  // --- BACKWARD COMPATIBLE WRAPPERS ---
  async fetchCustomers() {
    return await this.getCustomers();
  },

  async saveCustomer(customer) {
    try {
      // Upsert style mapping for context compatibility
      const dbObj = mapToSupabase(customer);
      const { error } = await supabase
        .from('customers')
        .upsert(dbObj);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Database Service] saveCustomer Exception:', err.message || err);
      return false;
    }
  },

  // --- ACTIVITIES ---
  async fetchActivities() {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[Database Service] fetchActivities Exception:', err.message || err);
      return [];
    }
  },

  async saveActivity(activity) {
    try {
      const { error } = await supabase
        .from('activities')
        .insert(activity);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Database Service] saveActivity Exception:', err.message || err);
      return false;
    }
  },

  // --- NOTES ---
  async fetchNotes() {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[Database Service] fetchNotes Exception:', err.message || err);
      return [];
    }
  },

  async saveNote(note) {
    try {
      const { error } = await supabase
        .from('notes')
        .insert(note);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Database Service] saveNote Exception:', err.message || err);
      return false;
    }
  },

  // --- PAYMENTS ---
  async fetchPayments() {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[Database Service] fetchPayments Exception:', err.message || err);
      return [];
    }
  },

  async savePayment(payment) {
    try {
      const { error } = await supabase
        .from('payments')
        .insert(payment);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Database Service] savePayment Exception:', err.message || err);
      return false;
    }
  },

  // --- REMINDERS ---
  async fetchReminders() {
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*');
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[Database Service] fetchReminders Exception:', err.message || err);
      return [];
    }
  },

  async saveReminder(reminder) {
    try {
      const { error } = await supabase
        .from('reminders')
        .upsert(reminder);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Database Service] saveReminder Exception:', err.message || err);
      return false;
    }
  },

  // --- STAGES ---
  async fetchStages() {
    try {
      const { data, error } = await supabase
        .from('stages')
        .select('*')
        .order('stageOrder', { ascending: true });
      if (error) throw error;
      return data && data.length > 0 ? data : defaultStages;
    } catch (err) {
      console.error('[Database Service] fetchStages Exception, using defaults:', err.message || err);
      return defaultStages;
    }
  },

  async saveStage(stage) {
    try {
      const { error } = await supabase
        .from('stages')
        .upsert(stage);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Database Service] saveStage Exception:', err.message || err);
      return false;
    }
  },

  async saveAllStages(stagesList) {
    try {
      const { error } = await supabase
        .from('stages')
        .upsert(stagesList);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Database Service] saveAllStages Exception:', err.message || err);
      return false;
    }
  },

  async deleteStage(stageName) {
    try {
      const { error } = await supabase
        .from('stages')
        .delete()
        .eq('stageName', stageName);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Database Service] deleteStage Exception:', err.message || err);
      return false;
    }
  }
};
