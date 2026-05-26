import React, { useState, useEffect } from 'react';
import { useCRMDatabase } from '../context/CRMDatabaseContext';
import { generateAllCustomersPDF, generateInvoicePDF } from '../utils/pdfGenerator';
import { COMMON_PRODUCTS } from '../utils/db';
import { supabase } from '../lib/supabase';

export default function Dashboard({ onViewCustomer }) {
  useEffect(() => {
    const testConnection = async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*');

      console.log('[Supabase Connection Test] Data:', data);
      console.log('[Supabase Connection Test] Error:', error);
    };

    testConnection();
  }, []);

  const {
    customers,
    activities,
    payments,
    reminders,
    stages,
    staffList,
    updateCustomerStage,
    addPaymentTransaction,
    addCustomerNote,
    createReminder,
    logPdfGeneration,
    refreshDatabase,
    isLoading,
    addCustomer,
    addStage,
    renameStage
  } = useCRMDatabase();

  // --- FILTERS STATE ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState('All');
  const [selectedStaff, setSelectedStaff] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');

  // --- MODALS STATE ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isQuickMoveOpen, setIsQuickMoveOpen] = useState(false);
  const [selectedCustId, setSelectedCustId] = useState(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [activeActionCustomerId, setActiveActionCustomerId] = useState(null);
  
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState('');
  
  const [isQuickReminderOpen, setIsQuickReminderOpen] = useState(false);
  const [quickReminderType, setQuickReminderType] = useState('Follow-up Call');
  const [quickReminderDate, setQuickReminderDate] = useState('');
  const [quickReminderNotes, setQuickReminderNotes] = useState('');

  // --- ADD CUSTOMER FORM STATE ---
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustDeliveryNotes, setNewCustDeliveryNotes] = useState('');
  
  // Costing elements
  const [newCustItems, setNewCustItems] = useState([
    { productName: '', qty: 1, unit: 'Sheets', rate: 0, total: 0, status: 'Pending', category: 'Material' }
  ]);
  const [newCustDiscount, setNewCustDiscount] = useState('');
  const [newCustTaxPercent, setNewCustTaxPercent] = useState('18'); // 18% GST default

  const [newCustProjType, setNewCustProjType] = useState('Hardware');
  const [newCustStage, setNewCustStage] = useState('New Lead');
  const [newCustStaff, setNewCustStaff] = useState('Suresh');
  const [newCustPriority, setNewCustPriority] = useState('Medium');
  const [newCustAdvance, setNewCustAdvance] = useState('');
  const [newCustPayMode, setNewCustPayMode] = useState('Cash');
  const [newCustFollowupDate, setNewCustFollowupDate] = useState('');

  // Uploader mock state
  const [uploads, setUploads] = useState([
    { name: 'blueprint_main_rev3.dwg', size: '4.8 MB', type: 'Blueprint', time: 'Just now' },
    { name: 'site_measurement_front.jpg', size: '2.1 MB', type: 'Site Image', time: '1 hour ago' }
  ]);

  // Notes state inside Create Workspace
  const [createWorkspaceNote, setCreateWorkspaceNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        fontFamily: 'var(--font-display)',
        color: 'var(--text-white)',
        gap: '12px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '3px solid rgba(212, 166, 79, 0.1)',
          borderTopColor: 'var(--accent)',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}} />
        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)' }}>Loading CRM Database...</span>
      </div>
    );
  }

  // --- INTERACTIVE MATH CALCULATOR ---
  const subtotal = newCustItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
  const discountVal = parseFloat(newCustDiscount || 0);
  const taxPercentVal = parseFloat(newCustTaxPercent || 0);
  const taxAmount = ((subtotal - discountVal) * taxPercentVal) / 100;
  const grandTotal = Math.max(0, subtotal - discountVal + taxAmount);
  const advancePaidVal = parseFloat(newCustAdvance || 0);
  const pendingBalance = Math.max(0, grandTotal - advancePaidVal);

  // Category wise aggregates
  const catSubtotals = {
    Material: newCustItems.filter(i => i.category === 'Material').reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0),
    Installation: newCustItems.filter(i => i.category === 'Installation').reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0),
    Automation: newCustItems.filter(i => i.category === 'Automation').reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0),
    Labor: newCustItems.filter(i => i.category === 'Labor').reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0),
    Miscellaneous: newCustItems.filter(i => i.category === 'Miscellaneous').reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0),
  };

  const totalCatVal = Object.values(catSubtotals).reduce((sum, v) => sum + v, 0);

  // Quick stats
  const totalMaterialsCount = newCustItems.filter(item => item.productName.trim() !== '').length;
  const totalQtySum = newCustItems.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
  const pendingItemsCount = newCustItems.filter(item => item.status === 'Pending').length;
  const derivedPaymentStatus = advancePaidVal === 0 ? 'Pending' : advancePaidVal >= grandTotal ? 'Paid' : 'Partial';

  // --- COSTING TABLE HANDLERS ---
  const handleItemChange = (index, field, value) => {
    const updated = newCustItems.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'qty' || field === 'rate') {
          const q = parseFloat(field === 'qty' ? value : item.qty) || 0;
          const r = parseFloat(field === 'rate' ? value : item.rate) || 0;
          updatedItem.total = q * r;
        }
        return updatedItem;
      }
      return item;
    });
    setNewCustItems(updated);
  };

  const handleAddRow = () => {
    setNewCustItems([...newCustItems, { productName: '', qty: 1, unit: 'Sheets', rate: 0, total: 0, status: 'Pending', category: 'Material' }]);
  };

  const handleDeleteRow = (index) => {
    const updated = newCustItems.filter((_, i) => i !== index);
    setNewCustItems(updated.length > 0 ? updated : [{ productName: '', qty: 1, unit: 'Sheets', rate: 0, total: 0, status: 'Pending', category: 'Material' }]);
  };

  const handleDuplicateRow = (index) => {
    const original = newCustItems[index];
    setNewCustItems([
      ...newCustItems,
      { ...original, productName: original.productName ? original.productName + ' (Copy)' : '' }
    ]);
  };

  const handleMockUpload = () => {
    const mockFiles = [
      { name: 'laminate_sample_finish.png', size: '1.2 MB', type: 'Site Image' },
      { name: 'invoice_pre_quote.pdf', size: '820 KB', type: 'Invoice' },
      { name: 'structural_cad_drawings.dwg', size: '12.4 MB', type: 'Blueprint' },
      { name: 'customer_site_agreement.pdf', size: '1.4 MB', type: 'Document' }
    ];
    const randomFile = mockFiles[Math.floor(Math.random() * mockFiles.length)];
    setUploads([...uploads, { ...randomFile, time: 'Just now' }]);
  };

  const handleRemoveUpload = (idx) => {
    setUploads(uploads.filter((_, i) => i !== idx));
  };

  // --- TIME PARSING HELPERS ---
  const todayStr = new Date().toISOString().split('T')[0];

  // --- DATA FILTERING ---
  const filteredCustomers = (customers || []).filter(c => {
    if (!c) return false;
    const name = c.customerName || '';
    const phone = c.phone || '';
    const requirement = c.requirement || '';
    const address = c.address || '';
    const customerNo = c.customerNo || '';
    const latestBillNo = c.latestBillNo || '';
    const billTag = (c.tags || []).find(t => t.startsWith('BILL:')) || '';
    const legacyBillNo = billTag ? billTag.split(':')[1] : '';

    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm) ||
      requirement.toLowerCase().includes(searchTerm.toLowerCase()) ||
      address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      latestBillNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      legacyBillNo.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStage = selectedStage === 'All' || c.stage === selectedStage;
    const matchesStaff = selectedStaff === 'All' || c.assignedStaff === selectedStage || c.assignedStaff === selectedStaff; // Backwards compatibility stage match
    const matchesPriority = selectedPriority === 'All' || c.priority === selectedPriority;

    return matchesSearch && matchesStage && matchesStaff && matchesPriority;
  });

  // --- AGGREGATE CALCULATIONS ---
  const totalCustomersCount = (customers || []).length;
  const todayReminders = (reminders || []).filter(r => r && r.status !== 'Completed' && (r.reminderDate || '').split('T')[0] === todayStr);
  const pendingRemindersCount = (reminders || []).filter(r => r && (r.status === 'Pending' || r.status === 'Snoozed')).length;
  const completedDeals = (customers || []).filter(c => c && (c.stage === 'Confirmed' || c.stage === 'Completed')).length;
  const totalSalesVal = (customers || []).reduce((sum, c) => sum + (c ? (c.amount || 0) : 0), 0);
  const pendingPaymentsCount = (customers || []).filter(c => c && (c.pendingAmount || 0) > 0).length;

  // --- ALERTS ---
  const overdueFollowups = (reminders || []).filter(r => r && r.status !== 'Completed' && (r.reminderDate || '').split('T')[0] < todayStr);
  const upcomingFollowups = (reminders || []).filter(r => {
    if (!r || r.status === 'Completed') return false;
    const remDate = (r.reminderDate || '').split('T')[0];
    if (!remDate) return false;
    const diffTime = new Date(remDate) - new Date(todayStr);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 3;
  });
  const pendingPaymentAlerts = (customers || []).filter(c => c && (c.pendingAmount || 0) > 0 && (c.stage === 'Confirmed' || c.stage === 'Completed'));

  // --- FORM HANDLERS ---
  const handleCreateCustomer = async (e) => {
    if (e) e.preventDefault();
    if (!newCustName.trim()) {
      showToast('Customer Name is required.', 'error');
      return;
    }

    const activeItems = newCustItems.filter(item => item?.productName?.trim() !== '');
    setIsSaving(true);

    try {
      await addCustomer({
        customerName: newCustName,
        phone: newCustPhone,
        address: newCustAddress,
        requirement: activeItems.map(item => `${item?.productName} (${item?.qty} ${item?.unit} @ ₹${item?.rate})`).join(', ') || 'Standard supplies',
        projectType: newCustProjType,
        stage: newCustStage,
        assignedStaff: newCustStaff,
        priority: newCustPriority,
        items: activeItems,
        subtotal: subtotal,
        discount: discountVal,
        taxPercent: taxPercentVal,
        taxAmount: taxAmount,
        amount: grandTotal,
        advancePaid: advancePaidVal,
        paymentMode: newCustPayMode,
        followupDate: newCustFollowupDate,
        tags: []
      });

      showToast('Customer file created successfully!', 'success');

      // Reset Form
      setNewCustName('');
      setNewCustPhone('');
      setNewCustAddress('');
      setNewCustDeliveryNotes('');
      setNewCustItems([{ productName: '', qty: 1, unit: 'Sheets', rate: 0, total: 0, status: 'Pending', category: 'Material' }]);
      setNewCustDiscount('');
      setNewCustTaxPercent('18');
      setNewCustProjType('Hardware');
      setNewCustStage('New Lead');
      setNewCustStaff('Suresh');
      setNewCustPriority('Medium');
      setNewCustAdvance('');
      setNewCustPayMode('Cash');
      setNewCustFollowupDate('');
      setCreateWorkspaceNote('');
      
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('[Dashboard] Error completing client file creation:', err);
      showToast(`Failed to create customer file: ${err?.message || err}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickNoteSubmit = (e) => {
    e.preventDefault();
    if (!quickNoteText.trim() || !selectedCustId) return;
    addCustomerNote(selectedCustId, quickNoteText);
    setQuickNoteText('');
    setIsQuickNoteOpen(false);
  };

  const handleQuickReminderSubmit = (e) => {
    e.preventDefault();
    if (!quickReminderDate || !selectedCustId) return;
    createReminder(selectedCustId, quickReminderType, quickReminderDate, quickReminderNotes);
    setQuickReminderDate('');
    setQuickReminderNotes('');
    setIsQuickReminderOpen(false);
  };

  const handleExportAllPDF = (action = 'download') => {
    generateAllCustomersPDF(customers, payments, stages, action);
    logPdfGeneration('ALL', 'All Customer Report');
  };

  const handleExportSingleInvoice = (customer) => {
    const custPayments = payments.filter(p => p.customerId === customer.id);
    generateInvoicePDF(customer, custPayments);
    logPdfGeneration(customer.id, 'Single Customer Invoice');
  };

  // --- FULL-PAGE REDESIGNED ERP CREATE VIEW WORKSPACE ---
  if (isAddModalOpen) {
    // Dynamic Donut Path calculations
    let cumulativePercent = 0;
    const donutCategories = [
      { label: 'Material', value: catSubtotals.Material, color: '#D4A64F' },
      { label: 'Installation', value: catSubtotals.Installation, color: '#F59E0B' },
      { label: 'Automation', value: catSubtotals.Automation, color: '#3B82F6' },
      { label: 'Labor', value: catSubtotals.Labor, color: '#A855F7' },
      { label: 'Miscellaneous', value: catSubtotals.Miscellaneous, color: '#14B8A6' }
    ].filter(c => c.value > 0);

    const donutCircles = donutCategories.map((cat, idx) => {
      const percent = Math.round((cat.value / totalCatVal) * 100);
      const strokeDashArray = `${percent} ${100 - percent}`;
      const strokeDashOffset = 100 - cumulativePercent + 25; // +25 to rotate starting point to top
      cumulativePercent += percent;
      return (
        <circle
          key={idx}
          cx="20"
          cy="20"
          r="15.9155"
          fill="transparent"
          stroke={cat.color}
          strokeWidth="3.5"
          strokeDasharray={strokeDashArray}
          strokeDashoffset={strokeDashOffset}
          style={{ transition: 'stroke-dasharray 0.3s ease, stroke-dashoffset 0.3s ease' }}
        />
      );
    });

    const paymentProgressBarPercent = grandTotal > 0 ? Math.min(100, Math.round((advancePaidVal / grandTotal) * 100)) : 0;    return (
      <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
        
        {/* Custom Styles Injection */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .erp-container {
            display: grid;
            grid-template-columns: 1.8fr 1.2fr;
            gap: 22px;
            align-items: start;
            margin-top: 18px;
          }
          @media (max-width: 991px) {
            .erp-container { grid-template-columns: 1.4fr 1.2fr; gap: 16px; }
          }
          @media (max-width: 768px) {
            .erp-container { grid-template-columns: 1fr; gap: 20px; }
          }
          .erp-card {
            background: rgba(21, 31, 50, 0.45);
            border: 1px solid rgba(255, 255, 255, 0.03);
            border-radius: 14px;
            padding: 18px 20px;
            margin-bottom: 20px;
            box-shadow: var(--shadow-md);
            transition: border-color 0.25s ease;
          }
          .erp-card:hover { border-color: rgba(255, 255, 255, 0.06); }
          .erp-card-title {
            font-family: var(--font-display);
            font-size: 13.5px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: var(--text-white);
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .erp-table-wrapper {
            overflow-x: auto;
            border: 1px solid rgba(255, 255, 255, 0.03);
            border-radius: 8px;
            margin-bottom: 12px;
          }
          .erp-table { width: 100%; border-collapse: collapse; text-align: left; }
          .erp-table th {
            background: rgba(16, 23, 38, 0.4);
            color: var(--text-muted);
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 10px 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          }
          .erp-table td {
            padding: 6px 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.02);
            vertical-align: middle;
          }
          .erp-table tr:hover { background: rgba(255, 255, 255, 0.01); }
          .erp-input-inline {
            width: 100%;
            background: rgba(16, 23, 38, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.04);
            color: var(--text-white);
            padding: 5px 8px;
            font-size: 12px;
            border-radius: 6px;
            outline: none;
            transition: all 0.2s ease;
          }
          .erp-input-inline:focus {
            border-color: var(--accent);
            box-shadow: 0 0 6px rgba(212, 166, 79, 0.15);
          }
          .upload-zone {
            border: 1.5px dashed rgba(255, 255, 255, 0.06);
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            background: rgba(16, 23, 38, 0.2);
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .upload-zone:hover {
            border-color: var(--accent);
            background: rgba(212, 166, 79, 0.02);
          }

          /* Responsive utilities & Mobile Layout Redesign overrides */
          .desktop-only {
            display: block;
          }
          .mobile-only {
            display: none !important;
          }
          .erp-main-col {
            display: flex;
            flex-direction: column;
          }
          .erp-sidebar-col {
            position: sticky;
            top: 70px;
            display: flex;
            flex-direction: column;
          }
          .erp-form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
          }
          .erp-form-grid-notes {
            display: grid;
            grid-template-columns: 1fr 1.2fr;
            gap: 18px;
          }
          .erp-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 14px;
            border-bottom: 1px solid var(--border-color);
            position: sticky;
            top: 0;
            background: var(--bg-main);
            z-index: 10;
          }
          .erp-modal-header-actions {
            display: flex;
            gap: 10px;
          }
          .erp-billing-donut-container {
            display: flex;
            gap: 18px;
            align-items: center;
            margin-bottom: 18px;
            padding-bottom: 14px;
            border-bottom: 1px solid rgba(255,255,255,0.03);
          }

          @media (max-width: 768px) {
            .desktop-only {
              display: none !important;
            }
            .mobile-only {
              display: block !important;
            }
            .erp-card {
              padding: 14px 16px !important;
              border-radius: 12px !important;
              margin-bottom: 14px !important;
            }
            .erp-card-title {
              font-size: 12px !important;
              margin-bottom: 12px !important;
            }
            .erp-container {
              margin-top: 12px !important;
              gap: 16px !important;
            }
            .erp-sidebar-col {
              position: static !important;
              top: auto !important;
              width: 100% !important;
            }
            .erp-form-grid-notes {
              grid-template-columns: 1fr !important;
              gap: 16px !important;
            }
          }

          @media (max-width: 576px) {
            .erp-form-grid {
              grid-template-columns: 1fr !important;
              gap: 12px !important;
            }
            .erp-modal-header {
              flex-direction: column;
              align-items: stretch !important;
              gap: 12px !important;
              padding-bottom: 12px !important;
            }
            .erp-modal-header-actions {
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
              gap: 8px !important;
            }
          }

          @media (max-width: 480px) {
            .erp-billing-donut-container {
              flex-direction: column !important;
              align-items: center !important;
              text-align: center !important;
              gap: 14px !important;
            }
          }

          /* Mobile materials cards custom styling */
          .mobile-material-card {
            background: rgba(16, 23, 38, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.04);
            border-radius: 12px;
            padding: 14px;
            margin-bottom: 12px;
            position: relative;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            transition: all 0.2s ease;
          }
          .mobile-material-card:focus-within {
            border-color: var(--accent);
            box-shadow: 0 4px 16px rgba(212, 166, 79, 0.1);
          }
          .mobile-material-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.03);
            padding-bottom: 8px;
          }
          .mobile-material-card-num {
            font-size: 11px;
            font-weight: 700;
            color: var(--accent);
            background: rgba(212, 166, 79, 0.08);
            padding: 3px 8px;
            border-radius: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .mobile-material-card-actions {
            display: flex;
            gap: 8px;
          }
          .mobile-material-card-row {
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
            margin-bottom: 10px;
          }
          .mobile-material-card-row-2col {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 10px;
          }
          .mobile-material-card-row-3col {
            display: grid;
            grid-template-columns: 1.2fr 1fr 1.2fr;
            gap: 8px;
            margin-bottom: 10px;
          }
          .mobile-material-card-total-bar {
            background: rgba(16, 23, 38, 0.6);
            padding: 8px 12px;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 12px;
            border: 1px solid rgba(255, 255, 255, 0.02);
          }
          .mobile-material-card-total-label {
            font-size: 11px;
            color: var(--text-muted);
            text-transform: uppercase;
            font-weight: 600;
          }
          .mobile-material-card-total-val {
            font-size: 13px;
            font-weight: 700;
            color: var(--accent);
          }
        `}} />

        {/* 1. Header Section */}
        <div className="erp-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="action-btn-circle"
              onClick={() => setIsAddModalOpen(false)}
              title="Return to Dashboard"
              style={{ minWidth: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--text-white)', letterSpacing: '-0.5px', margin: 0 }}>
                Create New Client File
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', margin: 0 }}>
                Manage customer projects, materials, billing, and follow-ups
              </p>
            </div>
          </div>
          <div className="erp-modal-header-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}
              onClick={() => setIsAddModalOpen(false)}
            >
              Dashboard
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{
                border: 'none',
                boxShadow: '0 4px 14px rgba(212, 166, 79, 0.35)',
                fontWeight: '700',
                fontSize: '13px',
                padding: '8px 24px',
                borderRadius: '8px',
                opacity: isSaving ? 0.7 : 1,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                backgroundColor: 'var(--accent)',
                color: '#000'
              }}
              disabled={isSaving}
              onClick={handleCreateCustomer}
            >
              {isSaving ? 'Creating...' : 'Create File'}
            </button>
          </div>
        </div>

        {/* 2. Main Page Layout Grid */}
        <div className="erp-container">
          
          {/* Left Column (65% width) */}
          <div className="erp-main-col">
            
            {/* Card 1: Client Information */}
            <div className="erp-card">
              <div className="erp-card-title">Client Profile Details</div>
              
              <div className="erp-form-grid">
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="ag-form-label">Customer / Business Name *</label>
                  <input
                    type="text"
                    className="erp-input-inline"
                    style={{ padding: '8px 12px', fontSize: '13px' }}
                    placeholder="e.g. Hakkim Hardware, Lalgudi"
                    value={newCustName}
                    onChange={e => setNewCustName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="ag-form-label">Phone / Mobile</label>
                  <input
                    type="tel"
                    className="erp-input-inline"
                    style={{ padding: '8px 12px', fontSize: '13px' }}
                    placeholder="10-digit number"
                    value={newCustPhone}
                    onChange={e => setNewCustPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="ag-form-label">Deal Priority</label>
                  <select className="erp-input-inline" style={{ padding: '8px 12px', fontSize: '13px', height: '36px' }} value={newCustPriority} onChange={e => setNewCustPriority(e.target.value)}>
                    <option value="High">🔴 High Priority</option>
                    <option value="Medium">🟡 Medium Priority</option>
                    <option value="Low">🟢 Low Priority</option>
                  </select>
                </div>
                <div>
                  <label className="ag-form-label">Project / Deal Type</label>
                  <select className="erp-input-inline" style={{ padding: '8px 12px', fontSize: '13px', height: '36px' }} value={newCustProjType} onChange={e => setNewCustProjType(e.target.value)}>
                    <option value="Hardware">Hardware Supplies</option>
                    <option value="Plywood">Plywood & Boarding</option>
                    <option value="Laminate">Laminates & Veneers</option>
                    <option value="Interior design">Interior Fit-out</option>
                    <option value="Contractor Work">Contractor Billing</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Card 2: Project Materials Table */}
            <div className="erp-card">
              <div className="erp-card-title">
                <span>Project Materials</span>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '11px',
                    padding: '5px 12px',
                    color: 'var(--text-white)'
                  }}
                  onClick={handleAddRow}
                >
                  + Add Item
                </button>
              </div>

              {/* Desktop-only: spreadsheet ERP table */}
              <div className="desktop-only">
                <div className="erp-table-wrapper">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th style={{ width: '4%' }}>S.No</th>
                        <th style={{ width: '38%' }}>Product Name</th>
                        <th style={{ width: '18%' }}>Category</th>
                        <th style={{ width: '10%' }}>Qty</th>
                        <th style={{ width: '10%' }}>Unit</th>
                        <th style={{ width: '12%' }}>Rate (₹)</th>
                        <th style={{ width: '12%' }}>Status</th>
                        <th style={{ width: '14%', textAlign: 'right' }}>Total (₹)</th>
                        <th style={{ width: '10%', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {newCustItems.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>{idx + 1}</td>
                          <td>
                            <input
                              type="text"
                              className="erp-input-inline"
                              placeholder="Type product name..."
                              list="common-products"
                              value={item.productName}
                              onChange={e => handleItemChange(idx, 'productName', e.target.value)}
                              required
                            />
                          </td>
                          <td>
                            <select className="erp-input-inline" style={{ padding: '4px 6px' }} value={item.category || 'Material'} onChange={e => handleItemChange(idx, 'category', e.target.value)}>
                              <option value="Material">Material</option>
                              <option value="Installation">Installation</option>
                              <option value="Automation">Automation</option>
                              <option value="Labor">Labor</option>
                              <option value="Miscellaneous">Misc</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              className="erp-input-inline"
                              style={{ textAlign: 'center' }}
                              min="0.01"
                              step="any"
                              value={item.qty}
                              onChange={e => handleItemChange(idx, 'qty', e.target.value)}
                              required
                            />
                          </td>
                          <td>
                            <select className="erp-input-inline" style={{ padding: '4px' }} value={item.unit} onChange={e => handleItemChange(idx, 'unit', e.target.value)}>
                              <option value="Sheets">Sheets</option>
                              <option value="Sets">Sets</option>
                              <option value="Pcs">Pcs</option>
                              <option value="Boxes">Boxes</option>
                              <option value="Kgs">Kgs</option>
                              <option value="Rft">Rft</option>
                              <option value="Lot">Lot</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              className="erp-input-inline"
                              style={{ textAlign: 'right' }}
                              min="0"
                              step="any"
                              value={item.rate}
                              onChange={e => handleItemChange(idx, 'rate', e.target.value)}
                              required
                            />
                          </td>
                          <td>
                            <select className="erp-input-inline" style={{ padding: '4px' }} value={item.status || 'Pending'} onChange={e => handleItemChange(idx, 'status', e.target.value)}>
                              <option value="Pending">Pending</option>
                              <option value="Ordered">Ordered</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Installed">Installed</option>
                            </select>
                          </td>
                          <td style={{ textAlign: 'right', fontSize: '12px', fontWeight: '700', color: 'var(--text-white)' }}>
                            ₹{(parseFloat(item.total) || 0).toLocaleString('en-IN')}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                              <button
                                type="button"
                                className="action-btn-circle accent"
                                style={{ width: '22px', height: '22px', fontSize: '9px' }}
                                onClick={() => handleDuplicateRow(idx)}
                                title="Duplicate row"
                              >
                                📋
                              </button>
                              <button
                                type="button"
                                className="action-btn-circle"
                                style={{ width: '22px', height: '22px', fontSize: '11px', color: 'var(--status-red)', borderColor: 'rgba(239, 68, 68, 0.15)' }}
                                onClick={() => handleDeleteRow(idx)}
                                title="Delete row"
                              >
                                &times;
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer Details */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '20px', padding: '10px 10px 0 0', borderTop: '1px solid rgba(255,255,255,0.02)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Total Items: <strong style={{ color: 'var(--text-white)' }}>{newCustItems.length}</strong>
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Combined Subtotal: <strong style={{ color: 'var(--accent)' }}>₹{subtotal.toLocaleString('en-IN')}</strong>
                  </span>
                </div>
              </div>

              {/* Mobile-only: touch friendly stacked card inputs */}
              <div className="mobile-only">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {newCustItems.map((item, idx) => (
                    <div className="mobile-material-card" key={idx}>
                      <div className="mobile-material-card-header">
                        <span className="mobile-material-card-num">Item #{idx + 1}</span>
                        <div className="mobile-material-card-actions">
                          <button
                            type="button"
                            className="action-btn-circle accent"
                            style={{ width: '28px', height: '28px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => handleDuplicateRow(idx)}
                            title="Duplicate row"
                          >
                            📋
                          </button>
                          <button
                            type="button"
                            className="action-btn-circle"
                            style={{ width: '28px', height: '28px', fontSize: '14px', color: 'var(--status-red)', borderColor: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => handleDeleteRow(idx)}
                            title="Delete row"
                          >
                            &times;
                          </button>
                        </div>
                      </div>

                      <div className="mobile-material-card-row">
                        <div>
                          <label className="ag-form-label" style={{ fontSize: '10px', marginBottom: '4px' }}>Product Name</label>
                          <input
                            type="text"
                            className="erp-input-inline"
                            style={{ padding: '8px 10px', fontSize: '12.5px' }}
                            placeholder="Type product name..."
                            list="common-products"
                            value={item.productName}
                            onChange={e => handleItemChange(idx, 'productName', e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="mobile-material-card-row-2col">
                        <div>
                          <label className="ag-form-label" style={{ fontSize: '10px', marginBottom: '4px' }}>Category</label>
                          <select 
                            className="erp-input-inline" 
                            style={{ padding: '8px 10px', fontSize: '12.5px', height: '36px' }} 
                            value={item.category || 'Material'} 
                            onChange={e => handleItemChange(idx, 'category', e.target.value)}
                          >
                            <option value="Material">Material</option>
                            <option value="Installation">Installation</option>
                            <option value="Automation">Automation</option>
                            <option value="Labor">Labor</option>
                            <option value="Miscellaneous">Misc</option>
                          </select>
                        </div>
                        <div>
                          <label className="ag-form-label" style={{ fontSize: '10px', marginBottom: '4px' }}>Status</label>
                          <select 
                            className="erp-input-inline" 
                            style={{ padding: '8px 10px', fontSize: '12.5px', height: '36px' }} 
                            value={item.status || 'Pending'} 
                            onChange={e => handleItemChange(idx, 'status', e.target.value)}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Ordered">Ordered</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Installed">Installed</option>
                          </select>
                        </div>
                      </div>

                      <div className="mobile-material-card-row-3col">
                        <div>
                          <label className="ag-form-label" style={{ fontSize: '10px', marginBottom: '4px' }}>Qty</label>
                          <input
                            type="number"
                            className="erp-input-inline"
                            style={{ padding: '8px 6px', fontSize: '12.5px', textAlign: 'center' }}
                            min="0.01"
                            step="any"
                            value={item.qty}
                            onChange={e => handleItemChange(idx, 'qty', e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="ag-form-label" style={{ fontSize: '10px', marginBottom: '4px' }}>Unit</label>
                          <select 
                            className="erp-input-inline" 
                            style={{ padding: '8px 4px', fontSize: '11px', height: '36px' }} 
                            value={item.unit} 
                            onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                          >
                            <option value="Sheets">Sheets</option>
                            <option value="Sets">Sets</option>
                            <option value="Pcs">Pcs</option>
                            <option value="Boxes">Boxes</option>
                            <option value="Kgs">Kgs</option>
                            <option value="Rft">Rft</option>
                            <option value="Lot">Lot</option>
                          </select>
                        </div>
                        <div>
                          <label className="ag-form-label" style={{ fontSize: '10px', marginBottom: '4px' }}>Rate (₹)</label>
                          <input
                            type="number"
                            className="erp-input-inline"
                            style={{ padding: '8px 8px', fontSize: '12.5px', textAlign: 'right' }}
                            min="0"
                            step="any"
                            value={item.rate}
                            onChange={e => handleItemChange(idx, 'rate', e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="mobile-material-card-total-bar">
                        <span className="mobile-material-card-total-label">Row Total</span>
                        <span className="mobile-material-card-total-val">₹{(parseFloat(item.total) || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mobile Table Footer */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 6px 4px 6px', borderTop: '1px solid rgba(255,255,255,0.03)', marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Items:</span>
                    <strong style={{ color: 'var(--text-white)' }}>{newCustItems.length}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Combined Subtotal:</span>
                    <strong style={{ color: 'var(--accent)' }}>₹{subtotal.toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>

              <datalist id="common-products">
                {COMMON_PRODUCTS.map((prod, pidx) => (
                  <option key={pidx} value={prod} />
                ))}
              </datalist>
            </div>

            {/* Card 3: Site & Delivery Details */}
            <div className="erp-card">
              <div className="erp-card-title">Site & Delivery Details</div>
              
              <div className="erp-form-grid">
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="ag-form-label">
                    Site Address
                  </label>
                  <textarea
                    className="erp-input-inline"
                    rows={2}
                    style={{ resize: 'vertical', padding: '8px 12px' }}
                    placeholder="Physical delivery / construction site coordinates..."
                    value={newCustAddress}
                    onChange={e => setNewCustAddress(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="ag-form-label">Delivery Notes / Delivery Date</label>
                  <input
                    type="date"
                    className="erp-input-inline"
                    value={newCustFollowupDate}
                    onChange={e => setNewCustFollowupDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="ag-form-label">Delivery Instructions</label>
                  <input
                    type="text"
                    className="erp-input-inline"
                    placeholder="e.g. Leave with supervisor, call before shipping..."
                    value={newCustDeliveryNotes}
                    onChange={e => setNewCustDeliveryNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Card 4: Internal Notes */}
            <div className="erp-card">
              <div className="erp-card-title">Internal Executive Notes</div>
              
              <div style={{ marginTop: '10px' }}>
                <textarea
                  className="erp-input-inline"
                  rows={6}
                  style={{ resize: 'none', padding: '12px', width: '100%' }}
                  placeholder="Discussed requirements, customer requested Marine Grade Plywood and anti-rust hinges. Follow up when stock arrives..."
                  value={createWorkspaceNote}
                  onChange={e => setCreateWorkspaceNote(e.target.value)}
                />
              </div>
            </div>

          </div>

          {/* Right Sidebar Column (Sticky, 35% width) */}
          <div className="erp-sidebar-col">
            
            {/* Sidebar Card 1: Billing Workspace & Financials */}
            <div className="erp-card" style={{ background: 'linear-gradient(to bottom, rgba(21, 31, 50, 0.6) 0%, rgba(21, 31, 50, 0.4) 100%)', border: '1px solid rgba(212, 166, 79, 0.08)' }}>
              <div className="erp-card-title" style={{ color: 'var(--accent)' }}>Billing Workspace & Financials</div>
              
              {/* SVG Cost Split Ring & Legend */}
              <div className="erp-billing-donut-container">
                <div style={{ width: '70px', height: '70px', position: 'relative', flexShrink: 0 }}>
                  <svg viewBox="0 0 40 40" width="100%" height="100%">
                    <circle cx="20" cy="20" r="15.9155" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="3.5" />
                    {totalCatVal === 0 ? (
                      <circle cx="20" cy="20" r="15.9155" fill="transparent" stroke="#334155" strokeWidth="3.5" />
                    ) : donutCircles}
                  </svg>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '9px', fontWeight: 'bold', color: 'var(--text-muted)', textAlign: 'center' }}>
                    BUDGET<br/>SPLIT
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '140px' }}>
                  {donutCategories.map((cat, idx) => {
                    const val = cat.value;
                    const pct = totalCatVal > 0 ? Math.round((val / totalCatVal) * 100) : 0;
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cat.color }} />
                          <span style={{ color: 'var(--text-muted)' }}>{cat.label}</span>
                        </div>
                        <span style={{ fontWeight: '700', color: 'var(--text-white)' }}>{pct}% (₹{val.toLocaleString('en-IN')})</span>
                      </div>
                    );
                  })}
                  {totalCatVal === 0 && (
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Configure items to view category splits</span>
                  )}
                </div>
              </div>

              {/* Financial Inputs & Summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {/* Subtotal Display */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Materials Subtotal:</span>
                  <span style={{ color: 'var(--text-white)', fontWeight: 'bold' }}>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>

                {/* GST selection */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>GST Tax Rate:</span>
                  <select className="erp-input-inline" style={{ width: '100px', padding: '3px 6px', height: '28px' }} value={newCustTaxPercent} onChange={e => setNewCustTaxPercent(e.target.value)}>
                    <option value="0">0% GST</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST (Std)</option>
                    <option value="28">28% GST</option>
                  </select>
                </div>

                {/* Discount */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Discount (Flat ₹):</span>
                  <input
                    type="number"
                    className="erp-input-inline"
                    style={{ width: '100px', textAlign: 'right', padding: '3px 6px' }}
                    placeholder="0"
                    value={newCustDiscount}
                    onChange={e => setNewCustDiscount(e.target.value)}
                  />
                </div>

                {/* Advance Paid */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Advance Collected:</span>
                  <input
                    type="number"
                    className="erp-input-inline"
                    style={{ width: '100px', textAlign: 'right', padding: '3px 6px' }}
                    placeholder="0"
                    value={newCustAdvance}
                    onChange={e => setNewCustAdvance(e.target.value)}
                  />
                </div>

                {/* Advance Mode */}
                {advancePaidVal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Advance Mode:</span>
                    <select className="erp-input-inline" style={{ width: '120px', padding: '3px 6px', height: '28px' }} value={newCustPayMode} onChange={e => setNewCustPayMode(e.target.value)}>
                      <option value="Cash">Cash Mode</option>
                      <option value="GPay">GPay / UPI</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque Clear</option>
                    </select>
                  </div>
                )}

                {/* Final Bill Section */}
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                  
                  {/* Progress Bar advance vs grand total */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      <span>Advance Funding Progress:</span>
                      <span style={{ color: 'var(--status-green)', fontWeight: 'bold' }}>{paymentProgressBarPercent}%</span>
                    </div>
                    <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${paymentProgressBarPercent}%`, height: '100%', background: 'var(--status-green)', borderRadius: '3px', transition: 'width 0.3s ease' }} />
                    </div>
                  </div>

                  <div className="ag-billing-banner-orange" style={{ padding: '12px', background: 'rgba(212, 166, 79, 0.05)', border: '1px solid rgba(212, 166, 79, 0.15)', borderRadius: '8px' }}>
                    <span style={{ display: 'block', fontSize: '8.5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Grand Final Bill</span>
                    <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--status-green)', display: 'block', marginTop: '2px', fontFamily: 'var(--font-display)' }}>
                      ₹{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                      (₹{subtotal.toLocaleString('en-IN')} subtotal - ₹{discountVal.toLocaleString('en-IN')} discount + ₹{taxAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })} GST)
                    </span>
                  </div>

                  <div style={{ marginTop: '10px' }}>
                    <span style={{ display: 'block', fontSize: '8.5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Outstanding Pending Balance</span>
                    <span style={{ fontSize: '18px', fontWeight: '800', color: pendingBalance > 0 ? 'var(--status-red)' : 'var(--status-green)', display: 'block', marginTop: '2px', fontFamily: 'var(--font-display)' }}>
                      ₹{pendingBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Sidebar Card 2: Follow-up & Staff Card */}
            <div className="erp-card">
              <div className="erp-card-title">Follow-up & Executive Staff</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label className="ag-form-label">Assigned Executive</label>
                  <select className="erp-input-inline" style={{ height: '32px' }} value={newCustStaff} onChange={e => setNewCustStaff(e.target.value)}>
                    {staffList.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="ag-form-label">Follow-up Due Date</label>
                  <input
                    type="date"
                    className="erp-input-inline"
                    value={newCustFollowupDate}
                    onChange={e => setNewCustFollowupDate(e.target.value)}
                  />
                </div>

                {/* Instant Actions */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: '6px', fontSize: '11px', gap: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span>📞</span> Instant Call
                  </button>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: '6px', fontSize: '11px', gap: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span>💬</span> WhatsApp
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar Card 3: Quick Stats Card */}
            <div className="erp-card">
              <div className="erp-card-title">Executive Analytics</div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: 'rgba(16, 23, 38, 0.25)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Total Materials</span>
                  <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-white)', display: 'block', marginTop: '2px' }}>{totalMaterialsCount}</span>
                </div>
                <div style={{ background: 'rgba(16, 23, 38, 0.25)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Total Quantity</span>
                  <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-white)', display: 'block', marginTop: '2px' }}>{totalQtySum}</span>
                </div>
                <div style={{ background: 'rgba(16, 23, 38, 0.25)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Pending Items</span>
                  <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--status-yellow)', display: 'block', marginTop: '2px' }}>{pendingItemsCount}</span>
                </div>
                <div style={{ background: 'rgba(16, 23, 38, 0.25)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Payment status</span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    color: derivedPaymentStatus === 'Paid' ? 'var(--status-green)' : derivedPaymentStatus === 'Partial' ? 'var(--status-yellow)' : 'var(--status-red)',
                    display: 'block',
                    marginTop: '6px',
                    textTransform: 'uppercase'
                  }}>{derivedPaymentStatus}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: toast.type === 'error' ? 'var(--status-red)' : 'var(--status-green)',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 9999,
          fontWeight: 'bold',
          fontSize: '13px'
        }}>
          {toast.message}
        </div>
      )}
      {/* Premium Mobile App Header */}
      <div className="mobile-app-header">
        <div className="header-left">
          <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 2px 0', color: 'var(--text-white)' }}>Dashboard</h2>
          <p style={{ fontSize: '13px', margin: 0, color: 'var(--text-muted)' }}>Track customers & follow-ups</p>
        </div>
        <div className="header-right" style={{ display: 'flex', gap: '10px' }}>
          <button className="action-btn-circle" onClick={() => handleExportAllPDF('download')} title="Export Portfolio">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
          </button>
          <button className="action-btn-circle" title="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </button>
          <button className="action-btn-circle glow-gold" onClick={() => setIsAddModalOpen(true)} title="Add Customer">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* 2-Column Compact Metric Cards */}
      <div className="mobile-metrics-grid">
        <div className="premium-metric-card">
          <div className="metric-icon-wrapper" style={{ color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Customers</span>
            <span className="metric-val" style={{ color: '#3b82f6' }}>{totalCustomersCount}</span>
          </div>
        </div>

        <div className="premium-metric-card">
          <div className="metric-icon-wrapper" style={{ color: '#f97316', background: 'rgba(249, 115, 22, 0.1)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div className="metric-info">
            <span className="metric-label">Today's Follow-ups</span>
            <span className="metric-val" style={{ color: '#f97316' }}>{todayReminders.length}</span>
          </div>
        </div>

        <div className="premium-metric-card">
          <div className="metric-icon-wrapper" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)' }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>₹</span>
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Sales Value</span>
            <span className="metric-val" style={{ color: '#10b981' }}>₹{totalSalesVal >= 1000 ? (totalSalesVal / 1000).toFixed(1) + 'K' : totalSalesVal}</span>
          </div>
        </div>

        <div className="premium-metric-card">
          <div className="metric-icon-wrapper" style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div className="metric-info">
            <span className="metric-label">Pending Payments</span>
            <span className="metric-val" style={{ color: '#ef4444' }}>{pendingPaymentsCount}</span>
          </div>
        </div>
      </div>

      {/* DYNAMIC FILTER BAR */}
      <div class="filter-panel">
        {/* Desktop View (Standard 4 columns grid) */}
        <div class="filter-grid desktop-only">
          <div class="filter-group">
            <label>Search Client</label>
            <div class="search-input-wrapper">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                class="form-input form-input-search"
                placeholder="Search customers, phone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div class="filter-group">
            <label>Pipeline Stage</label>
            <select class="form-input" value={selectedStage} onChange={e => setSelectedStage(e.target.value)}>
              <option value="All">All Stages</option>
              {(stages || []).map(s => (
                <option key={s?.stageName} value={s?.stageName}>{s?.stageName}</option>
              ))}
            </select>
          </div>

          <div class="filter-group">
            <label>Assigned Staff</label>
            <select class="form-input" value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}>
              <option value="All">All Staff</option>
              {(staffList || []).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div class="filter-group">
            <label>Priority</label>
            <select class="form-input" value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)}>
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        {/* Mobile-First Premium Compact Filter Layout */}
        <div className="mobile-search-filter-area">
          <div className="search-input-wrapper full-width">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              className="form-input form-input-search"
              style={{ fontSize: '14px', height: '44px', paddingLeft: '36px', borderRadius: '12px' }}
              placeholder="Search customers, phone, requirement..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-dropdowns-row" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <div className="filter-group" style={{ flex: 1, margin: 0 }}>
              <select className="form-input" style={{ height: '40px', borderRadius: '10px', fontSize: '13px' }} value={selectedStage} onChange={e => setSelectedStage(e.target.value)}>
                <option value="All">All Stages</option>
                {(stages || []).map(s => (
                  <option key={s?.stageName} value={s?.stageName}>{s?.stageName}</option>
                ))}
              </select>
            </div>
            <div className="filter-group" style={{ flex: 1, margin: 0 }}>
              <select className="form-input" style={{ height: '40px', borderRadius: '10px', fontSize: '13px' }} value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}>
                <option value="All">All Staff</option>
                {(staffList || []).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* CLIENTS DIRECTORY */}
      <div class="table-container">
        {filteredCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No clients match the specified filter criteria.
          </div>
        ) : (
          <>
            {/* Desktop View Table */}
            <div class="desktop-only">
              <table class="crm-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Requirement</th>
                    <th>Stage</th>
                    <th>Assigned</th>
                    <th>Payment</th>
                    <th>Follow-Up</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(filteredCustomers || []).map(c => {
                    if (!c) return null;
                    const stageColor = (stages || []).find(s => s.stageName === c.stage)?.stageColor || '#3B82F6';
                    return (
                      <tr key={c.id}>
                        <td data-label="Customer" onClick={() => onViewCustomer(c.id)} style={{ cursor: 'pointer' }}>
                          <div class="customer-cell">
                            <span class="name">{c.customerName || 'Unknown'}</span>
                            <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: '700', marginTop: '2px' }}>
                              {(() => {
                                const bTag = (c.tags || []).find(t => t.startsWith('BILL:'));
                                return bTag ? bTag.split(':')[1] : 'No Bill#';
                              })()}
                            </span>
                            <span class="phone">{c.phone || ''}</span>
                          </div>
                        </td>

                        {/* Requirement details */}
                        <td data-label="Requirement">
                          <div style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.requirement || '—'}
                          </div>
                        </td>

                        {/* Current Stage */}
                        <td data-label="Stage">
                          <span
                            class="badge"
                            style={{
                              backgroundColor: `${stageColor}18`,
                              color: stageColor,
                              border: `1px solid ${stageColor}40`
                            }}
                          >
                            {c.stage || 'New Lead'}
                          </span>
                        </td>

                        {/* Assigned Representative */}
                        <td data-label="Assigned">
                          <span style={{ fontWeight: '500' }}>{c.assignedStaff || 'Unassigned'}</span>
                        </td>

                        {/* Payment Status Badges */}
                        <td data-label="Payment">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span class={`badge badge-payment-${(c.paymentStatus || 'Pending').toLowerCase()}`}>
                              {c.paymentStatus || 'Pending'}
                            </span>
                            {(c.pendingAmount || 0) > 0 && (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                                Bal: ₹{c.pendingAmount}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Next Followup Date */}
                        <td data-label="Follow-Up">
                          {c.followupDate ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ color: 'var(--accent)' }}>
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                              </svg>
                              <span class={c.followupDate < todayStr ? 'overdue' : ''} style={{ color: c.followupDate < todayStr ? 'var(--status-red)' : 'inherit', fontWeight: c.followupDate < todayStr ? '600' : 'normal' }}>
                                {c.followupDate}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                          )}
                        </td>

                        {/* Actions cell */}
                        <td data-label="Actions">
                          <div class="action-cell">
                            {/* Call */}
                            {c.phone && (
                              <a href={`tel:${c.phone}`} class="action-btn-circle call" title="Call Customer">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.1-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                              </a>
                            )}
                            
                            {/* WhatsApp */}
                            {c.phone && (
                              <a
                                href={`https://wa.me/${c.phone.replace(/[^0-9+]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="action-btn-circle whatsapp"
                                title="WhatsApp Message"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                                </svg>
                              </a>
                            )}

                            {/* Move stage shortcut */}
                            <button
                              class="action-btn-circle accent"
                              title="Quick Move Stage"
                              onClick={() => {
                                setSelectedCustId(c.id);
                                setIsQuickMoveOpen(true);
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9 18 15 12 9 6"></polyline>
                              </svg>
                            </button>

                            {/* Quick Note shortcut */}
                            <button
                              class="action-btn-circle"
                              title="Quick Add Note"
                              onClick={() => {
                                setSelectedCustId(c.id);
                                setIsQuickNoteOpen(true);
                              }}
                            >
                              📝
                            </button>

                            {/* Quick Reminder shortcut */}
                            <button
                              class="action-btn-circle"
                              title="Quick Reminder"
                              onClick={() => {
                                setSelectedCustId(c.id);
                                setIsQuickReminderOpen(true);
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                              </svg>
                            </button>
                            
                            {/* Single invoice trigger */}
                            <button
                              class="action-btn-circle"
                              title="Generate Invoice Document"
                              onClick={() => handleExportSingleInvoice(c)}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View Stacked Cards */}
            <div className="mobile-only">
              <div className="mobile-customer-cards">
                {(filteredCustomers || []).map(c => {
                  if (!c) return null;
                  const stageColor = (stages || []).find(s => s.stageName === c.stage)?.stageColor || '#3B82F6';
                  const priorityColor = c.priority === 'High' ? '#ef4444' : c.priority === 'Medium' ? '#f59e0b' : '#10b981';
                  
                  return (
                    <div className="premium-mobile-card" key={c.id}>
                      {/* TOP: Customer Name & 3-dot */}
                      <div className="card-header-row" onClick={() => onViewCustomer(c.id)}>
                        <h3 className="card-title">{c.customerName || 'Unknown'}</h3>
                        <button
                          type="button"
                          className="action-menu-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveActionCustomerId(c.id);
                          }}
                        >
                          •••
                        </button>
                      </div>

                      {/* SECOND: Phone */}
                      {c.phone && (
                        <div className="card-phone-row" onClick={() => onViewCustomer(c.id)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.1-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                          {c.phone}
                        </div>
                      )}

                      {/* THIRD: Requirement */}
                      <div className="card-req-row" onClick={() => onViewCustomer(c.id)}>
                        {c.requirement || 'No requirement specified'}
                      </div>

                      {/* FOURTH: Badges */}
                      <div className="card-badges-row" onClick={() => onViewCustomer(c.id)}>
                        <span className="badge" style={{ backgroundColor: `${stageColor}15`, color: stageColor }}>
                          {c.stage || 'New Lead'}
                        </span>
                        <span className="badge" style={{ backgroundColor: `${priorityColor}15`, color: priorityColor }}>
                          {c.priority || 'Medium'}
                        </span>
                        <span className="badge" style={{
                          backgroundColor: c.pendingAmount === 0 ? 'rgba(16, 185, 129, 0.1)' : c.advancePaid > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: c.pendingAmount === 0 ? '#10b981' : c.advancePaid > 0 ? '#f59e0b' : '#ef4444'
                        }}>
                          {c.pendingAmount === 0 ? 'Paid' : c.advancePaid > 0 ? 'Partial' : 'Pending'}
                        </span>
                      </div>

                      <hr className="card-divider" />

                      {/* BOTTOM: Assigned & Follow-up, with RIGHT ACTIONS */}
                      <div className="card-footer-row">
                        <div className="footer-meta" onClick={() => onViewCustomer(c.id)}>
                          <div className="meta-item">
                            <span className="meta-icon">👤</span> {c.assignedStaff || 'Unassigned'}
                          </div>
                          {c.followupDate && (
                            <div className="meta-item">
                              <span className="meta-icon">📅</span> {c.followupDate}
                            </div>
                          )}
                        </div>
                        <div className="footer-actions">
                          {c.phone && (
                            <a href={`tel:${c.phone}`} className="action-circle call" title="Call Customer">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.1-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                              </svg>
                            </a>
                          )}
                          {c.phone && (
                            <a
                              href={`https://wa.me/${c.phone.replace(/[^0-9+]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="action-circle whatsapp"
                              title="WhatsApp Message"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                              </svg>
                            </a>
                          )}
                          <button className="btn-open-details" onClick={() => onViewCustomer(c.id)}>Open</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* MOBILE COLLAPSIBLE FILTER DRAWER */}
      {isMobileFilterOpen && (
        <div class="drawer-overlay" onClick={() => setIsMobileFilterOpen(false)}>
          <div class="bottom-sheet" onClick={e => e.stopPropagation()}>
            <div class="bottom-sheet-handle"></div>
            <div class="modal-header" style={{ padding: '0 0 12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Filter Records</h3>
              <button
                class="modal-close-btn"
                style={{ fontSize: '20px', color: 'var(--text-muted)' }}
                onClick={() => setIsMobileFilterOpen(false)}
              >
                &times;
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div class="filter-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Pipeline Stage</label>
                <select class="form-input" style={{ width: '100%', height: '40px' }} value={selectedStage} onChange={e => setSelectedStage(e.target.value)}>
                  <option value="All">All Stages</option>
                  {(stages || []).map(s => (
                    <option key={s?.stageName} value={s?.stageName}>{s?.stageName}</option>
                  ))}
                </select>
              </div>

              <div class="filter-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Assigned Staff</label>
                <select class="form-input" style={{ width: '100%', height: '40px' }} value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}>
                  <option value="All">All Staff</option>
                  {(staffList || []).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div class="filter-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Priority</label>
                <select class="form-input" style={{ width: '100%', height: '40px' }} value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)}>
                  <option value="All">All Priorities</option>
                  <option value="High">🔴 High Priority</option>
                  <option value="Medium">🟡 Medium Priority</option>
                  <option value="Low">🟢 Low Priority</option>
                </select>
              </div>

              {/* Reset active filters button */}
              {(selectedStage !== 'All' || selectedStaff !== 'All' || selectedPriority !== 'All') && (
                <button
                  class="btn btn-secondary"
                  style={{ marginTop: '8px', justifyContent: 'center' }}
                  onClick={() => {
                    setSelectedStage('All');
                    setSelectedStaff('All');
                    setSelectedPriority('All');
                    setIsMobileFilterOpen(false);
                  }}
                >
                  Clear All Active Filters
                </button>
              )}

              <button
                class="btn btn-primary"
                style={{
                  border: 'none',
                  boxShadow: '0 4px 14px rgba(212, 166, 79, 0.3)',
                  height: '40px',
                  justifyContent: 'center',
                  fontWeight: '700',
                  marginTop: '4px'
                }}
                onClick={() => setIsMobileFilterOpen(false)}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button for Mobile Create Customer */}
      <button
        class="floating-add-btn mobile-only"
        onClick={() => setIsAddModalOpen(true)}
        title="Create Customer File"
      >
        +
      </button>

      {/* MOBILE PREMIUM ACTION MENU SHEET */}
      {activeActionCustomerId && (() => {
        const c = (customers || []).find(x => x.id === activeActionCustomerId);
        if (!c) return null;
        const stageColor = (stages || []).find(s => s.stageName === c.stage)?.stageColor || '#3B82F6';
        return (
          <div class="drawer-overlay" onClick={() => setActiveActionCustomerId(null)}>
            <div class="bottom-sheet" onClick={e => e.stopPropagation()}>
              <div class="bottom-sheet-handle"></div>
              
              <div style={{ padding: '0 4px 12px 4px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-white)' }}>{c.customerName}</h3>
                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>Quick Customer Operations</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
                {/* View Details */}
                <button
                  type="button"
                  class="btn btn-secondary"
                  style={{ width: '100%', height: '44px', justifyContent: 'flex-start', paddingLeft: '16px', gap: '10px' }}
                  onClick={() => {
                    onViewCustomer(c.id);
                    setActiveActionCustomerId(null);
                  }}
                >
                  <span>👁️</span> View Full Profile
                </button>

                {/* Call */}
                {c.phone && (
                  <a
                    href={`tel:${c.phone}`}
                    class="btn btn-secondary"
                    style={{ width: '100%', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: '16px', gap: '10px', textDecoration: 'none', color: 'var(--text-white)' }}
                    onClick={() => setActiveActionCustomerId(null)}
                  >
                    <span>📞</span> Call: {c.phone}
                  </a>
                )}

                {/* WhatsApp */}
                {c.phone && (
                  <a
                    href={`https://wa.me/91${c.phone}?text=Hello%20${encodeURIComponent(c.customerName || '')},%20this%20is%20regarding%20your%20requirement.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn btn-secondary"
                    style={{ width: '100%', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: '16px', gap: '10px', textDecoration: 'none', color: 'var(--text-white)' }}
                    onClick={() => setActiveActionCustomerId(null)}
                  >
                    <span style={{ color: '#25D366' }}>💬</span> Chat on WhatsApp
                  </a>
                )}

                {/* Change Stage */}
                <button
                  type="button"
                  class="btn btn-secondary"
                  style={{ width: '100%', height: '44px', justifyContent: 'flex-start', paddingLeft: '16px', gap: '10px' }}
                  onClick={() => {
                    setSelectedCustId(c.id);
                    setIsQuickMoveOpen(true);
                    setActiveActionCustomerId(null);
                  }}
                >
                  <span style={{ color: stageColor }}>⚡</span> Move Pipeline Stage
                </button>

                {/* Add Note */}
                <button
                  type="button"
                  class="btn btn-secondary"
                  style={{ width: '100%', height: '44px', justifyContent: 'flex-start', paddingLeft: '16px', gap: '10px' }}
                  onClick={() => {
                    setSelectedCustId(c.id);
                    setIsQuickNoteOpen(true);
                    setActiveActionCustomerId(null);
                  }}
                >
                  <span>📝</span> Add Quick Executive Note
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  class="btn btn-primary"
                  style={{ width: '100%', height: '44px', marginTop: '6px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-white)', border: 'none' }}
                  onClick={() => setActiveActionCustomerId(null)}
                >
                  Cancel
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* --- POPUPS & MODALS OVERLAYS --- */}

      {/* MODAL 2: QUICK MOVE PIPELINE STAGE */}
      {isQuickMoveOpen && selectedCustId && (
        <div class="modal-overlay drawer-overlay">
          <div class="modal-content bottom-sheet" style={{ borderRadius: '20px 20px 0 0' }}>
            <div class="bottom-sheet-handle mobile-only"></div>
            <div class="modal-header">
              <h3 style={{ fontSize: '15px' }}>Move Deal Stage</h3>
              <button class="modal-close-btn" onClick={() => setIsQuickMoveOpen(false)}>&times;</button>
            </div>
            <div class="modal-body">
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Select the next sales stage for <strong>{(customers || []).find(x => x.id === selectedCustId)?.customerName || 'Customer'}</strong>.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(stages || []).map(stg => {
                  const currentCustomerStage = (customers || []).find(x => x.id === selectedCustId)?.stage;
                  const isCurrent = currentCustomerStage === stg?.stageName;
                  return (
                    <button
                      key={stg?.stageName}
                      class="btn btn-secondary"
                      style={{
                        justifyContent: 'flex-start',
                        borderColor: isCurrent ? 'var(--accent)' : 'var(--border-color)',
                        backgroundColor: isCurrent ? 'var(--accent-glow)' : 'var(--bg-card)'
                      }}
                      onClick={() => {
                        updateCustomerStage(selectedCustId, stg?.stageName);
                        setIsQuickMoveOpen(false);
                        setSelectedCustId(null);
                      }}
                    >
                      <span class="stage-color-dot" style={{ backgroundColor: stg?.stageColor || '#3B82F6', marginRight: '8px' }}></span>
                      {stg?.stageName}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: QUICK ADD NOTE */}
      {isQuickNoteOpen && selectedCustId && (
        <div class="modal-overlay drawer-overlay">
          <div class="modal-content bottom-sheet" style={{ borderRadius: '20px 20px 0 0' }}>
            <div class="bottom-sheet-handle mobile-only"></div>
            <div class="modal-header">
              <h3 style={{ fontSize: '15px' }}>Add Note to Client File</h3>
              <button class="modal-close-btn" onClick={() => setIsQuickNoteOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleQuickNoteSubmit}>
              <div class="modal-body">
                <p style={{ fontSize: '13px', marginBottom: '10px' }}>
                  Logging note for: <strong>{(customers || []).find(x => x.id === selectedCustId)?.customerName || 'Customer'}</strong>
                </p>
                <textarea
                  class="textarea-input"
                  placeholder="e.g. Discussed plywood sizes, customer requested price list..."
                  value={quickNoteText}
                  onChange={e => setQuickNoteText(e.target.value)}
                  required
                  autoFocus
                ></textarea>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onClick={() => setIsQuickNoteOpen(false)}>Cancel</button>
                <button type="submit" class="btn btn-primary">Save Note</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: QUICK SCHEDULE REMINDER */}
      {isQuickReminderOpen && selectedCustId && (
        <div class="modal-overlay drawer-overlay">
          <div class="modal-content bottom-sheet" style={{ borderRadius: '20px 20px 0 0' }}>
            <div class="bottom-sheet-handle mobile-only"></div>
            <div class="modal-header">
              <h3 style={{ fontSize: '15px' }}>Schedule Follow-Up Reminder</h3>
              <button class="modal-close-btn" onClick={() => setIsQuickReminderOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleQuickReminderSubmit}>
              <div class="modal-body">
                <div class="form-grid">
                  <p style={{ fontSize: '13.5px', gridColumn: '1 / -1' }}>
                    Scheduling for: <strong>{(customers || []).find(x => x.id === selectedCustId)?.customerName || 'Customer'}</strong>
                  </p>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>
                      Reminder Action Type
                    </label>
                    <select class="form-input" value={quickReminderType} onChange={e => setQuickReminderType(e.target.value)}>
                      <option value="Follow-up Call">📞 Follow-up Call</option>
                      <option value="Payment Due">💰 Payment Due Reminder</option>
                      <option value="Delivery">🚚 Materials Delivery</option>
                      <option value="Quotation Pending">📄 Quotation Pending Check</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>
                      Reminder Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      class="form-input"
                      value={quickReminderDate}
                      onChange={e => setQuickReminderDate(e.target.value)}
                      required
                    />
                  </div>

                  <div class="form-group-full">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>
                      Additional Notes
                    </label>
                    <input
                      type="text"
                      class="form-input"
                      placeholder="e.g. Call at 10 AM, check if advance ready..."
                      value={quickReminderNotes}
                      onChange={e => setQuickReminderNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onClick={() => setIsQuickReminderOpen(false)}>Cancel</button>
                <button type="submit" class="btn btn-primary">Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
