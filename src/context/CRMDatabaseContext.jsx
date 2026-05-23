import React, { createContext, useContext, useState, useEffect } from 'react';
import { databaseService } from '../lib/databaseService';
import { getImagesFromDB, saveImageToDB, deleteImageFromDB } from '../utils/db';

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
  const [activeStaff, setActiveStaff] = useState('Suresh'); // Default selected staff member

  // List of available staff members for dropdown selectors
  const staffList = ['Suresh', 'Suresh babu', 'Ravi', 'Arun', 'Admin'];

  // Load database asynchronously on mount
  useEffect(() => {
    const loadDatabase = async () => {
      try {
        console.log('[CRM Context] Initializing database synchronization...');
        const [custs, acts, nts, pmts, rems, stgs] = await Promise.all([
          databaseService.fetchCustomers(),
          databaseService.fetchActivities(),
          databaseService.fetchNotes(),
          databaseService.fetchPayments(),
          databaseService.fetchReminders(),
          databaseService.fetchStages()
        ]);
        
        setCustomers(custs || []);
        setActivities(acts || []);
        setNotes(nts || []);
        setPayments(pmts || []);
        setReminders(rems || []);
        setStages(stgs || []);
        console.log('[CRM Context] Database synchronization complete.');
      } catch (err) {
        console.error('[CRM Context] Initial database sync failed:', err.message);
      }
    };
    loadDatabase();
  }, []);

  // --- BUSINESS LOGIC MUTATIONS WITH SUPABASE SYNC ---

  // 1. Add Customer
  const addCustomer = (customerData, staffName = activeStaff) => {
    const newId = 'cust_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    
    // items and math calculation
    const items = customerData.items || [];
    const subtotal = parseFloat(customerData.subtotal || 0);
    const discount = parseFloat(customerData.discount || 0);
    const taxPercent = parseFloat(customerData.taxPercent || 0);
    const taxAmount = parseFloat(customerData.taxAmount || 0);
    const totalAmount = parseFloat(customerData.amount || (subtotal - discount + taxAmount));
    
    const advancePaid = parseFloat(customerData.advancePaid || 0);
    const pendingAmount = totalAmount - advancePaid;
    let paymentStatus = 'Pending';
    if (advancePaid > 0) {
      paymentStatus = pendingAmount <= 0 ? 'Paid' : 'Partial';
    }

    const newCustomer = {
      id: newId,
      customerName: customerData.customerName,
      phone: customerData.phone || '',
      address: customerData.address || '',
      requirement: customerData.requirement || '', 
      projectType: customerData.projectType || 'Hardware',
      stage: customerData.stage || 'New Lead',
      assignedStaff: customerData.assignedStaff || staffName,
      followupDate: customerData.followupDate || '',
      
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
      priority: customerData.priority || 'Medium',
      tags: customerData.tags || [],
      createdAt: new Date().toISOString(),
      isDeleted: false 
    };

    // 1. Update React state immediately
    setCustomers(prev => [...prev, newCustomer]);
    
    // 2. Persist to DB in the background
    databaseService.saveCustomer(newCustomer);

    // Save Initial Payment record if advance paid
    if (advancePaid > 0) {
      const newPayRecord = {
        id: 'pay_' + Date.now(),
        customerId: newId,
        amountPaid: advancePaid,
        paymentMode: customerData.paymentMode || 'Cash',
        updatedBy: staffName,
        timestamp: new Date().toISOString(),
        note: 'Initial Advance Payment'
      };
      setPayments(prev => [newPayRecord, ...prev]);
      databaseService.savePayment(newPayRecord);
    }

    // Add activity history
    const activity = {
      customerId: newId,
      actionType: 'customer_created',
      oldValue: '',
      newValue: `${newCustomer.customerName} added with ${items.length} items. Total: Rs. ${totalAmount}`,
      updatedBy: staffName,
      timestamp: new Date().toISOString()
    };
    setActivities(prev => [activity, ...prev]);
    databaseService.saveActivity(activity);

    // If follow-up date is provided, automatically set a reminder
    if (newCustomer.followupDate) {
      const newReminder = {
        id: 'rem_' + Date.now(),
        customerId: newId,
        reminderType: 'Follow-up Call',
        reminderDate: newCustomer.followupDate,
        status: 'Pending',
        notes: 'Auto-created from customer creation'
      };
      setReminders(prev => [...prev, newReminder]);
      databaseService.saveReminder(newReminder);
    }

    return newCustomer;
  };

  // 2. Edit Customer
  const editCustomer = (customerId, updatedFields, staffName = activeStaff) => {
    const original = customers.find(c => c.id === customerId);
    if (!original) return;

    let updated = { ...original, ...updatedFields };
    
    if (
      updatedFields.items !== undefined ||
      updatedFields.subtotal !== undefined ||
      updatedFields.discount !== undefined ||
      updatedFields.taxPercent !== undefined ||
      updatedFields.amount !== undefined ||
      updatedFields.advancePaid !== undefined
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
    Object.keys(updatedFields).forEach(key => {
      if (original[key] !== updatedFields[key] && key !== 'isDeleted') {
        if (key === 'items') {
          changes.push(`Materials list updated (${updatedFields[key].length} products)`);
        } else {
          changes.push(`${key}: "${original[key]}" → "${updatedFields[key]}"`);
        }
      }
    });

    // 1. Update React state immediately
    setCustomers(prev => prev.map(c => c.id === customerId ? updated : c));

    // 2. Persist to DB in the background
    databaseService.saveCustomer(updated);

    if (changes.length > 0) {
      const activity = {
        customerId,
        actionType: 'customer_edited',
        oldValue: '',
        newValue: `Updated: ${changes.join(', ')}. New Grand Total: Rs. ${updated.amount}`,
        updatedBy: staffName,
        timestamp: new Date().toISOString()
      };
      setActivities(prev => [activity, ...prev]);
      databaseService.saveActivity(activity);
    }

    // Sync automatic reminder if followup date changes
    if (updatedFields.followupDate && updatedFields.followupDate !== original.followupDate) {
      const newReminder = {
        id: 'rem_' + Date.now(),
        customerId,
        reminderType: 'Follow-up Call',
        reminderDate: updatedFields.followupDate,
        status: 'Pending',
        notes: 'Follow-up date updated'
      };
      setReminders(prev => [...prev, newReminder]);
      databaseService.saveReminder(newReminder);
    }
  };

  // 3. Move Pipeline Stage
  const updateCustomerStage = (customerId, newStage, staffName = activeStaff) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    const oldStage = customer.stage;
    if (oldStage === newStage) return;

    const updatedCust = { ...customer, stage: newStage };

    // Update state and DB
    setCustomers(prev => prev.map(c => c.id === customerId ? updatedCust : c));
    databaseService.saveCustomer(updatedCust);

    const activity = {
      customerId,
      actionType: 'stage_update',
      oldValue: oldStage,
      newValue: newStage,
      updatedBy: staffName,
      timestamp: new Date().toISOString()
    };
    setActivities(prev => [activity, ...prev]);
    databaseService.saveActivity(activity);
  };

  // 4. Update Payment / Add Payment Transaction
  const addPaymentTransaction = (customerId, amountPaid, paymentMode = 'Cash', note = '', staffName = activeStaff) => {
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

    const updatedCust = {
      ...customer,
      advancePaid: newAdvance,
      pendingAmount: newPending,
      paymentStatus: newStatus
    };

    // Update state & DB
    setCustomers(prev => prev.map(c => c.id === customerId ? updatedCust : c));
    databaseService.saveCustomer(updatedCust);

    // Save transaction record
    const newPayRecord = {
      id: 'pay_' + Date.now(),
      customerId,
      amountPaid: pAmount,
      paymentMode,
      updatedBy: staffName,
      timestamp: new Date().toISOString(),
      note: note || 'Payment installment received'
    };
    setPayments(prev => [newPayRecord, ...prev]);
    databaseService.savePayment(newPayRecord);

    // Save Activity
    const activity = {
      customerId,
      actionType: 'payment_update',
      oldValue: `${customer.paymentStatus} (Bal: Rs. ${customer.pendingAmount})`,
      newValue: `Payment: Rs. ${pAmount} received. Balance: Rs. ${newPending} (${newStatus})`,
      updatedBy: staffName,
      timestamp: new Date().toISOString()
    };
    setActivities(prev => [activity, ...prev]);
    databaseService.saveActivity(activity);
  };

  // Mark customer fully paid
  const markCustomerPaid = (customerId, staffName = activeStaff) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    const pending = parseFloat(customer.pendingAmount || 0);
    if (pending <= 0) return;

    addPaymentTransaction(customerId, pending, 'GPay', 'Marked full payment completed', staffName);
  };

  // 5. Add Note
  const addCustomerNote = (customerId, noteText, staffName = activeStaff) => {
    const newNote = {
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      customerId,
      noteText,
      addedBy: staffName,
      timestamp: new Date().toISOString()
    };

    setNotes(prev => [newNote, ...prev]);
    databaseService.saveNote(newNote);

    const activity = {
      customerId,
      actionType: 'note_added',
      oldValue: '',
      newValue: `Added note: "${noteText.length > 30 ? noteText.substring(0, 30) + '...' : noteText}"`,
      updatedBy: staffName,
      timestamp: new Date().toISOString()
    };
    setActivities(prev => [activity, ...prev]);
    databaseService.saveActivity(activity);
  };

  // 6. Reminders System
  const createReminder = (customerId, reminderType, reminderDate, notesText = '', staffName = activeStaff) => {
    const newReminder = {
      id: 'rem_' + Date.now(),
      customerId,
      reminderType, 
      reminderDate,
      status: 'Pending',
      notes: notesText
    };

    setReminders(prev => [...prev, newReminder]);
    databaseService.saveReminder(newReminder);

    const activity = {
      customerId,
      actionType: 'followup_update',
      oldValue: '',
      newValue: `Scheduled ${reminderType} on ${reminderDate.split('T')[0]}`,
      updatedBy: staffName,
      timestamp: new Date().toISOString()
    };
    setActivities(prev => [activity, ...prev]);
    databaseService.saveActivity(activity);
  };

  const snoozeReminder = (reminderId, newDate, staffName = activeStaff) => {
    const reminder = reminders.find(r => r.id === reminderId);
    if (!reminder) return;

    const updatedRem = { ...reminder, reminderDate: newDate, status: 'Snoozed' };

    setReminders(prev => prev.map(r => r.id === reminderId ? updatedRem : r));
    databaseService.saveReminder(updatedRem);

    const activity = {
      customerId: reminder.customerId,
      actionType: 'reminder_snoozed',
      oldValue: reminder.reminderDate.split('T')[0],
      newValue: `Snoozed to ${newDate.split('T')[0]}`,
      updatedBy: staffName,
      timestamp: new Date().toISOString()
    };
    setActivities(prev => [activity, ...prev]);
    databaseService.saveActivity(activity);
  };

  const completeReminder = (reminderId, staffName = activeStaff) => {
    const reminder = reminders.find(r => r.id === reminderId);
    if (!reminder) return;

    const updatedRem = { ...reminder, status: 'Completed' };

    setReminders(prev => prev.map(r => r.id === reminderId ? updatedRem : r));
    databaseService.saveReminder(updatedRem);

    const activity = {
      customerId: reminder.customerId,
      actionType: 'reminder_completed',
      oldValue: 'Pending',
      newValue: `Completed: ${reminder.reminderType}`,
      updatedBy: staffName,
      timestamp: new Date().toISOString()
    };
    setActivities(prev => [activity, ...prev]);
    databaseService.saveActivity(activity);
  };

  // 7. Soft Delete Customer (preserves complete activity and history database)
  const deleteCustomer = (customerId, staffName = activeStaff) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    // Update state & DB
    setCustomers(prev => prev.filter(c => c.id !== customerId));
    databaseService.deleteCustomer(customerId);

    const activity = {
      customerId,
      actionType: 'customer_deleted',
      oldValue: 'Active',
      newValue: 'Soft Deleted (Preserved in archives)',
      updatedBy: staffName,
      timestamp: new Date().toISOString()
    };
    setActivities(prev => [activity, ...prev]);
    databaseService.saveActivity(activity);
  };

  // 8. Pipeline Stage Configurations
  const addStage = (stageName, stageColor) => {
    const exists = stages.find(s => s.stageName.toLowerCase() === stageName.toLowerCase());
    if (exists) return false;

    const newStage = {
      stageName,
      stageColor,
      stageOrder: stages.length + 1
    };

    setStages(prev => [...prev, newStage]);
    databaseService.saveStage(newStage);
    return true;
  };

  const renameStage = (oldName, newName) => {
    const updatedStages = stages.map(s => 
      s.stageName === oldName ? { ...s, stageName: newName } : s
    );
    setStages(updatedStages);
    databaseService.saveAllStages(updatedStages);

    const updatedCustomers = customers.map(c => 
      c.stage === oldName ? { ...c, stage: newName } : c
    );
    setCustomers(updatedCustomers);
    // Sync affected customers
    updatedCustomers.filter(c => c.stage === newName).forEach(c => {
      databaseService.saveCustomer(c);
    });

    return true;
  };

  const deleteStage = (stageName) => {
    const remainingStages = stages.filter(s => s.stageName !== stageName);
    const ordered = remainingStages.map((s, idx) => ({ ...s, stageOrder: idx + 1 }));
    setStages(ordered);
    databaseService.deleteStage(stageName);

    const fallbackStage = ordered[0]?.stageName || 'New Lead';
    const updatedCustomers = customers.map(c => 
      c.stage === stageName ? { ...c, stage: fallbackStage } : c
    );
    setCustomers(updatedCustomers);
    updatedCustomers.filter(c => c.stage === fallbackStage).forEach(c => {
      databaseService.saveCustomer(c);
    });
  };

  const reorderStages = (reorderedStages) => {
    const updated = reorderedStages.map((s, idx) => ({ ...s, stageOrder: idx + 1 }));
    setStages(updated);
    databaseService.saveAllStages(updated);
  };

  // 9. Site Photos & Blueprints Upload (IndexedDB direct integration)
  const uploadCustomerImage = async (customerId, file, imageType, staffName = activeStaff) => {
    const imgRecord = await saveImageToDB(customerId, file, imageType, staffName);
    
    // Log activity
    const activity = {
      customerId,
      actionType: 'image_uploaded',
      oldValue: '',
      newValue: `Uploaded file: [${imageType}] ${file.name}`,
      updatedBy: staffName,
      timestamp: new Date().toISOString()
    };
    setActivities(prev => [activity, ...prev]);
    databaseService.saveActivity(activity);
    
    return imgRecord;
  };

  const getCustomerImages = async (customerId) => {
    return await getImagesFromDB(customerId);
  };

  const deleteCustomerImage = async (imageId, customerId, fileName, staffName = activeStaff) => {
    await deleteImageFromDB(imageId);
    
    // Log activity
    const activity = {
      customerId,
      actionType: 'image_deleted',
      oldValue: '',
      newValue: `Deleted file: ${fileName}`,
      updatedBy: staffName,
      timestamp: new Date().toISOString()
    };
    setActivities(prev => [activity, ...prev]);
    databaseService.saveActivity(activity);
  };

  // Helper activity log for PDFs
  const logPdfGeneration = (customerId, pdfType, staffName = activeStaff) => {
    const activity = {
      customerId,
      actionType: 'pdf_generated',
      oldValue: '',
      newValue: `Generated and downloaded PDF: ${pdfType}`,
      updatedBy: staffName,
      timestamp: new Date().toISOString()
    };
    setActivities(prev => [activity, ...prev]);
    databaseService.saveActivity(activity);
  };

  return (
    <CRMDatabaseContext.Provider value={{
      customers: customers.filter(c => !c.isDeleted), 
      allCustomersRaw: customers, 
      activities,
      notes,
      payments,
      reminders,
      stages,
      staffList,
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
      logPdfGeneration
    }}>
      {children}
    </CRMDatabaseContext.Provider>
  );
};
