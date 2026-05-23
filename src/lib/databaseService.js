import { supabase } from './supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('YOUR_PROJECT') && 
  supabaseUrl.startsWith('https://');

console.log(`[Database Engine] Supabase configured status: ${isSupabaseConfigured}`);

// Helper to ensure robust UUIDs are used for all Postgres tables
const ensureUUID = (id) => {
  if (!id) return crypto.randomUUID();
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  return isUUID ? id : crypto.randomUUID();
};

// Safe date parser to protect against "Invalid Date" crashes
const parseSafeDate = (d, fallback = null) => {
  if (!d) return fallback;
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return fallback;
  return dateObj.toISOString();
};

// --- DATA SCHEMA TRANSLATION MAPPERS ---

const mapToSupabase = (c) => {
  if (!c) return {};
  const advance = parseFloat(c.advancePaid || 0);
  const total = parseFloat(c.amount || 0);
  const pending = total - advance;
  
  return {
    id: ensureUUID(c.id),
    customer_name: c.customerName || '',
    phone: c.phone || '',
    address: c.address || '',
    requirement: c.requirement || '',
    project_type: c.projectType || 'Hardware',
    sales_stage: c.stage || 'New Lead',
    assigned_staff: c.assignedStaff || '',
    followup_date: parseSafeDate(c.followupDate),
    items: c.items || [],
    subtotal: parseFloat(c.subtotal || 0),
    discount: parseFloat(c.discount || 0),
    tax_percent: parseFloat(c.taxPercent || 18),
    tax_amount: parseFloat(c.taxAmount || 0),
    amount: total,
    advance_paid: advance,
    pending_amount: pending,
    payment_status: c.paymentStatus || 'Pending',
    priority: c.priority || 'Medium',
    tags: c.tags || [],
    is_deleted: c.isDeleted || false,
    created_at: parseSafeDate(c.createdAt, new Date().toISOString())
  };
};

const mapFromSupabase = (s) => {
  if (!s) return {};
  const advance = parseFloat(s.advance_paid || 0);
  const total = parseFloat(s.amount || 0);
  const pending = parseFloat(s.pending_amount || (total - advance));
  const paymentStatus = s.payment_status || (advance === 0 ? 'Pending' : (pending <= 0 ? 'Paid' : 'Partial'));

  return {
    id: s.id,
    customerName: s.customer_name || '',
    phone: s.phone || '',
    address: s.address || '',
    requirement: s.requirement || '',
    projectType: s.project_type || 'Hardware',
    stage: s.sales_stage || 'New Lead',
    assignedStaff: s.assigned_staff || '',
    followupDate: s.followup_date ? s.followup_date.split('T')[0] : '',
    items: s.items || [],
    subtotal: parseFloat(s.subtotal || 0),
    discount: parseFloat(s.discount || 0),
    taxPercent: parseFloat(s.tax_percent || 18),
    taxAmount: parseFloat(s.tax_amount || 0),
    amount: total,
    advancePaid: advance,
    pendingAmount: pending,
    paymentStatus: paymentStatus,
    priority: s.priority || 'Medium',
    tags: s.tags || [],
    isDeleted: s.is_deleted || false,
    createdAt: s.created_at || new Date().toISOString()
  };
};

const mapActivityToSupabase = (a) => ({
  id: ensureUUID(a.id),
  customer_id: ensureUUID(a.customerId),
  action_type: a.actionType || 'custom',
  old_value: a.oldValue || '',
  new_value: a.newValue || '',
  updated_by: a.updatedBy || 'System',
  created_at: parseSafeDate(a.timestamp, new Date().toISOString())
});

const mapActivityFromSupabase = (a) => ({
  id: a.id,
  customerId: a.customer_id,
  actionType: a.action_type,
  oldValue: a.old_value,
  newValue: a.new_value,
  updatedBy: a.updated_by,
  timestamp: a.created_at
});

const mapNoteToSupabase = (n) => ({
  id: ensureUUID(n.id),
  customer_id: ensureUUID(n.customerId),
  note_text: n.noteText || '',
  added_by: n.addedBy || 'System',
  created_at: parseSafeDate(n.timestamp, new Date().toISOString())
});

