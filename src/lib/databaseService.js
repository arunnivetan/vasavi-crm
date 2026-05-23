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
  const advance = parseFloat(c.advancePaid || 0);
  const total = parseFloat(c.amount || 0);
  const pending = total - advance;
  
  return {
    id: c.id,
    name: c.customerName || '',
    phone: c.phone || '',
    project_type: c.projectType || 'Hardware',
    sales_stage: c.stage || 'New Lead',
    final_bill: total,
    advance_paid: advance,
    pending_balance: pending,
    created_at: c.createdAt || new Date().toISOString()
  };
};

const mapFromSupabase = (s) => {
  if (!s) return {};
  const advance = parseFloat(s.advance_paid || 0);
  const total = parseFloat(s.final_bill || 0);
  const pending = parseFloat(s.pending_balance || (total - advance));
  const paymentStatus = advance === 0 ? 'Pending' : (pending <= 0 ? 'Paid' : 'Partial');

  return {
    id: s.id,
    customerName: s.name || '',
    phone: s.phone || '',
    address: '',
    projectType: s.project_type || 'Hardware',
    stage: s.sales_stage || 'New Lead',
    amount: total,
    advancePaid: advance,
    pendingAmount: pending,
    priority: 'Medium',
    items: [],
    subtotal: total,
    discount: 0,
    taxPercent: 0,
    taxAmount: 0,
    paymentStatus: paymentStatus,
    isDeleted: false,
    createdAt: s.created_at || new Date().toISOString(),
    requirement: `${s.project_type || 'Hardware'} - Plywood & Hardwares`
  };
};

const defaultStages = [
  { stageName: 'New Lead', stageColor: '#3B82F6', stageOrder: 1 },
  { stageName: 'Quotation Sent', stageColor: '#F59E0B', stageOrder: 2 },
  { stageName: 'Negotiation', stageColor: '#A855F7', stageOrder: 3 },
  { stageName: 'Converted', stageColor: '#10B981', stageOrder: 4 },
  { stageName: 'Lost', stageColor: '#EF4444', stageOrder: 5 }
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

  // --- LOCAL STORAGE HELPERS FOR FALLBACK ---
  getLocalData(key, defaultVal = []) {
    if (typeof window === 'undefined' || !window.localStorage) return defaultVal;
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : defaultVal;
    } catch (e) {
      console.error(`[LocalStorage Helper] Error reading ${key}:`, e);
      return defaultVal;
    }
  },

  saveLocalData(key, data) {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error(`[LocalStorage Helper] Error writing ${key}:`, e);
      return false;
    }
  },

  async getCustomers() {
    try {
      console.log('[Database Service] Fetching active customers...');
      const { data, error } = await supabase
        .from('customers')
        .select('*')
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
      console.log('[Database Service] Hard deleting customer since is_deleted column is not present:', customerId);
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) {
        console.error('[Database Service] Supabase delete customer error:', error);
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
      console.warn('[Database Service] fetchActivities failed, falling back to localStorage:', err.message || err);
      return this.getLocalData('vasavi_crm_activities', []);
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
      console.warn('[Database Service] saveActivity failed, saving to localStorage:', err.message || err);
      const list = this.getLocalData('vasavi_crm_activities', []);
      list.unshift(activity);
      this.saveLocalData('vasavi_crm_activities', list);
      return true;
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
      console.warn('[Database Service] fetchNotes failed, falling back to localStorage:', err.message || err);
      return this.getLocalData('vasavi_crm_notes', []);
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
      console.warn('[Database Service] saveNote failed, saving to localStorage:', err.message || err);
      const list = this.getLocalData('vasavi_crm_notes', []);
      list.unshift(note);
      this.saveLocalData('vasavi_crm_notes', list);
      return true;
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
      console.warn('[Database Service] fetchPayments failed, falling back to localStorage:', err.message || err);
      return this.getLocalData('vasavi_crm_payments', []);
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
      console.warn('[Database Service] savePayment failed, saving to localStorage:', err.message || err);
      const list = this.getLocalData('vasavi_crm_payments', []);
      list.unshift(payment);
      this.saveLocalData('vasavi_crm_payments', list);
      return true;
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
      console.warn('[Database Service] fetchReminders failed, falling back to localStorage:', err.message || err);
      return this.getLocalData('vasavi_crm_reminders', []);
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
      console.warn('[Database Service] saveReminder failed, saving to localStorage:', err.message || err);
      const list = this.getLocalData('vasavi_crm_reminders', []);
      const idx = list.findIndex(r => r.id === reminder.id);
      if (idx > -1) {
        list[idx] = { ...list[idx], ...reminder };
      } else {
        list.push(reminder);
      }
      this.saveLocalData('vasavi_crm_reminders', list);
      return true;
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
      console.warn('[Database Service] fetchStages failed, falling back to localStorage:', err.message || err);
      const local = this.getLocalData('vasavi_crm_stages', null);
      return local && local.length > 0 ? local : defaultStages;
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
      console.warn('[Database Service] saveStage failed, saving to localStorage:', err.message || err);
      const list = this.getLocalData('vasavi_crm_stages', defaultStages);
      const idx = list.findIndex(s => s.stageName === stage.stageName);
      if (idx > -1) {
        list[idx] = { ...list[idx], ...stage };
      } else {
        list.push(stage);
      }
      this.saveLocalData('vasavi_crm_stages', list);
      return true;
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
      console.warn('[Database Service] saveAllStages failed, saving to localStorage:', err.message || err);
      this.saveLocalData('vasavi_crm_stages', stagesList);
      return true;
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
      console.warn('[Database Service] deleteStage failed, deleting from localStorage:', err.message || err);
      const list = this.getLocalData('vasavi_crm_stages', defaultStages);
      const filtered = list.filter(s => s.stageName !== stageName);
      this.saveLocalData('vasavi_crm_stages', filtered);
      return true;
    }
  }
};
