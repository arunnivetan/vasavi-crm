import React, { createContext, useContext, useState, useEffect } from 'react';
import { databaseService } from '../lib/databaseService';
import { supabase } from '../lib/supabase';

const CRMDatabaseContext = createContext(null);

export const useCRMDatabase = () => {
  const context = useContext(CRMDatabaseContext);
  if (!context) {
    throw new Error('useCRMDatabase must be used within a CRMDatabaseProvider');
  }
  return context;
};

export const CRMDatabaseProvider = ({ children }) => {
  const [customers, setCustomers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [notes, setNotes] = useState([]);
  const [payments, setPayments] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [stages, setStages] = useState([]);
  const [bills, setBills] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeStaff, setActiveStaff] = useState('Suresh'); // Default selected staff member

  // List of available staff members for dropdown selectors
  const staffList = ['Suresh', 'Suresh babu', 'Ravi', 'Arun', 'Admin'];

  const refreshDatabase = async () => {
    setIsLoading(true);
    try {
      console.log('[CRM Context] Initializing Supabase database synchronization...');
      const [custs, acts, nts, pmts, rems, stgs, bls] = await Promise.all([
        databaseService.getCustomers(),
        databaseService.fetchActivities(),
        databaseService.fetchNotes(),
        databaseService.fetchPayments(),
        databaseService.fetchReminders(),
        databaseService.fetchStages(),
        databaseService.fetchBills()
      ]);
      
      // --- AUTO-BACKFILL LEGACY CUSTOMERS ---
      let hasUpdates = false;
      const currentYear = new Date().getFullYear();
      let maxCustNumber = 0;
      
      // Find the maximum customer number sequence already defined for the current year
      (custs || []).forEach(c => {
        if (c.customerNo && c.customerNo.startsWith(`SVP-CUS-${currentYear}-`)) {
          const parts = c.customerNo.split('-');
          const numStr = parts[parts.length - 1];
          const num = parseInt(numStr, 10);
          if (!isNaN(num) && num > maxCustNumber) {
            maxCustNumber = num;
          }
        }
      });

      // Sort customers by creation date ascending so backfill sequences match creation order
      const sortedCusts = [...(custs || [])].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      for (let c of sortedCusts) {
        let updatedFields = {};
        let needsUpdate = false;

        if (!c.customerNo) {
          maxCustNumber += 1;
          const formattedNo = `SVP-CUS-${currentYear}-${maxCustNumber.toString().padStart(4, '0')}`;
          c.customerNo = formattedNo;
          updatedFields.customerNo = formattedNo;
          needsUpdate = true;
        }

        if (!c.latestBillNo) {
          const billTag = (c.tags || []).find(t => t.startsWith('BILL:'));
          if (billTag) {
            const billNo = billTag.split(':')[1];
            c.latestBillNo = billNo;
            updatedFields.latestBillNo = billNo;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          console.log(`[CRM Context] Backfilling customer details for ${c.customerName}:`, updatedFields);
          await databaseService.updateCustomer(c.id, updatedFields);
          hasUpdates = true;
        }
      }

      let finalCusts = custs || [];
      if (hasUpdates) {
        console.log('[CRM Context] Re-fetching customers after backfill updates...');
        finalCusts = await databaseService.getCustomers();
      }

      setCustomers(finalCusts);
      setActivities(acts || []);
      setNotes(nts || []);
      setPayments(pmts || []);
      setReminders(rems || []);
      setStages(stgs || []);
      setBills(bls || []);
      console.log('[CRM Context] Supabase database synchronization complete.');
    } catch (err) {
      console.error('[CRM Context] Supabase initial database sync failed:', err?.message || err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load database asynchronously on mount
  useEffect(() => {
    refreshDatabase();
  }, []);

  // --- BUSINESS LOGIC MUTATIONS WITH PURE SUPABASE CRUD ---

  // 1. Add Customer (with decoupled try/catch blocks for child inserts to prevent transaction hangs)
  const addCustomer = async (customerData, staffName = activeStaff) => {
    try {
      console.log('[CRM Context] Adding customer via Supabase:', customerData?.customerName);
      const newId = crypto.randomUUID();
      
      // items and math calculation
      const items = customerData?.items || [];
      const subtotal = parseFloat(customerData?.subtotal || 0);
      const discount = parseFloat(customerData?.discount || 0);
      const taxPercent = parseFloat(customerData?.taxPercent || 0);
      const taxAmount = parseFloat(customerData?.taxAmount || 0);
      const totalAmount = parseFloat(customerData?.amount || (subtotal - discount + taxAmount));
      
      const advancePaid = parseFloat(customerData?.advancePaid || 0);
      const pendingAmount = totalAmount - advancePaid;
      let paymentStatus = 'Pending';
      if (advancePaid > 0) {
        paymentStatus = pendingAmount <= 0 ? 'Paid' : 'Partial';
      }

      // Auto-generate Unique Customer Number (Format: SVP-CUS-YYYY-XXXX)
      const currentYear = new Date().getFullYear();
      let maxCustNumber = 0;
      (customers || []).forEach(c => {
        if (c.customerNo && c.customerNo.startsWith(`SVP-CUS-${currentYear}-`)) {
          const parts = c.customerNo.split('-');
          const numStr = parts[parts.length - 1];
          const num = parseInt(numStr, 10);
          if (!isNaN(num) && num > maxCustNumber) {
            maxCustNumber = num;
          }
        }
      });
      const nextCustNumber = maxCustNumber + 1;
      const formattedCustomerNumber = `SVP-CUS-${currentYear}-${nextCustNumber.toString().padStart(4, '0')}`;

      const newCustomer = {
        id: newId,
        customerName: customerData?.customerName || '',
        phone: customerData?.phone || '',
        address: customerData?.address || '',
        requirement: customerData?.requirement || 'Standard supplies', 
        projectType: customerData?.projectType || 'Hardware',
        stage: customerData?.stage || 'New Lead',
        assignedStaff: customerData?.assignedStaff || staffName,
        followupDate: customerData?.followupDate || '',
        
        // Costing columns
        items: items,
        subtotal: subtotal,
        discount: discount,
        taxPercent: taxPercent,
        taxAmount: taxAmount,
        
        amount: totalAmount,
        advancePaid: advancePaid,
        pendingAmount: pendingAmount,
        paymentStatus: paymentStatus,
        priority: customerData?.priority || 'Medium',
        tags: customerData?.tags || [],
        createdAt: new Date().toISOString(),
        isDeleted: false,
        customerNo: formattedCustomerNumber,
        latestBillNo: null
      };

      // 1. Insert Customer Record into Supabase (Must complete first)
      const created = await databaseService.createCustomer(newCustomer);
      const activeCustomerId = created?.id || newId;
      console.log(`[CRM Context] Customer inserted successfully. Active ID: ${activeCustomerId}`);

      // 2. Insert initial payment record if advance was paid (Decoupled)
      if (advancePaid > 0) {
        try {
          console.log('[CRM Context] Creating decoupled initial payment record...');
          const newPayRecord = {
            id: 'pay_' + Date.now(),
            customerId: activeCustomerId,
            amountPaid: advancePaid,
            paymentMode: customerData?.paymentMode || 'Cash',
            updatedBy: staffName,
            timestamp: new Date().toISOString(),
            note: 'Initial Advance Payment'
          };
          await databaseService.savePayment(newPayRecord);
          console.log('[CRM Context] Initial payment saved successfully.');
        } catch (payErr) {
          console.error('[CRM Context] Decoupled payment insert failed:', payErr?.message || payErr);
        }
      }

      // 3. Log activity history (Decoupled)
      try {
        console.log('[CRM Context] Logging customer_created activity...');
        const activity = {
          customerId: activeCustomerId,
          actionType: 'customer_created',
          oldValue: '',
          newValue: `${newCustomer.customerName} added with ${items?.length || 0} items. Total: Rs. ${totalAmount}`,
          updatedBy: staffName,
          timestamp: new Date().toISOString()
        };
        await databaseService.saveActivity(activity);
        console.log('[CRM Context] Customer activity log saved.');
      } catch (actErr) {
        console.error('[CRM Context] Decoupled activity insert failed:', actErr?.message || actErr);
      }

      // 4. Set follow-up reminder if followupDate is provided (Decoupled)
      if (newCustomer.followupDate) {
        try {
          console.log('[CRM Context] Setting followup reminder alert...');
          const newReminder = {
            id: 'rem_' + Date.now(),
            customerId: activeCustomerId,
            reminderType: 'Follow-up Call',
            reminderDate: newCustomer.followupDate,
            status: 'Pending',
            notes: 'Auto-created from customer creation'
          };
          await databaseService.saveReminder(newReminder);
          console.log('[CRM Context] Followup reminder saved.');
        } catch (remErr) {
          console.error('[CRM Context] Decoupled reminder insert failed:', remErr?.message || remErr);
        }
      }

      // Live refresh database context state
      await refreshDatabase();
      return created;
    } catch (err) {
      console.error('[CRM Context] addCustomer Main Exception:', err?.message || err);
      throw err;
    }
  };

  // 2. Edit Customer
  const editCustomer = async (customerId, updatedFields, staffName = activeStaff) => {
    try {
      console.log('[CRM Context] Editing customer:', customerId);
      const original = customers.find(c => c.id === customerId);
      if (!original) return;

      let updated = { ...original, ...updatedFields };
      
      if (
        updatedFields?.items !== undefined ||
        updatedFields?.subtotal !== undefined ||
        updatedFields?.discount !== undefined ||
        updatedFields?.taxPercent !== undefined ||
        updatedFields?.amount !== undefined ||
        updatedFields?.advancePaid !== undefined
      ) {
        const subtotal = parseFloat(updated.subtotal || 0);
        const discount = parseFloat(updated.discount || 0);
        const taxPercent = parseFloat(updated.taxPercent || 0);
        
        if (updatedFields.amount === undefined) {
          updated.taxAmount = ((subtotal - discount) * taxPercent) / 100;
          updated.amount = subtotal - discount + updated.taxAmount;
        }
        
        const amount = parseFloat(updated.amount || 0);
        const advance = parseFloat(updated.advancePaid || 0);
        updated.pendingAmount = amount - advance;
        
        if (advance === 0) {
          updated.paymentStatus = 'Pending';
        } else {
          updated.paymentStatus = updated.pendingAmount <= 0 ? 'Paid' : 'Partial';
        }
      }

      // Capture changed fields for activity logging
      const changes = [];
      Object.keys(updatedFields || {}).forEach(key => {
        if (original[key] !== updatedFields[key] && key !== 'isDeleted') {
          if (key === 'items') {
            changes.push(`Materials list updated (${updatedFields[key]?.length || 0} products)`);
          } else {
            changes.push(`${key}: "${original[key]}" → "${updatedFields[key]}"`);
          }
        }
      });

      // Update in Supabase
      await databaseService.updateCustomer(customerId, updated);

      // Save activity log
      if (changes.length > 0) {
        const activity = {
          customerId,
          actionType: 'customer_edited',
          oldValue: '',
          newValue: `Updated: ${changes.join(', ')}. New Grand Total: Rs. ${updated.amount}`,
          updatedBy: staffName,
          timestamp: new Date().toISOString()
        };
        await databaseService.saveActivity(activity);
      }

      // Sync automatic reminder if followup date changes
      if (updatedFields?.followupDate && updatedFields.followupDate !== original.followupDate) {
        const newReminder = {
          id: 'rem_' + Date.now(),
          customerId,
          reminderType: 'Follow-up Call',
          reminderDate: updatedFields.followupDate,
          status: 'Pending',
          notes: 'Follow-up date updated'
        };
        await databaseService.saveReminder(newReminder);
      }

      // Live refresh
      await refreshDatabase();
    } catch (err) {
      console.error('[CRM Context] editCustomer Exception:', err?.message || err);
      throw err;
    }
  };

  // 3. Move Pipeline Stage
  const updateCustomerStage = async (customerId, newStage, staffName = activeStaff) => {
    try {
      console.log('[CRM Context] Updating customer stage:', customerId, newStage);
      const customer = customers.find(c => c.id === customerId);
      if (!customer) return;

      const oldStage = customer.stage;
      if (oldStage === newStage) return;

      // Update in Supabase
      await databaseService.updateCustomer(customerId, { stage: newStage });

      const activity = {
        customerId,
        actionType: 'stage_update',
        oldValue: oldStage,
        newValue: newStage,
        updatedBy: staffName,
        timestamp: new Date().toISOString()
      };
      await databaseService.saveActivity(activity);

      // Live refresh
      await refreshDatabase();
    } catch (err) {
      console.error('[CRM Context] updateCustomerStage Exception:', err?.message || err);
    }
  };

  // 4. Update Payment / Add Payment Transaction
  const addPaymentTransaction = async (customerId, amountPaid, paymentMode = 'Cash', note = '', staffName = activeStaff) => {
    try {
      console.log('[CRM Context] Adding payment transaction:', customerId, amountPaid);
      const customer = customers.find(c => c.id === customerId);
      if (!customer) return;

      const pAmount = parseFloat(amountPaid || 0);
      const newAdvance = parseFloat(customer.advancePaid || 0) + pAmount;
      const totalAmount = parseFloat(customer.amount || 0);
      const newPending = totalAmount - newAdvance;
      
      let newStatus = 'Pending';
      if (newAdvance > 0) {
        newStatus = newPending <= 0 ? 'Paid' : 'Partial';
      }

      // Update Customer values in Supabase
      await databaseService.updateCustomer(customerId, {
        advancePaid: newAdvance,
        pendingAmount: newPending,
        paymentStatus: newStatus
      });

      // Save transaction record inside Supabase
      const newPayRecord = {
        id: 'pay_' + Date.now(),
        customerId,
        amountPaid: pAmount,
        paymentMode,
        updatedBy: staffName,
        timestamp: new Date().toISOString(),
        note: note || 'Payment installment received'
      };
      await databaseService.savePayment(newPayRecord);

      // Save Activity Log inside Supabase
      const activity = {
        customerId,
        actionType: 'payment_update',
        oldValue: `${customer.paymentStatus} (Bal: Rs. ${customer.pendingAmount})`,
        newValue: `Payment: Rs. ${pAmount} received. Balance: Rs. ${newPending} (${newStatus})`,
        updatedBy: staffName,
        timestamp: new Date().toISOString()
      };
      await databaseService.saveActivity(activity);

      // Live refresh
      await refreshDatabase();
    } catch (err) {
      console.error('[CRM Context] addPaymentTransaction Exception:', err?.message || err);
    }
  };

  // Mark customer fully paid
  const markCustomerPaid = async (customerId, staffName = activeStaff) => {
    try {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) return;

      const pending = parseFloat(customer.pendingAmount || 0);
      if (pending <= 0) return;

      await addPaymentTransaction(customerId, pending, 'GPay', 'Marked full payment completed', staffName);
    } catch (err) {
      console.error('[CRM Context] markCustomerPaid Exception:', err?.message || err);
    }
  };

  // 5. Add Note
  const addCustomerNote = async (customerId, noteText, staffName = activeStaff) => {
    try {
      console.log('[CRM Context] Adding customer note:', customerId);
      const newNote = {
        id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        customerId,
        noteText,
        addedBy: staffName,
        timestamp: new Date().toISOString()
      };

      await databaseService.saveNote(newNote);

      const activity = {
        customerId,
        actionType: 'note_added',
        oldValue: '',
        newValue: `Added note: "${noteText?.length > 30 ? noteText.substring(0, 30) + '...' : noteText}"`,
        updatedBy: staffName,
        timestamp: new Date().toISOString()
      };
      await databaseService.saveActivity(activity);

      // Live refresh
      await refreshDatabase();
    } catch (err) {
      console.error('[CRM Context] addCustomerNote Exception:', err?.message || err);
    }
  };

  // 6. Reminders System
  const createReminder = async (customerId, reminderType, reminderDate, notesText = '', staffName = activeStaff) => {
    try {
      console.log('[CRM Context] Creating reminder:', customerId);
      const newReminder = {
        id: 'rem_' + Date.now(),
        customerId,
        reminderType, 
        reminderDate,
        status: 'Pending',
        notes: notesText
      };

      await databaseService.saveReminder(newReminder);

      const activity = {
        customerId,
        actionType: 'followup_update',
        oldValue: '',
        newValue: `Scheduled ${reminderType} on ${reminderDate?.split('T')[0]}`,
        updatedBy: staffName,
        timestamp: new Date().toISOString()
      };
      await databaseService.saveActivity(activity);

      // Live refresh
      await refreshDatabase();
    } catch (err) {
      console.error('[CRM Context] createReminder Exception:', err?.message || err);
    }
  };

  const snoozeReminder = async (reminderId, newDate, staffName = activeStaff) => {
    try {
      console.log('[CRM Context] Snoozing reminder:', reminderId);
      const reminder = reminders.find(r => r.id === reminderId);
      if (!reminder) return;

      const updatedRem = { ...reminder, reminderDate: newDate, status: 'Snoozed' };

      await databaseService.saveReminder(updatedRem);

      const activity = {
        customerId: reminder.customerId,
        actionType: 'reminder_snoozed',
        oldValue: reminder.reminderDate?.split('T')[0] || '',
        newValue: `Snoozed to ${newDate?.split('T')[0] || ''}`,
        updatedBy: staffName,
        timestamp: new Date().toISOString()
      };
      await databaseService.saveActivity(activity);

      // Live refresh
      await refreshDatabase();
    } catch (err) {
      console.error('[CRM Context] snoozeReminder Exception:', err?.message || err);
    }
  };

  const completeReminder = async (reminderId, staffName = activeStaff) => {
    try {
      console.log('[CRM Context] Completing reminder:', reminderId);
      const reminder = reminders.find(r => r.id === reminderId);
      if (!reminder) return;

      const updatedRem = { ...reminder, status: 'Completed' };

      await databaseService.saveReminder(updatedRem);

      const activity = {
        customerId: reminder.customerId,
        actionType: 'reminder_completed',
        oldValue: 'Pending',
        newValue: `Completed: ${reminder.reminderType}`,
        updatedBy: staffName,
        timestamp: new Date().toISOString()
      };
      await databaseService.saveActivity(activity);

      // Live refresh
      await refreshDatabase();
    } catch (err) {
      console.error('[CRM Context] completeReminder Exception:', err?.message || err);
    }
  };

  // 7. Soft Delete Customer (preserves complete activity and history database)
  const deleteCustomer = async (customerId, staffName = activeStaff) => {
    try {
      console.log('[CRM Context] Deleting customer:', customerId);
      const customer = customers.find(c => c.id === customerId);
      if (!customer) return;

      // Update in Supabase
      await databaseService.deleteCustomer(customerId);

      const activity = {
        customerId,
        actionType: 'customer_deleted',
        oldValue: 'Active',
        newValue: 'Soft Deleted (Preserved in archives)',
        updatedBy: staffName,
        timestamp: new Date().toISOString()
      };
      await databaseService.saveActivity(activity);

      // Live refresh
      await refreshDatabase();
    } catch (err) {
      console.error('[CRM Context] deleteCustomer Exception:', err?.message || err);
    }
  };

  // 8. Pipeline Stage Configurations
  const addStage = async (stageName, stageColor) => {
    try {
      const exists = stages.find(s => s.stageName?.toLowerCase() === stageName?.toLowerCase());
      if (exists) return false;

      const newStage = {
        stageName,
        stageColor,
        stageOrder: stages.length + 1
      };

      await databaseService.saveStage(newStage);
      await refreshDatabase();
      return true;
    } catch (err) {
      console.error('[CRM Context] addStage Exception:', err?.message || err);
      return false;
    }
  };

  const renameStage = async (oldName, newName) => {
    try {
      const updatedStages = (stages || []).map(s => 
        s.stageName === oldName ? { ...s, stageName: newName } : s
      );
      await databaseService.saveAllStages(updatedStages);

      const updatedCustomers = (customers || []).map(c => 
        c.stage === oldName ? { ...c, stage: newName } : c
      );
      
      // Sync affected customers
      const affected = updatedCustomers.filter(c => c.stage === newName);
      for (const c of affected) {
        await databaseService.updateCustomer(c.id, { stage: newName });
      }

      await refreshDatabase();
      return true;
    } catch (err) {
      console.error('[CRM Context] renameStage Exception:', err?.message || err);
      return false;
    }
  };

  const deleteStage = async (stageName) => {
    try {
      const remainingStages = (stages || []).filter(s => s.stageName !== stageName);
      const ordered = (remainingStages || []).map((s, idx) => ({ ...s, stageOrder: idx + 1 }));
      await databaseService.deleteStage(stageName);

      const fallbackStage = ordered[0]?.stageName || 'New Lead';
      const updatedCustomers = (customers || []).map(c => 
        c.stage === stageName ? { ...c, stage: fallbackStage } : c
      );
      
      // Sync affected customers
      const affected = updatedCustomers.filter(c => c.stage === fallbackStage);
      for (const c of affected) {
        await databaseService.updateCustomer(c.id, { stage: fallbackStage });
      }

      await refreshDatabase();
    } catch (err) {
      console.error('[CRM Context] deleteStage Exception:', err?.message || err);
    }
  };

  const reorderStages = async (reorderedStages) => {
    try {
      const updated = (reorderedStages || []).map((s, idx) => ({ ...s, stageOrder: idx + 1 }));
      await databaseService.saveAllStages(updated);
      await refreshDatabase();
    } catch (err) {
      console.error('[CRM Context] reorderStages Exception:', err?.message || err);
    }
  };

  // 9. Site Photos & Blueprints Upload (Supabase Cloud Storage bucket integration)
  const uploadCustomerImage = async (customerId, file, imageType, staffName = activeStaff) => {
    try {
      const imgRecord = await databaseService.uploadCustomerFile(customerId, file, imageType, staffName);
      
      // Log activity
      const activity = {
        customerId,
        actionType: 'image_uploaded',
        oldValue: '',
        newValue: `Uploaded file to cloud: [${imageType}] ${file?.name || 'file'}`,
        updatedBy: staffName,
        timestamp: new Date().toISOString()
      };
      await databaseService.saveActivity(activity);
      
      return imgRecord;
    } catch (err) {
      console.error('[CRM Context] uploadCustomerImage Exception:', err?.message || err);
      throw err;
    }
  };

  const getCustomerImages = async (customerId) => {
    return await databaseService.fetchFiles(customerId);
  };

  const deleteCustomerImage = async (imageId, customerId, fileName, staffName = activeStaff) => {
    try {
      const filesList = await databaseService.fetchFiles(customerId);
      const fileRecord = filesList.find(f => f.id === imageId);
      const fileUrl = fileRecord ? fileRecord.fileUrl : '';

      await databaseService.deleteCustomerFile(imageId, customerId, fileUrl);
      
      // Log activity
      const activity = {
        customerId,
        actionType: 'image_deleted',
        oldValue: '',
        newValue: `Deleted cloud file: ${fileName}`,
        updatedBy: staffName,
        timestamp: new Date().toISOString()
      };
      await databaseService.saveActivity(activity);
    } catch (err) {
      console.error('[CRM Context] deleteCustomerImage Exception:', err?.message || err);
    }
  };

  // Helper activity log for PDFs
  const logPdfGeneration = async (customerId, pdfType, staffName = activeStaff) => {
    try {
      const activity = {
        customerId,
        actionType: 'pdf_generated',
        oldValue: '',
        newValue: `Generated and downloaded PDF: ${pdfType}`,
        updatedBy: staffName,
        timestamp: new Date().toISOString()
      };
      await databaseService.saveActivity(activity);
      await refreshDatabase();
    } catch (err) {
      console.error('[CRM Context] logPdfGeneration Exception:', err?.message || err);
    }
  };

  const createBillTransaction = async (billData, staffName = activeStaff) => {
    try {
      console.log('[CRM Context] Creating bill transaction inside Supabase:', billData?.billNo);
      const created = await databaseService.createBill(billData);
      
      // Log activity
      try {
        const activity = {
          customerId: billData.customerId,
          actionType: 'bill_generated',
          oldValue: '',
          newValue: `Generated Bill: ${billData.billNo}. Amount: Rs. ${billData.finalAmount}`,
          updatedBy: staffName,
          timestamp: new Date().toISOString()
        };
        await databaseService.saveActivity(activity);
      } catch (actErr) {
        console.error('[CRM Context] Decoupled bill activity logging failed:', actErr);
      }

      await refreshDatabase();
      return created;
    } catch (err) {
      console.error('[CRM Context] createBillTransaction Exception:', err);
      throw err;
    }
  };

  return (
    <CRMDatabaseContext.Provider value={{
      customers: (customers || []).filter(c => !c.isDeleted), 
      allCustomersRaw: customers || [], 
      activities,
      notes,
      payments,
      reminders,
      stages,
      bills,
      staffList,
      isLoading,
      activeStaff,
      setActiveStaff,
      addCustomer,
      editCustomer,
      updateCustomerStage,
      addPaymentTransaction,
      markCustomerPaid,
      addCustomerNote,
      createReminder,
      snoozeReminder,
      completeReminder,
      deleteCustomer,
      addStage,
      renameStage,
      deleteStage,
      reorderStages,
      uploadCustomerImage,
      getCustomerImages,
      deleteCustomerImage,
      logPdfGeneration,
      createBillTransaction,
      refreshDatabase
    }}>
      {children}
    </CRMDatabaseContext.Provider>
  );
};