const mapNoteFromSupabase = (n) => ({
  id: n.id,
  customerId: n.customer_id,
  noteText: n.note_text,
  addedBy: n.added_by,
  timestamp: n.created_at
});

const mapPaymentToSupabase = (p) => ({
  id: ensureUUID(p.id),
  customer_id: ensureUUID(p.customerId),
  amount_paid: parseFloat(p.amountPaid || 0),
  payment_mode: p.paymentMode || 'Cash',
  updated_by: p.updatedBy || 'System',
  note: p.note || '',
  created_at: parseSafeDate(p.timestamp, new Date().toISOString())
});

const mapPaymentFromSupabase = (p) => ({
  id: p.id,
  customerId: p.customer_id,
  amountPaid: parseFloat(p.amount_paid || 0),
  paymentMode: p.payment_mode || 'Cash',
  updatedBy: p.updated_by || 'System',
  timestamp: p.created_at,
  note: p.note || ''
});

const mapReminderToSupabase = (r) => ({
  id: ensureUUID(r.id),
  customer_id: ensureUUID(r.customerId),
  reminder_type: r.reminderType || 'Follow-up Call',
  reminder_date: parseSafeDate(r.reminderDate, new Date().toISOString()),
  status: r.status || 'Pending',
  notes: r.notes || ''
});

const mapReminderFromSupabase = (r) => ({
  id: r.id,
  customerId: r.customer_id,
  reminderType: r.reminder_type,
  reminderDate: r.reminder_date,
  status: r.status,
  notes: r.notes
});

const mapStageToSupabase = (s) => ({
  stage_name: s.stageName,
  stage_color: s.stageColor,
  stage_order: parseInt(s.stageOrder || 1)
});

const mapStageFromSupabase = (s) => ({
  stageName: s.stage_name,
  stageColor: s.stage_color,
  stageOrder: s.stage_order
});

const mapFileToSupabase = (f) => ({
  id: ensureUUID(f.id),
  customer_id: ensureUUID(f.customerId),
  file_name: f.fileName,
  file_type: f.fileType || 'Site Photo',
  file_size: f.fileSize || null,
  file_url: f.fileUrl,
  uploaded_by: f.uploadedBy || 'System',
  created_at: parseSafeDate(f.uploadedAt, new Date().toISOString())
});

const mapFileFromSupabase = (f) => ({
  id: f.id,
  customerId: f.customer_id,
  fileName: f.file_name,
  fileType: f.file_type,
  fileSize: f.file_size,
  imageUrl: f.file_url, // URL compatibility for UI <img src={img.imageUrl}>
  fileUrl: f.file_url,
  uploadedBy: f.uploaded_by,
  uploadedAt: f.created_at
});

const defaultStages = [
  { stageName: 'New Lead', stageColor: '#3B82F6', stageOrder: 1 },
  { stageName: 'Quotation Sent', stageColor: '#F59E0B', stageOrder: 2 },
  { stageName: 'Negotiation', stageColor: '#A855F7', stageOrder: 3 },
  { stageName: 'Converted', stageColor: '#10B981', stageOrder: 4 },
  { stageName: 'Lost', stageColor: '#EF4444', stageOrder: 5 }
];

