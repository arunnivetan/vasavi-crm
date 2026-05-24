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
  const [isPDFPreviewOpen, setIsPDFPreviewOpen] = useState(false);
  
  // Lightbox Preview Image state
  const [lightboxImage, setLightboxImage] = useState(null);

  // Note form state
  const [noteInput, setNoteInput] = useState('');

  // Payment form state
  const [editTotalPurchased, setEditTotalPurchased] = useState(0);
  const [editPaymentDiscount, setEditPaymentDiscount] = useState(0);
  const [editAdvancePaid, setEditAdvancePaid] = useState(0);
  const [editDueDate, setEditDueDate] = useState('');
  const [editPaymentNotes, setEditPaymentNotes] = useState('');
  const [editPaymentMode, setEditPaymentMode] = useState('Cash');

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

    const advance = parseFloat(editAdvancePaid || 0);
    const pending = editGrandTotal - advance;
    
    let paymentStatus = 'Pending';
    if (advance > 0) {
      paymentStatus = pending <= 0 ? 'Paid' : 'Partial';
    }

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
      amount: editGrandTotal,
      advancePaid: advance,
      pendingAmount: pending,
      paymentStatus: paymentStatus
    });
    setIsEditInfoOpen(false);
  };

  // Open and pre-initialize edit payment modal
  const openPaymentModal = () => {
    const initialPurchased = customer.subtotal || customer.amount || 0;
    setEditTotalPurchased(initialPurchased);
    setEditPaymentDiscount(customer.discount || 0);
    setEditAdvancePaid(customer.advancePaid || 0);
    setEditDueDate(customer.followupDate || '');
    setEditPaymentNotes('');
    setEditPaymentMode(customerPayments[0]?.paymentMode || 'Cash');
    setIsUpdatePayOpen(true);
  };

  const handleUpdatePaymentSubmit = async (e) => {
    e.preventDefault();
    
    const purchased = parseFloat(editTotalPurchased || 0);
    const discount = parseFloat(editPaymentDiscount || 0);
    const finalBill = purchased - discount;
    const advance = parseFloat(editAdvancePaid || 0);
    const pending = finalBill - advance;
    
    let paymentStatus = 'Pending';
    if (advance > 0) {
      paymentStatus = pending <= 0 ? 'Paid' : 'Partial';
    }

    try {
      // Calculate difference in advancePaid to record payment transaction if needed
      const diff = advance - (customer.advancePaid || 0);
      if (diff > 0) {
        // Record payment installment ledger transaction for transparency
        await addPaymentTransaction(customerId, diff, editPaymentMode, editPaymentNotes || 'Installment via payment workspace edit');
      }

      // Update customer record
      await editCustomer(customerId, {
        subtotal: purchased,
        discount: discount,
        amount: finalBill,
        advancePaid: advance,
        pendingAmount: pending,
        paymentStatus: paymentStatus,
        followupDate: editDueDate
      });

      setIsUpdatePayOpen(false);
    } catch (err) {
      console.error('[CustomerDetail] Failed to save payment details:', err);
      alert('Failed to save payment: ' + (err?.message || err));
    }
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

  const billTag = (customer.tags || []).find(t => t.startsWith('BILL:'));
  const billNumber = billTag ? billTag.split(':')[1] : 'No Bill#';

  return (
    <div>
      {/* HEADER SECTION: Back buttons, metadata badges, quick contact triggers */}
      <div className="cust-detail-header" style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', marginBottom: '20px' }}>
        {/* ROW 1 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="action-btn-circle" onClick={onBack} title="Back to Dashboard">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
            <h2 className="cust-detail-name" style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>{customer.customerName}</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {customer.phone && (
              <a href={`tel:${customer.phone}`} className="action-btn-circle call success" style={{ textDecoration: 'none' }} title="Call Customer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.1-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </a>
            )}
            <div className="action-btn-circle">...</div>
          </div>
        </div>

        {/* ROW 2 */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span
            className="badge"
            style={{
              backgroundColor: `${stages.find(s => s.stageName === customer.stage)?.stageColor || '#3B82F6'}18`,
              color: stages.find(s => s.stageName === customer.stage)?.stageColor || '#3B82F6',
              border: `1px solid ${stages.find(s => s.stageName === customer.stage)?.stageColor}40`,
              fontSize: '11px',
              padding: '4px 8px',
              fontWeight: '600'
            }}
          >
            {customer.stage}
          </span>
          <span className={`badge badge-priority-${customer.priority.toLowerCase()}`} style={{ fontSize: '11px', padding: '4px 8px', fontWeight: '600' }}>
            {customer.priority}
          </span>
          <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', padding: '4px 8px', fontWeight: '600' }}>
            {billNumber}
          </span>
        </div>

        {/* ROW 3 */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setIsPDFPreviewOpen(true)} style={{ flex: 1, padding: '8px', display: 'flex', justifyContent: 'center', gap: '6px' }}>
            <span>📄</span> PDF Preview
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => handleExportProfile('print')} style={{ padding: '8px 14px' }} title="Print Profile">
            🖨️ Print
          </button>
          <button
            className="btn btn-primary btn-sm"
            style={{ padding: '8px 14px' }}
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
              setEditAdvancePaid(customer.advancePaid !== undefined ? customer.advancePaid : '');
              setIsEditInfoOpen(true);
            }}
          >
            ✎ Edit
          </button>
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
                  onClick={() => openPaymentModal()}
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
        <div class="modal-overlay drawer-overlay">
          <div class="modal-content bottom-sheet" style={{ maxWidth: '780px', width: '100%', borderRadius: '20px 20px 0 0' }}>
            <div class="bottom-sheet-handle mobile-only"></div>
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
                          className="btn btn-primary btn-sm"
                          style={{
                            border: 'none',
                            fontWeight: '700',
                            padding: '6px 14px'
                          }}
                          onClick={handleEditAddRow}
                        >
                          + Add Item Module
                        </button>
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

                      {/* Advance Paid input */}
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>
                          Advance Paid Amount (₹)
                        </label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="Advance Paid"
                          value={editAdvancePaid}
                          onChange={e => setEditAdvancePaid(e.target.value)}
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
                          <span className="ag-billing-banner-red-text">⚠️ ₹{Math.max(0, editGrandTotal - parseFloat(editAdvancePaid || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
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
        <div class="modal-overlay drawer-overlay">
          <div class="modal-content bottom-sheet" style={{ maxWidth: '780px', width: '100%', borderRadius: '20px 20px 0 0' }}>
            <div class="bottom-sheet-handle mobile-only"></div>
            <div class="modal-header">
              <h3>Edit Payment Details</h3>
              <button class="modal-close-btn" onClick={() => setIsUpdatePayOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleUpdatePaymentSubmit}>
              <div class="modal-body">
                
                {/* ERP Two Column Layout */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px', alignItems: 'start' }}>
                  
                  {/* Left Column: Input Form */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    
                    {/* Total Purchased Amount */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>
                        Total Purchased Amount (₹)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="number"
                          class="form-input"
                          style={{ flex: 1 }}
                          value={editTotalPurchased}
                          onChange={e => setEditTotalPurchased(parseFloat(e.target.value) || 0)}
                          min="0"
                          required
                        />
                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent)', minWidth: '60px' }}>
                          ₹{editTotalPurchased.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Discount / Amount Reduced */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>
                        Discount / Amount Reduced (₹)
                      </label>
                      <input
                        type="number"
                        class="form-input"
                        value={editPaymentDiscount}
                        onChange={e => setEditPaymentDiscount(parseFloat(e.target.value) || 0)}
                        min="0"
                        max={editTotalPurchased}
                        required
                      />
                    </div>

                    {/* Final Bill Amount (Auto) */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>
                        Final Bill Amount (Auto)
                      </label>
                      <div style={{
                        background: 'rgba(21, 31, 50, 0.45)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <strong style={{ fontSize: '16px', color: 'var(--text-white)' }}>
                          ₹{(editTotalPurchased - editPaymentDiscount).toLocaleString('en-IN')}
                        </strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          (₹{editTotalPurchased} − ₹{editPaymentDiscount})
                        </span>
                      </div>
                    </div>

                    {/* Advance Paid */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>
                        Advance Paid (₹)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="number"
                          class="form-input"
                          style={{ flex: 1 }}
                          value={editAdvancePaid}
                          onChange={e => setEditAdvancePaid(parseFloat(e.target.value) || 0)}
                          min="0"
                          max={editTotalPurchased - editPaymentDiscount}
                          required
                        />
                        <span style={{ fontSize: '12px', color: 'var(--status-green)', fontWeight: '600', minWidth: '80px' }}>
                          ₹{editAdvancePaid.toLocaleString('en-IN')} received
                        </span>
                      </div>
                    </div>

                    {/* Pending Balance (Auto) */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>
                        Pending Balance (Auto)
                      </label>
                      <div style={{
                        background: 'rgba(21, 31, 50, 0.45)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        padding: '10px 12px',
                        borderRadius: '8px'
                      }}>
                        <strong style={{ fontSize: '16px', color: 'var(--status-red)' }}>
                          ₹{Math.max(0, editTotalPurchased - editPaymentDiscount - editAdvancePaid).toLocaleString('en-IN')}
                        </strong>
                      </div>
                    </div>

                    {/* Payment Mode & Due Date */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>
                          Payment Mode
                        </label>
                        <select class="form-input" value={editPaymentMode} onChange={e => setEditPaymentMode(e.target.value)}>
                          <option value="Cash">💵 Cash</option>
                          <option value="GPay">📱 GPay / UPI</option>
                          <option value="Bank Transfer">🏦 Bank Transfer</option>
                          <option value="Cheque">✍️ Cheque</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>
                          Due Date
                        </label>
                        <input
                          type="date"
                          class="form-input"
                          value={editDueDate}
                          onChange={e => setEditDueDate(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Payment Notes */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>
                        Payment Notes
                      </label>
                      <textarea
                        class="form-input"
                        rows={2}
                        style={{ resize: 'vertical', minHeight: '60px' }}
                        placeholder="e.g. Discount given for bulk order. Balance after delivery..."
                        value={editPaymentNotes}
                        onChange={e => setEditPaymentNotes(e.target.value)}
                      />
                    </div>

                  </div>

                  {/* Right Column: Premium Sidebar Summary Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(21, 31, 50, 0.7) 0%, rgba(15, 23, 38, 0.9) 100%)',
                    border: '1px solid rgba(212, 166, 79, 0.15)',
                    borderRadius: '12px',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                    height: '100%'
                  }}>
                    <h4 style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '12px',
                      fontWeight: '800',
                      letterSpacing: '0.8px',
                      color: 'var(--accent)',
                      textTransform: 'uppercase',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      paddingBottom: '8px',
                      margin: 0
                    }}>
                      Payment Summary
                    </h4>

                    {/* Cost ledger item lines */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Total Purchased</span>
                        <span style={{ fontWeight: '700', color: 'var(--text-white)' }}>
                          ₹{editTotalPurchased.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Discount</span>
                        <span style={{ fontWeight: '700', color: 'var(--status-green)' }}>
                          −₹{editPaymentDiscount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '13.5px',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                        paddingTop: '10px'
                      }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Final Bill</span>
                        <span style={{ fontWeight: '800', color: 'var(--accent)' }}>
                          ₹{(editTotalPurchased - editPaymentDiscount).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Advance Paid</span>
                        <span style={{ fontWeight: '700', color: 'var(--status-green)' }}>
                          ₹{editAdvancePaid.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '14px',
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        paddingTop: '10px',
                        marginTop: '4px'
                      }}>
                        <span style={{ color: 'var(--text-white)', fontWeight: '700' }}>Balance Due</span>
                        <span style={{ fontWeight: '900', color: 'var(--status-red)' }}>
                          ₹{Math.max(0, editTotalPurchased - editPaymentDiscount - editAdvancePaid).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge inside summary */}
                    <div style={{
                      marginTop: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(16, 23, 38, 0.4)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.03)'
                    }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Payment Status:</span>
                      <span className={`badge badge-payment-${
                        editAdvancePaid === 0 ? 'pending' : (editTotalPurchased - editPaymentDiscount - editAdvancePaid <= 0 ? 'paid' : 'partial')
                      }`}>
                        {editAdvancePaid === 0 ? 'Pending' : (editTotalPurchased - editPaymentDiscount - editAdvancePaid <= 0 ? 'Paid' : 'Partial')}
                      </span>
                    </div>

                  </div>

                </div>

              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onClick={() => setIsUpdatePayOpen(false)}>Cancel</button>
                <button type="submit" class="btn btn-primary" style={{ border: 'none', color: 'var(--text-white)', padding: '8px 16px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: MOVE PIPELINE STAGE */}
      {isMoveStageOpen && (
        <div class="modal-overlay drawer-overlay">
          <div class="modal-content bottom-sheet" style={{ borderRadius: '20px 20px 0 0' }}>
            <div class="bottom-sheet-handle mobile-only"></div>
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
        <div class="modal-overlay drawer-overlay">
          <div class="modal-content bottom-sheet" style={{ borderRadius: '20px 20px 0 0' }}>
            <div class="bottom-sheet-handle mobile-only"></div>
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
        <div class="modal-overlay drawer-overlay">
          <div class="modal-content bottom-sheet" style={{ borderRadius: '20px 20px 0 0' }}>
            <div class="bottom-sheet-handle mobile-only"></div>
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

      {/* MODAL 6: PDF PREVIEW MODAL */}
      {isPDFPreviewOpen && (
        <div className="modal-overlay drawer-overlay">
          <div className="modal-content" style={{ maxWidth: '700px', borderRadius: '16px', backgroundColor: 'var(--bg-main)', overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>📄 Document Preview</h3>
              <button className="modal-close-btn" onClick={() => setIsPDFPreviewOpen(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ padding: '24px', maxHeight: '60vh', overflowY: 'auto' }}>
              {/* Preview Content */}
              <div style={{ padding: '30px', backgroundColor: '#fff', color: '#000', borderRadius: '8px', border: '1px solid #ddd' }}>
                {/* INVOICE HEADER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #dab920', paddingBottom: '20px', marginBottom: '20px' }}>
                  {/* LEFT: LOGO */}
                  <div style={{ flex: '1' }}>
                    <img src="/src/assets/svp-logo.png" alt="SVP Logo" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                  </div>
                  
                  {/* CENTER: COMPANY DETAILS */}
                  <div style={{ flex: '2', textAlign: 'center' }}>
                    <h1 style={{ margin: '0 0 5px 0', fontSize: '22px', color: '#0b0f19', fontWeight: 'bold' }}>SRI VASAVI PLYWOODS</h1>
                    <h2 style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#6c757d', fontWeight: 'bold' }}>GLASSWARES & HARDWARES</h2>
                    <p style={{ margin: '0', fontSize: '10px', color: '#6c757d' }}>M.R.V. Building, Poovalur Road, Lalgudi-621601</p>
                    <p style={{ margin: '0', fontSize: '10px', color: '#6c757d' }}>Ph: 9842438037 | GSTIN: 33APXPS6615P1ZC</p>
                  </div>
                  
                  {/* RIGHT: METADATA */}
                  <div style={{ flex: '1', textAlign: 'right' }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '11px', color: '#212b36', fontWeight: 'bold' }}>BILL NO: <span style={{ color: '#666', fontWeight: 'normal' }}>{billNumber}</span></p>
                    <p style={{ margin: '0 0 5px 0', fontSize: '11px', color: '#212b36', fontWeight: 'bold' }}>BILL DATE: <span style={{ color: '#666', fontWeight: 'normal' }}>{new Date().toLocaleDateString('en-IN')}</span></p>
                    <p style={{ margin: '0 0 5px 0', fontSize: '11px', color: '#212b36', fontWeight: 'bold' }}>CUSTOMER ID: <span style={{ color: '#666', fontWeight: 'normal' }}>CL-{customer.id ? customer.id.split('_')[1] : 'FILE'}</span></p>
                  </div>
                </div>
                
                {/* CUSTOMER DETAILS ROW */}
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 5px 0', color: '#6c757d', fontSize: '12px', fontWeight: 'bold' }}>TO:</p>
                  <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px', color: '#0b0f19' }}>{customer.customerName}</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#212b36' }}>{customer.address || 'Address not specified'}</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#212b36' }}>Ph: {customer.phone || 'N/A'}</p>
                </div>

                <div style={{ marginBottom: '30px' }}>
                  <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '8px', fontSize: '14px', color: '#333' }}>MATERIALS & SERVICES</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', color: '#64748b' }}>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Item Description</th>
                        <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Qty</th>
                        <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Rate</th>
                        <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(customer.items || []).map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}>{item.productName}</td>
                          <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>{item.qty}</td>
                          <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>₹{(parseFloat(item.rate) || 0).toLocaleString('en-IN')}</td>
                          <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #f1f5f9', fontWeight: 'bold' }}>₹{(parseFloat(item.total) || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ width: '300px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
                      <span style={{ color: '#64748b' }}>Subtotal:</span>
                      <span style={{ fontWeight: 'bold' }}>₹{(customer.subtotal || 0).toLocaleString('en-IN')}</span>
                    </div>
                    {customer.discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
                        <span style={{ color: '#64748b' }}>Discount:</span>
                        <span style={{ fontWeight: 'bold', color: '#16a34a' }}>-₹{(customer.discount || 0).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {customer.taxAmount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
                        <span style={{ color: '#64748b' }}>GST ({customer.taxPercent}%):</span>
                        <span style={{ fontWeight: 'bold' }}>+₹{(customer.taxAmount || 0).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', fontSize: '16px' }}>
                      <span style={{ fontWeight: 'bold', color: '#0f172a' }}>Final Amount:</span>
                      <span style={{ fontWeight: '900', color: '#2563eb' }}>₹{(customer.amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '13px' }}>
                      <span style={{ color: '#64748b' }}>Advance Paid:</span>
                      <span style={{ fontWeight: 'bold', color: '#16a34a' }}>₹{(customer.advancePaid || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', fontSize: '14px' }}>
                      <span style={{ fontWeight: 'bold', color: '#dc2626' }}>Balance Due:</span>
                      <span style={{ fontWeight: 'bold', color: '#dc2626' }}>₹{Math.max(0, (customer.amount || 0) - (customer.advancePaid || 0)).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={() => setIsPDFPreviewOpen(false)}>Cancel</button>
              <button className="btn btn-secondary" onClick={() => { handleExportProfile('print'); setIsPDFPreviewOpen(false); }}>🖨️ Print Document</button>
              <button className="btn btn-primary" onClick={() => { handleExportProfile('download'); setIsPDFPreviewOpen(false); }}>⬇️ Download PDF</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
