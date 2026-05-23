import { supabase } from './supabase';
import { initLocalStorageDB, dbAPI } from '../utils/db';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('YOUR_PROJECT') && 
  supabaseUrl.startsWith('https://');

console.log(`[Database Engine] Supabase configured status: ${isSupabaseConfigured}`);

// Safely log status on load
if (isSupabaseConfigured) {
  console.log('[Database Engine] Active connection to Supabase cloud established.');
} else {
  console.warn('[Database Engine] Supabase is not configured or holding placeholder values. Operating on LocalStorage engine.');
}

export const databaseService = {
  // --- CUSTOMERS CRUD ---
  async fetchCustomers() {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('isDeleted', false)
          .order('createdAt', { ascending: false });
        if (error) throw error;
        console.log('[Database Service] Successfully fetched customers from Supabase.');
        return data;
      } catch (err) {
        console.error('[Database Service] Supabase customers fetch failed, falling back to LocalStorage:', err.message);
      }
    }
    return initLocalStorageDB().customers.filter(c => !c.isDeleted);
  },

  async saveCustomer(customer) {
    // Save to LocalStorage first to ensure zero data loss
    const localCustomers = initLocalStorageDB().customers;
    const exists = localCustomers.some(c => c.id === customer.id);
    const updatedLocal = exists 
      ? localCustomers.map(c => c.id === customer.id ? customer : c)
      : [...localCustomers, customer];
    dbAPI.saveCustomers(updatedLocal);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('customers')
          .upsert(customer);
        if (error) throw error;
        console.log(`[Database Service] Successfully saved customer ${customer.id} to Supabase.`);
        return true;
      } catch (err) {
        console.error(`[Database Service] Failed to save customer ${customer.id} to Supabase:`, err.message);
      }
    }
    return false;
  },

  async deleteCustomer(customerId) {
    // LocalStorage soft delete
    const localCustomers = initLocalStorageDB().customers;
    const updatedLocal = localCustomers.map(c => 
      c.id === customerId ? { ...c, isDeleted: true } : c
    );
    dbAPI.saveCustomers(updatedLocal);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('customers')
          .update({ isDeleted: true })
          .eq('id', customerId);
        if (error) throw error;
        console.log(`[Database Service] Successfully soft-deleted customer ${customerId} in Supabase.`);
        return true;
      } catch (err) {
        console.error(`[Database Service] Failed to soft-delete customer ${customerId} in Supabase:`, err.message);
      }
    }
    return false;
  },

  // --- ACTIVITIES ---
  async fetchActivities() {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('activities')
          .select('*')
          .order('timestamp', { ascending: false });
        if (error) throw error;
        return data;
      } catch (err) {
        console.error('[Database Service] Supabase activities fetch failed:', err.message);
      }
    }
    return initLocalStorageDB().activities;
  },

  async saveActivity(activity) {
    const localActivities = initLocalStorageDB().activities;
    dbAPI.saveActivities([activity, ...localActivities]);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('activities')
          .insert(activity);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error('[Database Service] Failed to log activity to Supabase:', err.message);
      }
    }
    return false;
  },

  // --- NOTES ---
  async fetchNotes() {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .order('timestamp', { ascending: false });
        if (error) throw error;
        return data;
      } catch (err) {
        console.error('[Database Service] Supabase notes fetch failed:', err.message);
      }
    }
    return initLocalStorageDB().notes;
  },

  async saveNote(note) {
    const localNotes = initLocalStorageDB().notes;
    dbAPI.saveNotes([note, ...localNotes]);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('notes')
          .insert(note);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error('[Database Service] Failed to save note to Supabase:', err.message);
      }
    }
    return false;
  },

  // --- PAYMENTS ---
  async fetchPayments() {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .order('timestamp', { ascending: false });
        if (error) throw error;
        return data;
      } catch (err) {
        console.error('[Database Service] Supabase payments fetch failed:', err.message);
      }
    }
    return initLocalStorageDB().payments;
  },

  async savePayment(payment) {
    const localPayments = initLocalStorageDB().payments;
    dbAPI.savePayments([payment, ...localPayments]);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('payments')
          .insert(payment);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error('[Database Service] Failed to save payment record to Supabase:', err.message);
      }
    }
    return false;
  },

  // --- REMINDERS ---
  async fetchReminders() {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('reminders')
          .select('*');
        if (error) throw error;
        return data;
      } catch (err) {
        console.error('[Database Service] Supabase reminders fetch failed:', err.message);
      }
    }
    return initLocalStorageDB().reminders;
  },

  async saveReminder(reminder) {
    const localReminders = initLocalStorageDB().reminders;
    const exists = localReminders.some(r => r.id === reminder.id);
    const updatedLocal = exists
      ? localReminders.map(r => r.id === reminder.id ? reminder : r)
      : [...localReminders, reminder];
    dbAPI.saveReminders(updatedLocal);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('reminders')
          .upsert(reminder);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error('[Database Service] Failed to save reminder to Supabase:', err.message);
      }
    }
    return false;
  },

  // --- STAGES ---
  async fetchStages() {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('stages')
          .select('*')
          .order('stageOrder', { ascending: true });
        if (error) throw error;
        return data;
      } catch (err) {
        console.error('[Database Service] Supabase stages fetch failed:', err.message);
      }
    }
    return initLocalStorageDB().stages;
  },

  async saveStage(stage) {
    const localStages = initLocalStorageDB().stages;
    const exists = localStages.some(s => s.stageName === stage.stageName);
    const updatedLocal = exists
      ? localStages.map(s => s.stageName === stage.stageName ? stage : s)
      : [...localStages, stage];
    dbAPI.saveStages(updatedLocal);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('stages')
          .upsert(stage);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error('[Database Service] Failed to save stage config to Supabase:', err.message);
      }
    }
    return false;
  },

  async saveAllStages(stagesList) {
    dbAPI.saveStages(stagesList);
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('stages')
          .upsert(stagesList);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error('[Database Service] Failed to bulk save stages to Supabase:', err.message);
      }
    }
    return false;
  },

  async deleteStage(stageName) {
    const localStages = initLocalStorageDB().stages;
    const updatedLocal = localStages.filter(s => s.stageName !== stageName);
    dbAPI.saveStages(updatedLocal);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('stages')
          .delete()
          .eq('stageName', stageName);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error('[Database Service] Failed to delete stage in Supabase:', err.message);
      }
    }
    return false;
  }
};