export const databaseService = {
  // --- CUSTOMERS CRUD (PURE SUPABASE WITH STANDARD postgres SNAKE_CASE COLUMNS) ---
  
  async createCustomer(customer) {
    try {
      console.log('[Database Service] Creating customer in Supabase:', customer?.id);
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
      console.log('[Database Service] Updating customer:', customerId);
      
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
      console.log('[Database Service] Performing cascade soft/hard delete of customer:', customerId);
      // To perform a soft delete we update the `is_deleted` column to true!
      const { error } = await supabase
        .from('customers')
        .update({ is_deleted: true })
        .eq('id', customerId);

      if (error) {
        console.error('[Database Service] Supabase soft delete customer error:', error);
        throw error;
      }
      return true;
    } catch (err) {
      console.error('[Database Service] deleteCustomer Exception:', err.message || err);
      throw err;
    }
  },

  // Backwards compatible alias
  async fetchCustomers() {
    return await this.getCustomers();
  },

  // --- ACTIVITIES LEDGER ---
  async fetchActivities() {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapActivityFromSupabase);
    } catch (err) {
      console.error('[Database Service] fetchActivities failed:', err.message || err);
      return [];
    }
  },

  async saveActivity(activity) {
    try {
      const dbObj = mapActivityToSupabase(activity);
      const { error } = await supabase
        .from('activities')
        .insert([dbObj]);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Database Service] saveActivity failed:', err.message || err);
      return false;
    }
  },

  // --- NOTES ---
  async fetchNotes() {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapNoteFromSupabase);
    } catch (err) {
      console.error('[Database Service] fetchNotes failed:', err.message || err);
      return [];
    }
  },

  async saveNote(note) {
    try {
      const dbObj = mapNoteToSupabase(note);
      const { error } = await supabase
        .from('notes')
        .insert([dbObj]);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Database Service] saveNote failed:', err.message || err);
      return false;
    }
  },

  // --- PAYMENTS ---
  async fetchPayments() {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapPaymentFromSupabase);
    } catch (err) {
      console.error('[Database Service] fetchPayments failed:', err.message || err);
      return [];
    }
  },

  async savePayment(payment) {
    try {
      const dbObj = mapPaymentToSupabase(payment);
      const { error } = await supabase
        .from('payments')
        .insert([dbObj]);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Database Service] savePayment failed:', err.message || err);
      return false;
    }
  },

  // --- REMINDERS ---
  async fetchReminders() {
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .order('reminder_date', { ascending: true });
      if (error) throw error;
      return (data || []).map(mapReminderFromSupabase);
    } catch (err) {
      console.error('[Database Service] fetchReminders failed:', err.message || err);
      return [];
    }
  },

  async saveReminder(reminder) {
    try {
      const dbObj = mapReminderToSupabase(reminder);
      const { error } = await supabase
        .from('reminders')
        .upsert([dbObj]);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Database Service] saveReminder failed:', err.message || err);
      return false;
    }
  },

  // --- STAGES lookup ---
  async fetchStages() {
    try {
      const { data, error } = await supabase
        .from('stages')
        .select('*')
        .order('stage_order', { ascending: true });
      if (error) throw error;
      return data && data.length > 0 ? data.map(mapStageFromSupabase) : defaultStages;
    } catch (err) {
      console.error('[Database Service] fetchStages failed:', err.message || err);
      return defaultStages;
    }
  },

  async saveStage(stage) {
    try {
      const dbObj = mapStageToSupabase(stage);
      const { error } = await supabase
        .from('stages')
        .upsert([dbObj]);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Database Service] saveStage failed:', err.message || err);
      return false;
    }
  },

  async saveAllStages(stagesList) {
    try {
      const dbObjs = stagesList.map(mapStageToSupabase);
      const { error } = await supabase
        .from('stages')
        .upsert(dbObjs);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Database Service] saveAllStages failed:', err.message || err);
      return false;
    }
  },

  async deleteStage(stageName) {
    try {
      const { error } = await supabase
        .from('stages')
        .delete()
        .eq('stage_name', stageName);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Database Service] deleteStage failed:', err.message || err);
      return false;
    }
  },

  // --- CLOUD FILE STORAGE INTEGRATION ---

  async fetchFiles(customerId) {
    try {
      console.log('[Database Service] Fetching cloud files for customer:', customerId);
      const { data, error } = await supabase
        .from('customer_files')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapFileFromSupabase);
    } catch (err) {
      console.error('[Database Service] fetchFiles failed:', err.message || err);
      return [];
    }
  },

  async uploadCustomerFile(customerId, file, imageType = 'Site Photo', uploadedBy = 'System') {
    try {
      console.log(`[Database Service] Uploading ${file.name} to storage bucket 'customer-images'...`);
      
      // Clean file name to prevent encoding conflicts
      const cleanedFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const uniquePath = `${customerId}/${Date.now()}_${cleanedFileName}`;

      // 1. Upload binary file to customer-images bucket
      const { data: storageData, error: storageError } = await supabase.storage
        .from('customer-images')
        .upload(uniquePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (storageError) {
        console.error('[Database Service] Supabase Storage upload error:', storageError);
        throw storageError;
      }

      // 2. Fetch the newly uploaded file's public URL
      const { data: { publicUrl } } = supabase.storage
        .from('customer-images')
        .getPublicUrl(uniquePath);

      console.log('[Database Service] Cloud storage file public URL:', publicUrl);

      // 3. Save database metadata record in customer_files table
      const fileRecord = {
        id: crypto.randomUUID(),
        customerId,
        fileName: file.name,
        fileType: imageType,
        fileSize: file.size,
        fileUrl: publicUrl,
        uploadedBy,
        uploadedAt: new Date().toISOString()
      };

      const dbObj = mapFileToSupabase(fileRecord);
      const { data: dbData, error: dbError } = await supabase
        .from('customer_files')
        .insert([dbObj])
        .select();

      if (dbError) {
        console.error('[Database Service] Supabase insert customer_files error:', dbError);
        throw dbError;
      }

      return dbData && dbData.length > 0 ? mapFileFromSupabase(dbData[0]) : null;
    } catch (err) {
      console.error('[Database Service] uploadCustomerFile Exception:', err.message || err);
      throw err;
    }
  },

  async deleteCustomerFile(fileId, customerId, fileUrl) {
    try {
      console.log('[Database Service] Deleting cloud file:', fileId);
      
      // Extract storage path from the publicUrl
      // Example public URL: https://zypxjyrcpkixffevwwti.supabase.co/storage/v1/object/public/customer-images/customer_id/1234_file.jpg
      // Path needed: customer_id/1234_file.jpg
      const bucketMarker = '/customer-images/';
      const urlIndex = fileUrl.indexOf(bucketMarker);
      if (urlIndex > -1) {
        const storagePath = decodeURIComponent(fileUrl.substring(urlIndex + bucketMarker.length));
        console.log('[Database Service] Extracted storage bucket path:', storagePath);
        
        // 1. Delete from Supabase Storage
        const { error: storageError } = await supabase.storage
          .from('customer-images')
          .remove([storagePath]);

        if (storageError) {
          console.warn('[Database Service] Storage file remove warning (might already be deleted):', storageError.message);
        }
      }

      // 2. Delete the metadata record from customer_files table
      const { error: dbError } = await supabase
        .from('customer_files')
        .delete()
        .eq('id', fileId);

      if (dbError) {
        console.error('[Database Service] Database delete customer_files record error:', dbError);
        throw dbError;
      }

      return true;
    } catch (err) {
      console.error('[Database Service] deleteCustomerFile Exception:', err.message || err);
      throw err;
    }
  },

  // --- QUOTATIONS & INVOICES PROPORTIONS ---

  async saveQuotationRecord(quotation) {
    try {
      const dbObj = {
        id: ensureUUID(quotation.id),
        customer_id: ensureUUID(quotation.customerId),
        quotation_number: quotation.quotationNumber,
        status: quotation.status || 'Draft',
        valid_until: parseSafeDate(quotation.validUntil),
        items: quotation.items || [],
        subtotal: parseFloat(quotation.subtotal || 0),
        discount: parseFloat(quotation.discount || 0),
        tax_amount: parseFloat(quotation.taxAmount || 0),
        total_amount: parseFloat(quotation.totalAmount || 0),
        file_url: quotation.fileUrl || null
      };

      const { data, error } = await supabase
        .from('quotations')
        .upsert([dbObj])
        .select();

      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    } catch (err) {
      console.error('[Database Service] saveQuotationRecord failed:', err.message || err);
      throw err;
    }
  },

  async saveInvoiceRecord(invoice) {
    try {
      const dbObj = {
        id: ensureUUID(invoice.id),
        customer_id: ensureUUID(invoice.customerId),
        invoice_number: invoice.invoiceNumber,
        status: invoice.status || 'Unpaid',
        due_date: parseSafeDate(invoice.dueDate),
        items: invoice.items || [],
        subtotal: parseFloat(invoice.subtotal || 0),
        discount: parseFloat(invoice.discount || 0),
        tax_amount: parseFloat(invoice.taxAmount || 0),
        total_amount: parseFloat(invoice.totalAmount || 0),
        file_url: invoice.fileUrl || null
      };

      const { data, error } = await supabase
        .from('invoices')
        .upsert([dbObj])
        .select();

      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    } catch (err) {
      console.error('[Database Service] saveInvoiceRecord failed:', err.message || err);
      throw err;
    }
  }
};
