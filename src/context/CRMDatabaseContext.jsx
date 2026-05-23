import React, { createContext, useContext, useState, useEffect } from 'react';
import { dbAPI, initLocalStorageDB, getImagesFromDB, saveImageToDB, deleteImageFromDB } from '../utils/db';

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

  // Load database on mount
  useEffect(() => {
    const data = initLocalStorageDB();
    setCustomers(data.customers);
    setActivities(data.activities);
    setNotes(data.notes);
    setPayments(data.payments);
    setReminders(data.reminders);
    setStages(data.stages);
  }, []);

  // Helpers to persist state to storage
  const updateCustomersState = (newCustomers) => {
    setCustomers(newCustomers);
    dbAPI.saveCustomers(newCustomers);
  };

  const updateActivitiesState = (newActivities) => {
    setActivities(newActivities);
    dbAPI.saveActivities(newActivities);
  };

  const updateNotesState = (newNotes) => {
    setNotes(newNotes);
    dbAPI.saveNotes(newNotes);
  };

  const updatePaymentsState = (newPayments) => {
    setPayments(newPayments);
    dbAPI.savePayments(newPayments);
  };

  const updateRemindersState = (newReminders) => {
    setReminders(newReminders);
    dbAPI.saveReminders(newReminders);
  };

  const updateStagesState = (newStages) => {
    setStages(newStages);
    dbAPI.saveStages(newStages);
  };

  // --- BUSINESS LOGIC MUTATIONS ---

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
      requirement: customerData.requirement || '', // backward compat string
      projectType: customerData.projectType || 'Hardware',
      stage: customerData.stage || 'New Lead',
      assignedStaff: customerData.assignedStaff || staffName,
      followupDate: customerData.followupDate || '',
      
      // Dynamic products columns
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
      isDeleted: false // Soft-delete to preserve history
    };

    // Save Customer
    updateCustomersState([...customers, newCustomer]);

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
      updatePaymentsState([newPayRecord, ...payments]);
    }

    // Add activity history
    const activity = {
      customerId: newId,
      actionType: 'customer_created',
      oldValue: '',
      newValue: `${newCustomer.customerName} added with ${items.length} items. Total: ₹${totalAmount}`,
      updatedBy: staffName,
      timestamp: new Date().toISOString()
    };
    updateActivitiesState([activity, ...activities]);

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
      updateRemindersState([...reminders, newReminder]);
    }

    return newCustomer;
  };

  // 2. Edit Customer
  const editCustomer = (customerId, updatedFields, staffName = activeStaff) => {
    const original = customers.find(c => c.id === customerId);
    if (!original) return;

    // Check payment updates
    let updated = { ...original, ...updatedFields };
    
    // Recalculate amount details if total, advance, items, subtotal, discount, or tax updated
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
      
      // Auto-calculate taxAmount if subtotal/discount/taxPercent is modified and amount not directly set
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

    const newCustomers = customers.map(c => c.id === customerId ? updated : c);
    updateCustomersState(newCustomers);

    if (changes.length > 0) {
      const activity = {
        customerId,
        actionType: 'customer_edited',
        oldValue: '',
        newValue: `Updated: ${changes.join(', ')}. New Grand Total: ₹${updated.amount}`,
        updatedBy: staffName,
        timestamp: new Date().toISOString()
      };
      updateActivitiesState([activity, ...activities]);
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
      updateRemindersState([...reminders, newReminder]);
    }
  };

  // 3. Move Pipeline Stage
  const updateCustomerStage = (customerId, newStage, staffName = activeStaff) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    const oldStage = customer.stage;
    if (oldStage === newStage) return;

    const newCustomers = customers.map(c => 
      c.id === customerId ? { ...c, stage: newStage } : c
    );
    updateCustomersState(newCustomers);

    const activity = {
      customerId,
      actionType: 'stage_update',
      oldValue: oldStage,
      newValue: newStage,
      updatedBy: staffName,
      timestamp: new Date().toISOString()
    };
    updateActivitiesState([activity, ...activities]);
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

    // Update Customer
    const newCustomers = customers.map(c => 
      c.id === customerId ? {
        ...c,
        advancePaid: newAdvance,
        pendingAmount: newPending,
        paymentStatus: newStatus
      } : c
    );
    updateCustomersState(newCustomers);

    // Save transaction
    const newPayRecord = {
      id: 'pay_' + Date.now(),
      customerId,
      amountPaid: pAmount,
      paymentMode,
      updatedBy: staffName,
      timestamp: new Date().toISOString(),
      note: note || 'Payment installment received'
    };
    updatePaymentsState([newPayRecord, ...payments]);

    // Save Activity
    const activity = {
      customerId,
      actionType: 'payment_update',
      oldValue: `${customer.paymentStatus} (Bal: ₹${customer.pendingAmount})`,
      newValue: `Payment: ₹${pAmount} received. Balance: ₹${newPending} (${newStatus})`,
      updatedBy: staffName,
      timestamp: new Date().toISOString()
    };
    updateActivitiesState([activity, ...activities]);
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

    updateNotesState([newNote, ...notes]);

    const activity = {
      customerId,
      actionType: 'note_added',
      oldValue: '',
      newValue: `Added note: "${noteText.length > 30 ? noteText.substring(0, 30) + '...' : noteText}"`,
      updatedBy: staffName,
      timestamp: new Date().toISOString()
    };
    updateActivitiesState([activity, ...activities]);
  };

  // 6. Reminders System
  const createReminder = (customerId, reminderType, reminderDate, notesText = '', staffName = activeStaff) => {
    const newReminder = {
      id: 'rem_' + Date.now(),
      customerId,
      reminderType, // 'Follow-up Call', 'Payment Due', 'Delivery', 'Quotation Pending'
      reminderDate,
      status: 'Pending',
      notes: notesText
    };

    updateRemindersState([...reminders, newReminder]);

    const activity = {
      customerId,
      actionType: 'followup_update',
      oldValue: '',
      newValue: `Scheduled ${reminderType} on ${reminderDate.split('T')[0]}`,
      updatedBy: staffName,
      timestamp: new Date().toISOString()
    };
    updateActivitiesState([activity, ...activities]);
  };

  const snoozeReminder = (reminderId, newDate, staffName = activeStaff) => {
    const reminder = reminders.find(r => r.id === reminderId);
    if (!reminder) return;

    const updatedReminders = reminders.map(r => 
      r.id === reminderId ? { ...r, reminderDate: newDate, status: 'Snoozed' } : r
    );
    updateRemindersState(updatedReminders);

    const activity = {
      customerId: reminder.customerId,
      actionType: 'reminder_snoozed',
      oldValue: reminder.reminderDate.split('T')[0],
      newValue: `Snoozed to ${newDate.split('T')[0]}`,
      updatedBy: staffName,
      timestamp: new Date().toISOString()
    };
    updateActivitiesState([activity, ...activities]);
  };

  const completeReminder = (reminderId, staffName = activeStaff) => {
    const reminder = reminders.find(r => r.id === reminderId);
    if (!reminder) return;

    const updatedReminders = reminders.map(r => 
      r.id === reminderId ? { ...r, status: 'Completed' } : r
    );
    updateRemindersState(updatedReminders);

    const activity = {
      customerId: reminder.customerId,
      actionType: 'reminder_completed',
      oldValue: 'Pending',
      newValue: `Completed: ${reminder.reminderType}`,
      updatedBy: staffName,
      timestamp: new Date().toISOString()
    };
    updateActivitiesState([activity, ...activities]);
  };

  // 7. Soft Delete Customer (preserves complete activity and history database)
  const deleteCustomer = (customerId, staffName = activeStaff) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    const updatedCustomers = customers.map(c => 
      c.id === customerId ? { ...c, isDeleted: true } : c
    );
    updateCustomersState(updatedCustomers);

    const activity = {
      customerId,
      actionType: 'customer_deleted',
      oldValue: 'Active',
      newValue: 'Soft Deleted (Preserved in archives)',
      updatedBy: staffName,
      timestamp: new Date().toISOString()
    };
    updateActivitiesState([activity, ...activities]);
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

    updateStagesState([...stages, newStage]);
    return true;
  };

  const renameStage = (oldName, newName) => {
    const updatedStages = stages.map(s => 
      s.stageName === oldName ? { ...s, stageName: newName } : s
    );
    updateStagesState(updatedStages);

    // Update stages of all customers holding that stage
    const updatedCustomers = customers.map(c => 
      c.stage === oldName ? { ...c, stage: newName } : c
    );
    updateCustomersState(updatedCustomers);

    // Update stage changes in activity history if necessary
    return true;
  };

  const deleteStage = (stageName) => {
    const remainingStages = stages.filter(s => s.stageName !== stageName);
    
    // Re-index stage orders
    const ordered = remainingStages.map((s, idx) => ({ ...s, stageOrder: idx + 1 }));
    updateStagesState(ordered);

    // Move affected customers back to first stage or 'New Lead'
    const fallbackStage = ordered[0]?.stageName || 'New Lead';
    const updatedCustomers = customers.map(c => 
      c.stage === stageName ? { ...c, stage: fallbackStage } : c
    );
    updateCustomersState(updatedCustomers);
  };

  const reorderStages = (reorderedStages) => {
    const updated = reorderedStages.map((s, idx) => ({ ...s, stageOrder: idx + 1 }));
    updateStagesState(updated);
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
    updateActivitiesState([activity, ...activities]);
    
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
    updateActivitiesState([activity, ...activities]);
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
    updateActivitiesState([activity, ...activities]);
  };

  return (
    <CRMDatabaseContext.Provider value={{
      customers: customers.filter(c => !c.isDeleted), // Only expose non-deleted ones in views
      allCustomersRaw: customers, // Archive access
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
