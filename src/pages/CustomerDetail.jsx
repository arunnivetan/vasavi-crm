import React, { useState, useEffect, useRef } from 'react';
import { useCRMDatabase } from '../context/CRMDatabaseContext';
import {
  generateCustomerProfilePDF,
  generateInvoicePDF,
  generateQuotationPDF,
  generateCustomerHistoryPDF
} from '../utils/pdfGenerator';
import { COMMON_PRODUCTS } from '../utils/db';

export default function CustomerDetail({ customerId, onBack }) {
  const {
    customers,
    activities,
    notes,
    payments,
    reminders,
    stages,
    staffList,
    activeStaff,
    editCustomer,
    updateCustomerStage,
    addPaymentTransaction,
    markCustomerPaid,
    addCustomerNote,
    createReminder,
    snoozeReminder,
    completeReminder,
    deleteCustomer,
    uploadCustomerImage,
    getCustomerImages,
    deleteCustomerImage,
    logPdfGeneration
  } = useCRMDatabase();

  const customer = (customers || []).find(c => c.id === customerId);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // If customer is soft-deleted or doesn't exist, redirect back
  useEffect(() => {
    if (!customer) {
      onBack();
    }
  }, [customer, onBack]);

  // --- DYNAMIC DATA QUERIES ---
  const customerNotes = (notes || []).filter(n => n && n.customerId === customerId);
  const customerPayments = (payments || []).filter(p => p && p.customerId === customerId);
  const customerActivities = (activities || []).filter(a => a && a.customerId === customerId);
  const customerReminders = (reminders || []).filter(r => r && r.customerId === customerId);

  // --- STATE STORES ---
  const [activeTab, setActiveTab] = useState('notes'); // 'notes' or 'history'
  const [customerImages, setCustomerImages] = useState([]);
  
  // Modals / Overlay Form states
  const [isEditInfoOpen, setIsEditInfoOpen] = useState(false);
  const [isUpdatePayOpen, setIsUpdatePayOpen] = useState(false);
  const [isMoveStageOpen, setIsMoveStageOpen] = useState(false);
  const [isAddReminderOpen, setIsAddReminderOpen] = useState(false);
  const [isSnoozeOpen, setIsSnoozeOpen] = useState(false);
  const [activeReminderId, setActiveReminderId] = useState(null);
  
  // Lightbox Preview Image state
  const [lightboxImage, setLightboxImage] = useState(null);

  // Note form state
  const [noteInput, setNoteInput] = useState('');

  // Payment form state
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash');
  const [payNote, setPayNote] = useState('');

  // Edit details form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editReq, setEditReq] = useState('');
  const [editProjType, setEditProjType] = useState('');
  const [editStaff, setEditStaff] = useState('');
  const [editPriority, setEditPriority] = useState('');

  // Structured quotation cost table items for edit modal
  const [editItems, setEditItems] = useState([
    { productName: '', qty: 1, unit: 'Sheets', rate: 0, total: 0, status: 'Pending', category: 'Material' }
  ]);
  const [editDiscount, setEditDiscount] = useState('');
  const [editTaxPercent, setEditTaxPercent] = useState('18');

  // --- INTERACTIVE MATH CALCULATOR FOR EDIT ---
  const editSubtotal = editItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
  const editDiscountVal = parseFloat(editDiscount || 0);
  const editTaxPercentVal = parseFloat(editTaxPercent || 0);
  const editTaxAmount = ((editSubtotal - editDiscountVal) * editTaxPercentVal) / 100;
  const editGrandTotal = editSubtotal - editDiscountVal + editTaxAmount;

  // Category wise aggregates for edit modal
  const editCatSubtotals = {
    Material: editItems.filter(i => i.category === 'Material').reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0),
    Installation: editItems.filter(i => i.category === 'Installation').reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0),
    Automation: editItems.filter(i => i.category === 'Automation').reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0),
    Labor: editItems.filter(i => i.category === 'Labor').reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0),
    Miscellaneous: editItems.filter(i => i.category === 'Miscellaneous').reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0),
  };

  // Completion metrics for edit modal
  const editTotalItemsCount = editItems.length;
  const editCompletedItemsCount = editItems.filter(item => item.status === 'Completed' || item.status === 'Installed').length;
  const editCompletionPercent = editTotalItemsCount > 0 ? Math.round((editCompletedItemsCount / editTotalItemsCount) * 100) : 0;

  // AI Suggestion Assistant for edit modal
  const getEditAISuggestions = () => {
    const products = editItems.map(i => (i.productName || '').toLowerCase());
    let recommendations = [];
    if (products.some(p => p.includes('plywood') || p.includes('ply'))) {
      recommendations.push("Detected plywood usage. We recommend soft-close hydraulic hinges, 1.2mm anti-termite backing laminates, and anti-rust heavy-duty fasteners for anti-gravity wall mounting stability.");
    }
    if (products.some(p => p.includes('hinge') || p.includes('hinges') || p.includes('channel'))) {
      recommendations.push("Hardware components active. Ensure standard alignment templates and matching hydraulic soft-close damping buffers are included.");
    }
    if (editItems.some(item => item.category === 'Automation')) {
      recommendations.push("Smart Automation component added. We recommend Zigbee-compatible decentralized mesh bridges, high-grade shielded low-voltage cable paths, and touch control panels.");
    }
    if (editItems.some(item => item.category === 'Installation' || item.category === 'Labor')) {
      recommendations.push("Premium installation service scheduled. Recommend on-site alignment jigs and precision laser leveling modules to eliminate spatial gravity deviation.");
    }
    if (recommendations.length === 0) {
      return "Awaiting modular item configuration to run real-time hardware recommendations & predictive material lists...";
    }
    return recommendations.join(" ");
  };

  // --- COSTING TABLE HANDLERS FOR EDIT ---
  const handleEditItemChange = (index, field, value) => {
    const updated = editItems.map((item, i) => {
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
    editItemsStateSet(updated);
  };

  const editItemsStateSet = (items) => {
    setEditItems(items);
  };

  const handleEditAddRow = () => {
    setEditItems([...editItems, { productName: '', qty: 1, unit: 'Sheets', rate: 0, total: 0, status: 'Pending', category: 'Material' }]);
  };

  const handleEditDeleteRow = (index) => {
    const updated = editItems.filter((_, i) => i !== index);
    setEditItems(updated.length > 0 ? updated : [{ productName: '', qty: 1, unit: 'Sheets', rate: 0, total: 0, status: 'Pending', category: 'Material' }]);
  };

  const handleEditDuplicateRow = (index) => {
    const original = editItems[index];
    setEditItems([
      ...editItems,
      { ...original, productName: original.productName ? original.productName + ' (Copy)' : '' }
    ]);
  };

  // New reminder form state
  const [remType, setRemType] = useState('Follow-up Call');
  const [remDate, setRemDate] = useState('');
  const [remNotes, setRemNotes] = useState('');

  // Snooze form state
  const [snoozeDate, setSnoozeDate] = useState('');

  // --- RE-FETCH IMAGES ---
  const fetchCustomerImages = async () => {
    if (!customerId) return;
    try {
      const imgs = await getCustomerImages(customerId);
      setCustomerImages(imgs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCustomerImages();
  }, [customerId]);

  if (!customer) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  // --- ACTIONS HANDLERS ---
  const handleEditInfoSubmit = (e) => {
    e.preventDefault();
    const activeItems = editItems.filter(item => item.productName.trim() !== '');

    editCustomer(customerId, {
      customerName: editName,
      phone: editPhone,
      address: editAddress,
      requirement: activeItems.map(item => `${item.productName} (${item.qty} ${item.unit} @ ₹${item.rate})`).join(', ') || 'Standard supplies',
      projectType: editProjType,
      assignedStaff: editStaff,
      priority: editPriority,

      // Costing workspace fields
      items: activeItems,
      subtotal: editSubtotal,
      discount: editDiscountVal,
      taxPercent: editTaxPercentVal,
      taxAmount: editTaxAmount,
      amount: editGrandTotal
    });
    setIsEditInfoOpen(false);
  };

  const handleUpdatePaymentSubmit = (e) => {
    e.preventDefault();
    if (!payAmount) return;
    addPaymentTransaction(customerId, parseFloat(payAmount), payMode, payNote);
    setPayAmount('');
    setPayNote('');
    setIsUpdatePayOpen(false);
  };

  const handleAddNoteSubmit = (e) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    addCustomerNote(customerId, noteInput.trim());
    setNoteInput('');
  };

  const handleCreateReminderSubmit = (e) => {
    e.preventDefault();
    if (!remDate) return;
    createReminder(customerId, remType, remDate, remNotes);
    setRemDate('');
    setRemNotes('');
    setIsAddReminderOpen(false);
  };

  const handleSnoozeConfirm = (e) => {
    e.preventDefault();
    if (!snoozeDate || !activeReminderId) return;
    snoozeReminder(activeReminderId, snoozeDate);
    setSnoozeDate('');
    setActiveReminderId(null);
    setIsSnoozeOpen(false);
  };

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Choose file type via prompt or default
    const typePrompt = prompt('Enter File Type:\n(Blueprint, Site Photo, Quotation, Bill, Progress)', 'Site Photo');
    const imageType = typePrompt || 'Site Photo';

    for (let i = 0; i < files.length; i++) {
      try {
        await uploadCustomerImage(customerId, files[i], imageType);
      } catch (err) {
        alert(`Failed to upload ${files[i].name}`);
      }
    }
    fetchCustomerImages();
  };

  const handleDeleteImage = async (imgId, fileName) => {
    if (confirm(`Are you sure you want to delete file "${fileName}"?`)) {
      await deleteCustomerImage(imgId, customerId, fileName);
      fetchCustomerImages();
    }
  };

  const handleStageChange = (newStage) => {
    updateCustomerStage(customerId, newStage);
    setIsMoveStageOpen(false);
  };

  // --- PDF REPORTS TRIGGERS ---
  const handleExportProfile = (action = 'download') => {
    generateCustomerProfilePDF(customer, customerNotes, customerActivities, customerImages, action);
    logPdfGeneration(customerId, 'Customer Profile Report');
  };

  const handleExportInvoice = (action = 'download') => {
    generateInvoicePDF(customer, customerPayments, action);
    logPdfGeneration(customerId, 'Sales Tax Invoice');
  };

  const handleExportQuotation = (action = 'download') => {
    generateQuotationPDF(customer, action);
    logPdfGeneration(customerId, 'Commercial Quotation');
  };

  const handleExportHistory = (action = 'download') => {
    generateCustomerHistoryPDF(customer, customerActivities, action);
    logPdfGeneration(customerId, 'Permanent Activity Ledger');
  };

  const handleDeleteCustomerClick = () => {
    if (confirm('Are you absolutely sure you want to delete this customer? All active view links will be disabled, but records will be permanently archived.')) {
      deleteCustomer(customerId);
    }
  };

  const customerItems = customer.items || [];
  const viewTotalItemsCount = customerItems.length;
  const viewCompletedItemsCount = customerItems.filter(item => item.status === 'Completed' || item.status === 'Installed').length;
  const viewCompletionPercent = viewTotalItemsCount > 0 ? Math.round((viewCompletedItemsCount / viewTotalItemsCount) * 100) : 0;

  const viewCatSubtotals = {
    Material: customerItems.filter(i => i.category === 'Material').reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0),
    Installation: customerItems.filter(i => i.category === 'Installation').reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0),
    Automation: customerItems.filter(i => i.category === 'Automation').reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0),
    Labor: customerItems.filter(i => i.category === 'Labor').reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0),
    Miscellaneous: customerItems.filter(i => i.category === 'Miscellaneous').reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0),
  };

  return (
    <div>
      {/* HEADER SECTION: Back buttons, metadata badges, quick contact triggers */}
      <div class="page-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button class="action-btn-circle" onClick={onBack} title="Back to Dashboard">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '800' }}>{customer.customerName}</h2>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
              {/* Stage Badge */}
              <span
                class="badge"
                style={{
                  backgroundColor: `${stages.find(s => s.stageName === customer.stage)?.stageColor || '#3B82F6'}18`,
                  color: stages.find(s => s.stageName === customer.stage)?.stageColor || '#3B82F6',
                  border: `1px solid ${stages.find(s => s.stageName === customer.stage)?.stageColor}40`
                }}
              >
                {customer.stage}
              </span>
              {/* Priority Badge */}
              <span class={`badge badge-priority-${customer.priority.toLowerCase()}`}>
                {customer.priority}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Contact & Export shortcuts */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {customer.phone && (
            <>
              <a href={`tel:${customer.phone}`} class="btn btn-success btn-sm btn-circle" style={{ width: '36px', height: '36px', borderRadius: '50%' }} title="Call Customer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.1-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </a>
              <a
                href={`https://wa.me/91${customer.phone}?text=Hello%20${encodeURIComponent(customer.customerName)},%20regarding%20your%20requirement%20for%20${encodeURIComponent(customer.requirement)}.`}
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-primary btn-sm btn-circle"
                style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#25D366', boxShadow: 'none' }}
                title="WhatsApp Message"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
              </a>
            </>
          )}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button class="btn btn-secondary btn-sm" onClick={() => handleExportProfile('download')} title="Download Profile PDF">
              📄 Profile PDF
            </button>
            <button class="btn btn-secondary btn-sm btn-circle" style={{ width: '32px', height: '32px', borderRadius: '50%', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => handleExportProfile('print')} title="View / Print Profile PDF">
              🖨️
            </button>
          </div>
        </div>
      </div>

      {/* DETAIL CONTENT: Left Info Panel, Right Note/History Panel */}
      <div class="detail-grid">
        
        {/* LEFT COLUMN: Customer info details & Financial statements */}
        <div>
          {/* Info Card */}
          <div class="detail-card">
            <div class="detail-card-title">
              CUSTOMER INFO
              <button
                class="action-btn-circle"
                style={{ width: '22px', height: '22px' }}
                title="Edit details"
                onClick={() => {
                  setEditName(customer.customerName);
                  setEditPhone(customer.phone);
                  setEditAddress(customer.address);
                  setEditReq(customer.requirement);
                  setEditProjType(customer.projectType);
                  setEditStaff(customer.assignedStaff);
                  setEditPriority(customer.priority);
                  setEditItems(customer.items && customer.items.length > 0 ? customer.items : [{ productName: '', qty: 1, unit: 'Sheets', rate: 0, total: 0 }]);
                  setEditDiscount(customer.discount !== undefined ? customer.discount : '');
                  setEditTaxPercent(customer.taxPercent !== undefined ? customer.taxPercent.toString() : '18');
                  setIsEditInfoOpen(true);
                }}
              >
                ✎
              </button>
            </div>
            
            <div class="info-list">
              {/* Phone */}
              <div class="info-row">
                <span class="info-icon">📞</span>
                <div class="info-content">
                  <span class="info-label">PHONE NUMBER</span>
                  <span class="info-value bold">{customer.phone || 'Not Logged'}</span>
                </div>
              </div>

              {/* Requirement */}
              <div class="info-row" style={{ flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span class="info-icon">📋</span>
                  <div class="info-content">
                    <span class="info-label">ITEMS & MATERIALS</span>
                  </div>
                </div>
                {customer.items && customer.items.length > 0 ? (
                  <div style={{
                    marginTop: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    width: '100%'
                  }}>
                    {/* Glowing completion progress bar */}
                    <div style={{
                      backgroundColor: 'rgba(21, 31, 50, 0.4)',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                          PROJECT COMPLETION
                        </span>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: '800', color: 'var(--accent)' }}>
                          {viewCompletionPercent}%
                        </span>
                      </div>
                      <div className="ag-progress-bar-bg" style={{ height: '6px' }}>
                        <div className="ag-progress-bar-fill" style={{ width: `${viewCompletionPercent}%` }}></div>
                      </div>
                    </div>

                    {/* Category Expense Splits */}
                    <div style={{
                      backgroundColor: 'rgba(21, 31, 50, 0.4)',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-white)', textTransform: 'uppercase', letterSpacing: '0.3px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                        WORK TYPE BREAKDOWN
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                        {viewCatSubtotals.Material > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                            <span style={{ color: '#90CDF4', fontWeight: '500' }}>Material:</span>
                            <span style={{ fontWeight: '700' }}>₹{viewCatSubtotals.Material.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        {viewCatSubtotals.Installation > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                            <span style={{ color: '#68D391', fontWeight: '500' }}>Install:</span>
                            <span style={{ fontWeight: '700' }}>₹{viewCatSubtotals.Installation.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        {viewCatSubtotals.Automation > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', background: 'rgba(168, 85, 247, 0.08)', borderRadius: '4px', border: '1px solid rgba(168, 85, 247, 0.15)' }}>
                            <span style={{ color: '#D6BCFA', fontWeight: '500' }}>Automation:</span>
                            <span style={{ fontWeight: '700' }}>₹{viewCatSubtotals.Automation.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        {viewCatSubtotals.Labor > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', background: 'rgba(236, 72, 153, 0.08)', borderRadius: '4px', border: '1px solid rgba(236, 72, 153, 0.15)' }}>
                            <span style={{ color: '#FBB6CE', fontWeight: '500' }}>Labor:</span>
                            <span style={{ fontWeight: '700' }}>₹{viewCatSubtotals.Labor.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        {viewCatSubtotals.Miscellaneous > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', background: 'rgba(107, 114, 128, 0.08)', borderRadius: '4px', border: '1px solid rgba(107, 114, 128, 0.15)' }}>
                            <span style={{ color: '#CBD5E0', fontWeight: '500' }}>Misc:</span>
                            <span style={{ fontWeight: '700' }}>₹{viewCatSubtotals.Miscellaneous.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cost items listing */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      backgroundColor: 'rgba(15, 22, 36, 0.4)',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      width: '100%'
                    }}>
                    {(customerItems || []).map((item, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '12px',
                        borderBottom: idx === (customerItems || []).length - 1 ? 'none' : '1px dashed rgba(255,255,255,0.05)',
                        paddingBottom: idx === (customerItems || []).length - 1 ? '0' : '6px'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '700', color: 'var(--text-white)' }}>{item.productName}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {item.qty} {item.unit} @ ₹{parseFloat(item.rate).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <span style={{ fontWeight: '700', color: 'var(--accent)' }}>
                          ₹{(parseFloat(item.total) || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                    {customer.discount > 0 && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '11px',
                        color: 'var(--status-green)',
                        borderTop: '1px solid var(--border-color)',
                        paddingTop: '6px',
                        marginTop: '2px'
                      }}>
                        <span>Discount:</span>
                        <span>-₹{parseFloat(customer.discount).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {customer.taxAmount > 0 && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '11px',
                        color: 'var(--text-muted)'
                      }}>
                        <span>GST ({customer.taxPercent}%):</span>
                        <span>+₹{parseFloat(customer.taxAmount).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    </div>
                  </div>
                ) : (
                  <div class="info-content" style={{ paddingLeft: '28px' }}>
                    <span class="info-value" style={{ whiteSpace: 'pre-wrap' }}>{customer.requirement || 'No requirements loaded'}</span>
                  </div>
                )}
              </div>

              {/* Project Type */}
              <div class="info-row">
                <span class="info-icon">🛠️</span>
                <div class="info-content">
                  <span class="info-label">PROJECT TYPE</span>
                  <span class="info-value">{customer.projectType || 'Hardware'}</span>
                </div>
              </div>

              {/* Address */}
              <div class="info-row">
                <span class="info-icon">📍</span>
                <div class="info-content">
                  <span class="info-label">SITE / BILLING ADDRESS</span>
                  <span class="info-value">{customer.address || 'No Address Logged'}</span>
                </div>
              </div>

              {/* Staff Assigned */}
              <div class="info-row">
                <span class="info-icon">👤</span>
                <div class="info-content">
                  <span class="info-label">ASSIGNED EXECUTIVE</span>
                  <span class="info-value">{customer.assignedStaff || 'Unassigned'}</span>
                </div>
              </div>

              {/* Next Followup date */}
              <div class="info-row">
                <span class="info-icon">📅</span>
                <div class="info-content">
                  <span class="info-label">FOLLOW-UP TARGET</span>
                  <span class="info-value" style={{ color: customer.followupDate && customer.followupDate < todayStr ? 'var(--status-red)' : 'inherit', fontWeight: customer.followupDate && customer.followupDate < todayStr ? '600' : 'normal' }}>
                    {customer.followupDate || 'No date scheduled'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payments Details Card */}
          <div class="detail-card" style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }}>
            <div class="detail-card-title">
              FINANCIAL STATEMENT
              <div style={{ display: 'flex', gap: '5px' }}>
                <span class={`badge badge-payment-${customer.paymentStatus.toLowerCase()}`}>
                  {customer.paymentStatus}
                </span>
                <button
                  class="action-btn-circle"
                  style={{ width: '22px', height: '22px' }}
                  title="Record Collection"
                  onClick={() => setIsUpdatePayOpen(true)}
                >
                  +
                </button>
              </div>
            </div>

            {/* Financial summary blocks */}
            <div class="payment-metric-row">
              <div class="payment-sub-card">
                <div class="payment-sub-label">TOTAL DEAL</div>
                <div class="payment-sub-val">₹{customer.amount}</div>
              </div>
              <div class="payment-sub-card">
                <div class="payment-sub-label">PAID ADV</div>
                <div class="payment-sub-val green">₹{customer.advancePaid || 0}</div>
              </div>
              <div class="payment-sub-card">
                <div class="payment-sub-label">BAL DUE</div>
                <div class="payment-sub-val red">₹{customer.pendingAmount || 0}</div>
              </div>
            </div>

            {/* Invoicing and Paid triggers */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                <button class="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => handleExportInvoice('download')} title="Download Invoice PDF">
                  View invoice
                </button>
                <button class="btn btn-secondary btn-sm btn-circle" style={{ width: '32px', height: '32px', borderRadius: '50%', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => handleExportInvoice('print')} title="View / Print Invoice PDF">
                  🖨️
                </button>
              </div>
              {customer.pendingAmount > 0 && (
                <button class="btn btn-success btn-sm" style={{ flex: 1 }} onClick={() => markCustomerPaid(customerId)}>
                  Mark Paid
                </button>
              )}
            </div>

            {/* Mini payment ledger history */}
            {customerPayments.length > 0 && (
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed var(--border-color)' }}>
                <h4 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Collection History</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '110px', overflowY: 'auto' }}>
                  {customerPayments.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyBetween: 'space-between', fontSize: '11px', backgroundColor: 'var(--bg-main)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '700' }}>₹{p.amountPaid} via {p.paymentMode}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{p.note || 'Cash payment'}</span>
                      </div>
                      <div style={{ textAlign: 'right', marginLeft: 'auto', color: 'var(--text-muted)' }}>
                        <div>{new Date(p.timestamp).toLocaleDateString('en-IN')}</div>
                        <div>by {p.updatedBy}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Core Actions list */}
          <div class="detail-card">
            <div class="detail-card-title">QUICK ACTIONS</div>
            <div class="quick-actions-panel">
              <button class="btn btn-secondary btn-sm" onClick={() => setIsMoveStageOpen(true)}>Move Stage</button>
              <button class="btn btn-secondary btn-sm" onClick={() => setIsAddReminderOpen(true)}>Set Reminder</button>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button class="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => handleExportQuotation('download')}>Export Estimate</button>
                <button class="btn btn-secondary btn-sm btn-circle" style={{ width: '32px', height: '32px', borderRadius: '50%', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => handleExportQuotation('print')} title="View / Print Estimate">
                  🖨️
                </button>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button class="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => handleExportHistory('download')}>Export History</button>
                <button class="btn btn-secondary btn-sm btn-circle" style={{ width: '32px', height: '32px', borderRadius: '50%', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => handleExportHistory('print')} title="View / Print History">
                  🖨️
                </button>
              </div>
              <button class="btn btn-danger btn-sm" style={{ gridColumn: '1 / -1', marginTop: '6px' }} onClick={handleDeleteCustomerClick}>
                Delete Customer File
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Toggleable Tab Notes & Timeline activities */}
        <div>
          {/* Tab Button Selectors */}
          <div class="tabs-bar">
            <button class={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>
              Notes ({customerNotes.length})
            </button>
            <button class={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
              Permanent History ({customerActivities.length})
            </button>
          </div>

          {/* Tab Content 1: Notes feed */}
          {activeTab === 'notes' && (
            <div class="notes-container">
              {/* Form to log note */}
              <div class="detail-card">
                <form onSubmit={handleAddNoteSubmit} class="add-note-form">
                  <textarea
                    class="textarea-input"
                    placeholder="Log a client interaction note here (waterproof board requests, quotation calls scheduled, etc.)..."
                    value={noteInput}
                    onChange={e => setNoteInput(e.target.value)}
                    required
                  ></textarea>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" class="btn btn-primary btn-sm">Add Note</button>
                  </div>
                </form>
              </div>

              {/* Notes list */}
              <div class="notes-list">
                {customerNotes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontStyle: 'italic', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                    No notes have been logged for this customer file.
                  </div>
                ) : (
                  customerNotes.map(n => (
                    <div class="note-bubble" key={n.id}>
                      <div class="note-meta">
                        <span class="note-author">{n.addedBy}</span>
                        <span>{new Date(n.timestamp).toLocaleDateString('en-IN')} {new Date(n.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div class="note-text">{n.noteText}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab Content 2: Immutable timeline activity ledger */}
          {activeTab === 'history' && (
            <div class="detail-card" style={{ paddingRight: '10px' }}>
              <div class="activity-timeline">
                {customerActivities.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No activity logs recorded.
                  </div>
                ) : (
                  customerActivities.map((act, index) => (
                    <div class={`activity-item ${act.actionType}`} key={index}>
                      <div class="activity-item-header">
                        <span class="activity-item-staff">👤 {act.updatedBy}</span>
                        <span>{new Date(act.timestamp).toLocaleDateString('en-IN')} {new Date(act.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div class="activity-item-desc">
                        <strong>{act.actionType.toUpperCase().replace('_', ' ')}</strong>: {act.newValue}
                      </div>
                      {act.oldValue && (
                        <div class="activity-item-diff">
                          Previous: {act.oldValue}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Reminders Panel */}
          <div class="detail-card" style={{ marginTop: '20px' }}>
            <div class="detail-card-title">
              SCHEDULED ALERTS & CALLS
              <button
                class="action-btn-circle"
                style={{ width: '22px', height: '22px' }}
                title="Create Alert"
                onClick={() => setIsAddReminderOpen(true)}
              >
                +
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              {(customerReminders || []).length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '12px', padding: '10px' }}>
                  No follow-up reminder alerts scheduled.
                </div>
              ) : (
                (customerReminders || [])
                  .sort((a, b) => new Date(a?.reminderDate || 0) - new Date(b?.reminderDate || 0))
                  .map(r => {
                    const remDate = r?.reminderDate || '';
                    const remDateOnly = remDate.split('T')[0] || '';
                    const isOverdue = remDateOnly && remDateOnly < todayStr;
                    return (
                      <div
                        key={r?.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyBetween: 'space-between',
                          padding: '10px',
                          backgroundColor: 'var(--bg-main)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          borderLeft: `4px solid ${r?.status === 'Completed' ? 'var(--status-green)' : isOverdue ? 'var(--status-red)' : 'var(--status-yellow)'}`
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: r?.status === 'Completed' ? 'var(--text-muted)' : 'var(--text-white)' }}>
                            {r?.reminderType} {r?.status === 'Completed' && '✓'}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Due: {remDate.replace('T', ' ') || 'No Date'}
                          </span>
                        {r.notes && (
                          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Note: {r.notes}
                          </span>
                        )}
                      </div>

                      {r.status !== 'Completed' && (
                        <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                          <button
                            class="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: '10px' }}
                            onClick={() => {
                              setActiveReminderId(r.id);
                              setSnoozeDate(todayStr);
                              setIsSnoozeOpen(true);
                            }}
                          >
                            Snooze
                          </button>
                          <button
                            class="btn btn-success btn-sm"
                            style={{ padding: '3px 8px', fontSize: '10px' }}
                            onClick={() => completeReminder(r.id)}
                          >
                            Done
                          </button>
                        </div>
                      )}
                    </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* BLUEPRINTS & SITE PHOTOS FILES UPLOAD SECTION */}
          <div class="detail-card" style={{ marginTop: '20px' }}>
            <div class="detail-card-title">
              BLUEPRINTS & SITE PHOTOS
              <div style={{ display: 'flex', gap: '6px' }}>
                {/* Camera upload direct trigger */}
                <button
                  class="action-btn-circle"
                  style={{ width: '26px', height: '26px', fontSize: '12px' }}
                  title="Camera Capture"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  📷
                </button>
                {/* Files select trigger */}
                <button
                  class="action-btn-circle"
                  style={{ width: '26px', height: '26px', fontSize: '12px' }}
                  title="Select File"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📁
                </button>
              </div>
            </div>

            {/* Hidden Input elements */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              multiple
              accept="image/*"
              onChange={handleImageUpload}
            />
            <input
              type="file"
              ref={cameraInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              capture="environment" // Forces back camera on mobile
              onChange={handleImageUpload}
            />

            {/* Image Dotted box placeholder */}
            <div class="image-upload-dropzone" onClick={() => fileInputRef.current?.click()}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              <span>Dashed Upload Zone: Tap to select photos or blueprint images</span>
            </div>

            {/* Images display grid */}
            {customerImages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
                No site photos or blueprint blueprints uploaded.
              </div>
            ) : (
              <div class="images-grid">
                {customerImages.map(img => (
                  <div class="image-thumbnail-card" key={img.id}>
                    <img
                      src={img.imageUrl}
                      alt={img.fileName}
                      onClick={() => setLightboxImage(img)}
                    />
                    <span class="image-type-tag">{img.imageType}</span>
                    <div class="image-action-overlay">
                      <button
                        class="image-action-btn"
                        title="Delete photo"
                        onClick={() => handleDeleteImage(img.id, img.fileName)}
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* --- DETAIL OVERLAYS & MODALS --- */}

      {/* LIGHTBOX PREVIEW LIGHTBOX */}
      {lightboxImage && (
        <div class="lightbox-overlay" onClick={() => setLightboxImage(null)}>
          <div class="lightbox-content-box" onClick={e => e.stopPropagation()}>
            <button class="lightbox-close" onClick={() => setLightboxImage(null)}>&times;</button>
            <img class="lightbox-image" src={lightboxImage.imageUrl} alt={lightboxImage.fileName} />
            <div class="lightbox-caption">
              <strong>[{lightboxImage.imageType}]</strong> {lightboxImage.fileName} | uploaded on {new Date(lightboxImage.uploadedAt).toLocaleDateString('en-IN')} by {lightboxImage.uploadedBy}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
                <a
                  href={lightboxImage.imageUrl}
                  download={lightboxImage.fileName}
                  class="btn btn-primary btn-sm"
                  style={{ textDecoration: 'none' }}
                >
                  Download File
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: EDIT CUSTOMER METADATA */}
      {isEditInfoOpen && (
        <div class="modal-overlay">
          <div class="modal-content" style={{ maxWidth: '780px', width: '100%' }}>
            <div class="modal-header">
              <h3>Edit Client File</h3>
              <button class="modal-close-btn" onClick={() => setIsEditInfoOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleEditInfoSubmit}>
              <div class="modal-body">
                <div class="form-grid two-col">
                  <div class="form-group-full">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>Customer Name</label>
                    <input type="text" class="form-input" value={editName} onChange={e => setEditName(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>Phone Number</label>
                    <input type="tel" class="form-input" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>Deal Priority</label>
                    <select class="form-input" value={editPriority} onChange={e => setEditPriority(e.target.value)}>
                      <option value="High">🔴 High Priority</option>
                      <option value="Medium">🟡 Medium Priority</option>
                      <option value="Low">🟢 Low Priority</option>
                    </select>
                  </div>

                  {/* Futuristic Anti-Gravity Modular costing workspace */}
                  <div class="form-group-full" style={{ marginTop: '10px' }}>
                    
                    {/* Header bar */}
                    <div className="ag-dashboard-header">
                      <div className="ag-project-title-wrap">
                        <span style={{ fontSize: '18px' }}>🌌</span>
                        <h4 className="ag-project-title">
                          ANTI GRAVITY PROJECT DETAILS (EDIT)
                        </h4>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="ag-project-status-badge">HYPERDRIVE ACTIVE</span>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{
                            background: 'linear-gradient(135deg, var(--accent) 0%, #EA580C 100%)',
                            border: 'none',
                            boxShadow: '0 0 10px rgba(249, 115, 22, 0.4)',
                            fontWeight: '700',
                            padding: '6px 14px'
                          }}
                          onClick={handleEditAddRow}
                        >
                          + Add Item Module
                        </button>
                      </div>
                    </div>

                    {/* Widgets Section: Completion & AI Assistant */}
                    <div className="ag-dashboard-widgets">
                      {/* Project Completion Tracker */}
                      <div className="ag-widget-card">
                        <div className="ag-widget-title">
                          <span>📊</span> Modular Completion Status
                        </div>
                        <div style={{ padding: '4px 0' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Completed & Installed Modules ratio:
                          </span>
                          <div className="ag-progress-bar-container">
                            <div className="ag-progress-bar-bg">
                              <div className="ag-progress-bar-fill" style={{ width: `${editCompletionPercent}%` }}></div>
                            </div>
                            <span className="ag-progress-pct">{editCompletionPercent}%</span>
                          </div>
                        </div>
                      </div>

                      {/* AI suggestions */}
                      <div className="ag-widget-card ag-ai-assist">
                        <div className="ag-widget-title" style={{ borderBottomColor: 'rgba(139, 92, 246, 0.15)' }}>
                          <span>🔮</span> Anti-Gravity AI Suggestion Box
                        </div>
                        <div className="ag-ai-bubble">
                          {getEditAISuggestions()}
                        </div>
                      </div>
                    </div>

                    {/* Category Expense Split Workspace */}
                    <div className="ag-widget-card" style={{ marginBottom: '20px', padding: '12px 18px' }}>
                      <div className="ag-widget-title" style={{ marginBottom: '10px' }}>
                        <span>💰</span> Category Expense Workspace splits
                      </div>
                      <div className="ag-expenses-grid">
                        <div className="ag-expense-block">
                          <span className="ag-expense-lbl">Material</span>
                          <span className="ag-expense-val">₹{editCatSubtotals.Material.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="ag-expense-block">
                          <span className="ag-expense-lbl">Installation</span>
                          <span className="ag-expense-val">₹{editCatSubtotals.Installation.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="ag-expense-block">
                          <span className="ag-expense-lbl">Automation</span>
                          <span className="ag-expense-val">₹{editCatSubtotals.Automation.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="ag-expense-block">
                          <span className="ag-expense-lbl">Labor</span>
                          <span className="ag-expense-val">₹{editCatSubtotals.Labor.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="ag-expense-block">
                          <span className="ag-expense-lbl">Misc</span>
                          <span className="ag-expense-val">₹{editCatSubtotals.Miscellaneous.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Glassmorphic Item Deck grid */}
                    <div className="ag-card-deck">
                      {editItems.map((item, idx) => (
                        <div className="ag-glass-card" key={idx}>
                          <div className="ag-card-header">
                            <span className="ag-card-index">
                              <span>🌌</span> MODULE #{idx + 1}
                            </span>
                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                              <span className={`ag-category-badge ag-cat-${(item.category || 'Material').toLowerCase().replace(' ', '')}`}>
                                {item.category || 'Material'}
                              </span>
                              <span className={`ag-glow-status ag-status-${(item.status || 'Pending').toLowerCase().replace(' ', '')}`}>
                                {item.status || 'Pending'}
                              </span>
                            </div>
                          </div>

                          <div className="ag-card-body-grid">
                            {/* Product Name */}
                            <div className="ag-field-span-2">
                              <label className="ag-form-label">Product / Material Description</label>
                              <input
                                type="text"
                                className="ag-input-futuristic"
                                placeholder="Search or type product..."
                                list="common-products"
                                value={item.productName}
                                onChange={e => handleEditItemChange(idx, 'productName', e.target.value)}
                                required
                              />
                            </div>

                            {/* Category selector */}
                            <div>
                              <label className="ag-form-label">Category</label>
                              <select
                                className="ag-select-futuristic"
                                value={item.category || 'Material'}
                                onChange={e => handleEditItemChange(idx, 'category', e.target.value)}
                              >
                                <option value="Material">Material</option>
                                <option value="Installation">Installation</option>
                                <option value="Automation">Automation</option>
                                <option value="Labor">Labor</option>
                                <option value="Miscellaneous">Miscellaneous</option>
                              </select>
                            </div>

                            {/* Status Selector */}
                            <div>
                              <label className="ag-form-label">Status</label>
                              <select
                                className="ag-select-futuristic"
                                value={item.status || 'Pending'}
                                onChange={e => handleEditItemChange(idx, 'status', e.target.value)}
                              >
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                                <option value="Installed">Installed</option>
                              </select>
                            </div>

                            {/* Qty */}
                            <div>
                              <label className="ag-form-label">Qty</label>
                              <input
                                type="number"
                                className="ag-input-futuristic"
                                placeholder="Qty"
                                min="0.01"
                                step="any"
                                value={item.qty}
                                onChange={e => handleEditItemChange(idx, 'qty', e.target.value)}
                                required
                              />
                            </div>

                            {/* Unit selector */}
                            <div>
                              <label className="ag-form-label">Unit</label>
                              <select
                                className="ag-select-futuristic"
                                value={item.unit}
                                onChange={e => handleEditItemChange(idx, 'unit', e.target.value)}
                              >
                                <option value="Sheets">Sheets</option>
                                <option value="Sets">Sets</option>
                                <option value="Pcs">Pcs</option>
                                <option value="Boxes">Boxes</option>
                                <option value="Kgs">Kgs</option>
                                <option value="Bags">Bags</option>
                                <option value="Rft">Rft</option>
                                <option value="Lot">Lot</option>
                              </select>
                            </div>

                            {/* Rate */}
                            <div className="ag-field-span-2">
                              <label className="ag-form-label">Rate / Unit Price (₹)</label>
                              <input
                                type="number"
                                className="ag-input-futuristic"
                                placeholder="Rate"
                                min="0"
                                step="any"
                                value={item.rate}
                                onChange={e => handleEditItemChange(idx, 'rate', e.target.value)}
                                required
                              />
                            </div>
                          </div>

                          <div className="ag-card-footer">
                            <div className="ag-card-actions">
                              <button
                                type="button"
                                className="action-btn-circle accent"
                                title="Duplicate Module"
                                onClick={() => handleEditDuplicateRow(idx)}
                                style={{ width: '28px', height: '28px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                📋
                              </button>
                              <button
                                type="button"
                                className="action-btn-circle"
                                title="Delete Module"
                                style={{ width: '28px', height: '28px', fontSize: '14px', color: 'var(--status-red)', borderColor: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onClick={() => handleEditDeleteRow(idx)}
                              >
                                &times;
                              </button>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span className="ag-card-total-lbl">Sub-total: </span>
                              <span className="ag-card-total-val">₹{(parseFloat(item.total) || 0).toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <datalist id="common-products">
                      {COMMON_PRODUCTS.map((prod, pidx) => (
                        <option key={pidx} value={prod} />
                      ))}
                    </datalist>
                  </div>

                  <div class="form-group-full">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>Delivery Site Address</label>
                    <input type="text" class="form-input" value={editAddress} onChange={e => setEditAddress(e.target.value)} />
                  </div>

                  {/* Dynamic Billing Summary & Payment Workspace */}
                  <div class="billing-summary-block" style={{ gridColumn: '1 / -1', marginTop: '20px' }}>
                    <h4 style={{ fontSize: '11px', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.5px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      💳 Billing Workspace & Financials
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                      {/* Subtotal / Total Purchased */}
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>
                          Total Purchased Amount (₹)
                        </label>
                        <input
                          type="number"
                          className="form-input"
                          value={editSubtotal}
                          readOnly
                          style={{ background: 'rgba(16, 23, 38, 0.4)', cursor: 'not-allowed', opacity: 0.8 }}
                        />
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '3px' }}>
                          Auto-calculated from material modules
                        </span>
                      </div>

                      {/* GST select */}
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>
                          GST / Tax %
                        </label>
                        <select
                          className="form-input"
                          value={editTaxPercent}
                          onChange={e => setEditTaxPercent(e.target.value)}
                        >
                          <option value="0">0% (Nil)</option>
                          <option value="5">5% GST</option>
                          <option value="12">12% GST</option>
                          <option value="18">18% GST (Std)</option>
                          <option value="28">28% GST</option>
                        </select>
                      </div>

                      {/* Discount input */}
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>
                          Discount / Amount Reduced (₹)
                        </label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="Flat Discount"
                          value={editDiscount}
                          onChange={e => setEditDiscount(e.target.value)}
                        />
                      </div>

                      {/* FINAL BILL AMOUNT banner */}
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Final Bill Amount (Auto)
                        </label>
                        <div className="ag-billing-banner-orange">
                          <span className="ag-billing-banner-orange-text">₹{editGrandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                          <span className="ag-billing-banner-orange-subtext">
                            (₹{editSubtotal.toLocaleString('en-IN')} subtotal - ₹{editDiscountVal.toLocaleString('en-IN')} discount + ₹{editTaxAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })} GST)
                          </span>
                        </div>
                      </div>

                      {/* PENDING BALANCE banner */}
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Pending Balance Outstanding (Auto)
                        </label>
                        <div className="ag-billing-banner-red">
                          <span className="ag-billing-banner-red-text">⚠️ ₹{Math.max(0, editGrandTotal - (customer.advancePaid || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500', marginLeft: '10px' }}>
                            (Outstanding balance due)
                          </span>
                        </div>
                      </div>

                      {/* PAYMENT SUMMARY table card */}
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div className="ag-payment-summary-card">
                          <div className="ag-payment-summary-title">Payment Summary Workspace</div>
                          
                          <div className="ag-payment-summary-row">
                            <span className="ag-payment-summary-row-lbl">Total Purchased:</span>
                            <span className="ag-payment-summary-row-val">₹{editSubtotal.toLocaleString('en-IN')}</span>
                          </div>

                          <div className="ag-payment-summary-row">
                            <span className="ag-payment-summary-row-lbl" style={{ color: 'var(--status-red)' }}>Discount Given:</span>
                            <span className="ag-payment-summary-row-val" style={{ color: 'var(--status-red)' }}>-₹{editDiscountVal.toLocaleString('en-IN')}</span>
                          </div>

                          <div className="ag-payment-summary-row">
                            <span className="ag-payment-summary-row-lbl">GST Amount ({editTaxPercent}%):</span>
                            <span className="ag-payment-summary-row-val">+₹{editTaxAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                          </div>

                          <div className="ag-payment-summary-row">
                            <span className="ag-payment-summary-row-lbl">Final Bill:</span>
                            <span className="ag-payment-summary-row-val">₹{editGrandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                          </div>

                          <div className="ag-payment-summary-row">
                            <span className="ag-payment-summary-row-lbl" style={{ color: 'var(--status-green)' }}>Advance / Paid Collected:</span>
                            <span className="ag-payment-summary-row-val" style={{ color: 'var(--status-green)' }}>₹{(customer.advancePaid || 0).toLocaleString('en-IN')}</span>
                          </div>

                          <div className="ag-payment-summary-row total">
                            <span className="ag-payment-summary-row-lbl">Balance Outstanding:</span>
                            <span className="ag-payment-summary-row-val">₹{Math.max(0, editGrandTotal - (customer.advancePaid || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>Project Type</label>
                    <select class="form-input" value={editProjType} onChange={e => setEditProjType(e.target.value)}>
                      <option value="Hardware">Hardware Supplies</option>
                      <option value="Plywood">Plywood & Boarding</option>
                      <option value="Laminate">Laminates & Veneers</option>
                      <option value="Interior design">Interior Fit-out</option>
                      <option value="Contractor Work">Contractor Billing</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>Assigned staff</label>
                    <select class="form-input" value={editStaff} onChange={e => setEditStaff(e.target.value)}>
                      {staffList.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onClick={() => setIsEditInfoOpen(false)}>Cancel</button>
                <button type="submit" class="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UPDATE PAYMENTS TRANSACTION */}
      {isUpdatePayOpen && (
        <div class="modal-overlay">
          <div class="modal-content">
            <div class="modal-header">
              <h3>Record Payment Installment</h3>
              <button class="modal-close-btn" onClick={() => setIsUpdatePayOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleUpdatePaymentSubmit}>
              <div class="modal-body">
                <div class="form-grid">
                  <p style={{ fontSize: '13.5px' }}>
                    Record collection for: <strong>{customer.customerName}</strong>
                  </p>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>Collection Amount (₹) *</label>
                    <input
                      type="number"
                      class="form-input"
                      placeholder="e.g. 5000"
                      value={payAmount}
                      onChange={e => setPayAmount(e.target.value)}
                      max={customer.pendingAmount}
                      min="1"
                      required
                    />
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                      Max collectible balance remaining: <strong>₹{customer.pendingAmount}</strong>
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>Payment Mode</label>
                    <select class="form-input" value={payMode} onChange={e => setPayMode(e.target.value)}>
                      <option value="Cash">💵 Cash</option>
                      <option value="GPay">📱 GPay / UPI</option>
                      <option value="Bank Transfer">🏦 Bank NEFT/RTGS</option>
                      <option value="Cheque">✍️ Cheque</option>
                    </select>
                  </div>

                  <div class="form-group-full">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>Payment Notes</label>
                    <input
                      type="text"
                      class="form-input"
                      placeholder="e.g. Received via GPay from contractor Suresh..."
                      value={payNote}
                      onChange={e => setPayNote(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onClick={() => setIsUpdatePayOpen(false)}>Cancel</button>
                <button type="submit" class="btn btn-primary">Record Installment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: MOVE PIPELINE STAGE */}
      {isMoveStageOpen && (
        <div class="modal-overlay">
          <div class="modal-content">
            <div class="modal-header">
              <h3>Move Pipeline Stage</h3>
              <button class="modal-close-btn" onClick={() => setIsMoveStageOpen(false)}>&times;</button>
            </div>
            <div class="modal-body">
              <p style={{ fontSize: '13.5px', marginBottom: '14px' }}>
                Choose the destination pipeline stage:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stages.map(stg => (
                  <button
                    key={stg.stageName}
                    class="btn btn-secondary"
                    style={{
                      justifyContent: 'flex-start',
                      borderColor: customer.stage === stg.stageName ? 'var(--accent)' : 'var(--border-color)',
                      backgroundColor: customer.stage === stg.stageName ? 'var(--accent-glow)' : 'var(--bg-card)'
                    }}
                    onClick={() => handleStageChange(stg.stageName)}
                  >
                    <span class="stage-color-dot" style={{ backgroundColor: stg.stageColor, marginRight: '8px' }}></span>
                    {stg.stageName}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CREATE SCHEDULED ALERT */}
      {isAddReminderOpen && (
        <div class="modal-overlay">
          <div class="modal-content">
            <div class="modal-header">
              <h3>Schedule Follow-Up Reminder</h3>
              <button class="modal-close-btn" onClick={() => setIsAddReminderOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateReminderSubmit}>
              <div class="modal-body">
                <div class="form-grid">
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>Reminder Action Type</label>
                    <select class="form-input" value={remType} onChange={e => setRemType(e.target.value)}>
                      <option value="Follow-up Call">📞 Follow-up Call</option>
                      <option value="Payment Due">💰 Payment Due Reminder</option>
                      <option value="Delivery">🚚 Materials Delivery</option>
                      <option value="Quotation Pending">📄 Quotation Pending Check</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>Reminder Date & Time</label>
                    <input
                      type="datetime-local"
                      class="form-input"
                      value={remDate}
                      onChange={e => setRemDate(e.target.value)}
                      required
                    />
                  </div>

                  <div class="form-group-full">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>Additional Notes</label>
                    <input
                      type="text"
                      class="form-input"
                      placeholder="e.g. Call Suresh at 11 AM..."
                      value={remNotes}
                      onChange={e => setRemNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onClick={() => setIsAddReminderOpen(false)}>Cancel</button>
                <button type="submit" class="btn btn-primary">Schedule Reminder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: SNOOZE FOLLOWUP DATE */}
      {isSnoozeOpen && activeReminderId && (
        <div class="modal-overlay">
          <div class="modal-content">
            <div class="modal-header">
              <h3>Snooze Follow-Up Reminder</h3>
              <button class="modal-close-btn" onClick={() => { setIsSnoozeOpen(false); setActiveReminderId(null); }}>&times;</button>
            </div>
            <form onSubmit={handleSnoozeConfirm}>
              <div class="modal-body">
                <div class="form-grid">
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>Snooze to Date *</label>
                    <input
                      type="date"
                      class="form-input"
                      value={snoozeDate}
                      onChange={e => setSnoozeDate(e.target.value)}
                      min={todayStr}
                      required
                    />
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onClick={() => { setIsSnoozeOpen(false); setActiveReminderId(null); }}>Cancel</button>
                <button type="submit" class="btn btn-primary">Snooze Alert</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
