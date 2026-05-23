import React, { useState } from 'react';
import { useCRMDatabase } from '../context/CRMDatabaseContext';

export default function Reminders({ onViewCustomer }) {
  const {
    customers,
    reminders,
    createReminder,
    snoozeReminder,
    completeReminder
  } = useCRMDatabase();

  const todayStr = new Date().toISOString().split('T')[0];

  // --- STATE STORES ---
  const [isSnoozeOpen, setIsSnoozeOpen] = useState(false);
  const [activeRemId, setActiveRemId] = useState(null);
  const [snoozeDate, setSnoozeDate] = useState('');

  // Add Reminder state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCustId, setNewCustId] = useState('');
  const [newType, setNewType] = useState('Follow-up Call');
  const [newDate, setNewDate] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // --- DATA FILTERING ---
  const activeReminders = (reminders || []).filter(r => r && (r.status === 'Pending' || r.status === 'Snoozed'));
  
  const todayReminders = activeReminders.filter(r => r && (r.reminderDate || '').split('T')[0] === todayStr);
  const upcomingReminders = activeReminders
    .filter(r => r && (r.reminderDate || '').split('T')[0] > todayStr)
    .sort((a, b) => new Date(a?.reminderDate || 0) - new Date(b?.reminderDate || 0));
  
  const overdueReminders = activeReminders
    .filter(r => r && (r.reminderDate || '').split('T')[0] < todayStr)
    .sort((a, b) => new Date(a?.reminderDate || 0) - new Date(b?.reminderDate || 0));
  
  // Merge Overdue and Today into high priority active checklist
  const todayAndOverdueList = [...overdueReminders, ...todayReminders];

  const completedCount = (reminders || []).filter(r => r && r.status === 'Completed').length;

  // --- HANDLERS ---
  const handleSnoozeClick = (remId) => {
    setActiveRemId(remId);
    setSnoozeDate(todayStr);
    setIsSnoozeOpen(true);
  };

  const handleSnoozeConfirm = (e) => {
    e.preventDefault();
    if (!snoozeDate || !activeRemId) return;
    snoozeReminder(activeRemId, snoozeDate);
    setSnoozeDate('');
    setActiveRemId(null);
    setIsSnoozeOpen(false);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newCustId || !newDate) return;
    createReminder(newCustId, newType, newDate, newNotes);
    
    // Reset Form
    setNewCustId('');
    setNewType('Follow-up Call');
    setNewDate('');
    setNewNotes('');
    setIsAddOpen(false);
  };

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', paddingBottom: '60px', fontFamily: 'var(--font-body)' }}>
      
      {/* 1. Simple Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', marginTop: '10px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--text-white)', letterSpacing: '-0.5px' }}>
            Reminders
          </h2>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '400' }}>
            Track customer follow-ups
          </p>
        </div>
        <button
          onClick={() => {
            if (customers.length > 0) setNewCustId(customers[0].id);
            setIsAddOpen(true);
          }}
          className="btn btn-primary"
          style={{
            background: 'linear-gradient(135deg, var(--accent) 0%, #EA580C 100%)',
            border: 'none',
            boxShadow: '0 4px 14px rgba(249, 115, 22, 0.25)',
            fontWeight: '600',
            fontSize: '12.5px',
            padding: '7px 14px',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          + Add Reminder
        </button>
      </div>

      {/* 2. Quick Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '32px' }}>
        {/* Today's Count */}
        <div style={{ padding: '14px 18px', background: 'rgba(21, 31, 50, 0.4)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.02)', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '9.5px', fontWeight: '700', color: 'var(--status-yellow)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Today & Overdue</span>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-white)', marginTop: '4px', fontFamily: 'var(--font-display)' }}>
            {todayAndOverdueList.length}
          </div>
        </div>
        
        {/* Upcoming Count */}
        <div style={{ padding: '14px 18px', background: 'rgba(21, 31, 50, 0.4)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.02)', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '9.5px', fontWeight: '700', color: 'var(--status-blue)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Upcoming</span>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-white)', marginTop: '4px', fontFamily: 'var(--font-display)' }}>
            {upcomingReminders.length}
          </div>
        </div>
        
        {/* Completed Count */}
        <div style={{ padding: '14px 18px', background: 'rgba(21, 31, 50, 0.4)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.02)', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '9.5px', fontWeight: '700', color: 'var(--status-green)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Completed</span>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-white)', marginTop: '4px', fontFamily: 'var(--font-display)' }}>
            {completedCount}
          </div>
        </div>
      </div>

      {/* 3. Today's Reminders Card (Active Checklist) */}
      <div style={{ marginBottom: '36px' }}>
        <h4 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
          Active Checklist
        </h4>

        {todayAndOverdueList.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              background: 'rgba(21, 31, 50, 0.2)',
              border: '1px dashed rgba(255, 255, 255, 0.04)',
              borderRadius: '14px',
              color: 'var(--text-muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span style={{ fontSize: '28px' }}>🍃</span>
            <span style={{ fontSize: '13px', fontStyle: 'italic', fontWeight: '400' }}>No follow-ups due today. You are all caught up!</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {todayAndOverdueList.map(rem => {
              const cust = (customers || []).find(c => c.id === rem.customerId) || { customerName: 'Unknown Client', phone: '' };
              const isOverdue = (rem.reminderDate || '').split('T')[0] < todayStr;
              
              return (
                <div
                  key={rem.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    background: 'rgba(21, 31, 50, 0.45)',
                    border: '1px solid rgba(255, 255, 255, 0.03)',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  className="ag-rem-item"
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, marginRight: '16px' }}>
                    {/* Minimal Circular Checkbox */}
                    <button
                      onClick={() => completeReminder(rem.id)}
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: '1.8px solid var(--border-color)',
                        background: 'transparent',
                        color: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        marginTop: '2.5px',
                        transition: 'all 0.2s ease',
                        padding: 0
                      }}
                      className="ag-checkbox-round"
                      title="Mark Complete"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--status-green)';
                        e.currentTarget.style.color = 'var(--status-green)';
                        e.currentTarget.innerText = '✓';
                        e.currentTarget.style.fontSize = '10px';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.color = 'transparent';
                        e.currentTarget.innerText = '';
                      }}
                    >
                    </button>
 
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          onClick={() => onViewCustomer(cust.id)}
                          style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-white)', cursor: 'pointer', textDecoration: 'none' }}
                          className="hover-underline-span"
                        >
                          {cust.customerName}
                        </span>
                        
                        {/* Time Badges */}
                        {isOverdue ? (
                          <span style={{ fontSize: '8px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-red)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Overdue
                          </span>
                        ) : (
                          <span style={{ fontSize: '8px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--status-yellow)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {(rem.reminderDate || '').split('T')[1]?.substring(0, 5) || '10:00 AM'}
                          </span>
                        )}

                        <span style={{ fontSize: '8.5px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '1px 5px', borderRadius: '4px' }}>
                          {rem.reminderType}
                        </span>
                      </div>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-primary)', marginTop: '4px', fontWeight: '400', lineHeight: '1.4' }}>
                        {rem.notes || 'No description provided.'}
                      </p>
                    </div>
                  </div>

                  {/* Concise actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {cust.phone && (
                      <a
                        href={`tel:${cust.phone}`}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          border: '1px solid rgba(255, 255, 255, 0.04)',
                          background: 'rgba(255, 255, 255, 0.02)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          textDecoration: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        className="ag-icon-btn-minimal"
                        title="Call Customer"
                      >
                        📞
                      </a>
                    )}
                    <button
                      onClick={() => handleSnoozeClick(rem.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        color: 'var(--text-muted)',
                        fontSize: '11px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      className="ag-text-btn-minimal"
                      title="Snooze"
                    >
                      Snooze
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Upcoming Reminders Section */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
          Upcoming Timeline
        </h4>

        {upcomingReminders.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '30px 16px',
              background: 'rgba(21, 31, 50, 0.15)',
              border: '1px dashed rgba(255, 255, 255, 0.03)',
              borderRadius: '12px',
              color: 'var(--text-muted)'
            }}
          >
            <span style={{ fontSize: '12px', fontStyle: 'italic', fontWeight: '400' }}>No future follow-ups programmed.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {upcomingReminders.map(rem => {
              const cust = (customers || []).find(c => c.id === rem.customerId) || { customerName: 'Unknown Client', phone: '' };
              return (
                <div
                  key={rem.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'rgba(21, 31, 50, 0.25)',
                    border: '1px solid rgba(255, 255, 255, 0.02)',
                    borderRadius: '10px',
                    transition: 'all 0.2s ease'
                  }}
                  className="ag-rem-item-upcoming"
                >
                  <div style={{ flex: 1, marginRight: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        onClick={() => onViewCustomer(cust.id)}
                        style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-white)', cursor: 'pointer' }}
                        className="hover-underline-span"
                      >
                        {cust.customerName}
                      </span>
                      <span style={{ fontSize: '8px', color: 'var(--accent)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3px', background: 'rgba(249, 115, 22, 0.08)', padding: '1px 5px', borderRadius: '4px' }}>
                        {rem.reminderType}
                      </span>
                    </div>
                    {rem.notes && (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginTop: '2px', fontWeight: '400' }}>
                        {rem.notes}
                      </span>
                    )}
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '500', display: 'block', marginTop: '4px' }}>
                      📅 Due: {(rem.reminderDate || '').split('T')[0] || 'No Date'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {cust.phone && (
                      <a
                        href={`tel:${cust.phone}`}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          border: '1px solid rgba(255, 255, 255, 0.03)',
                          background: 'rgba(255, 255, 255, 0.02)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          textDecoration: 'none',
                          cursor: 'pointer'
                        }}
                        className="ag-icon-btn-minimal"
                        title="Call Customer"
                      >
                        📞
                      </a>
                    )}
                    <button
                      onClick={() => handleSnoozeClick(rem.id)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '5px',
                        border: '1px solid rgba(255, 255, 255, 0.03)',
                        background: 'rgba(255, 255, 255, 0.01)',
                        color: 'var(--text-muted)',
                        fontSize: '10.5px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                      className="ag-text-btn-minimal"
                    >
                      Snooze
                    </button>
                    <button
                      onClick={() => completeReminder(rem.id)}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        border: '1px solid rgba(16, 185, 129, 0.15)',
                        background: 'rgba(16, 185, 129, 0.04)',
                        color: 'var(--status-green)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        cursor: 'pointer'
                      }}
                      className="ag-icon-btn-minimal-success"
                      title="Complete"
                    >
                      ✓
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Floating Fixed Add Button */}
      <button
        onClick={() => {
          if (customers.length > 0) setNewCustId(customers[0].id);
          setIsAddOpen(true);
        }}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          width: '46px',
          height: '46px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent) 0%, #EA580C 100%)',
          border: 'none',
          color: 'var(--text-white)',
          fontSize: '22px',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 18px rgba(249, 115, 22, 0.35), 0 0 8px rgba(249, 115, 22, 0.15)',
          zIndex: 99,
          transition: 'all 0.2s ease',
          padding: 0
        }}
        className="ag-floating-plus-btn"
        title="Schedule New Reminder"
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)';
          e.currentTarget.style.boxShadow = '0 6px 22px rgba(249, 115, 22, 0.5), 0 0 12px rgba(249, 115, 22, 0.25)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 18px rgba(249, 115, 22, 0.35), 0 0 8px rgba(249, 115, 22, 0.15)';
        }}
      >
        +
      </button>

      {/* --- ADD REMINDER OVERLAY --- */}
      {isAddOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px', width: '100%', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: 'var(--shadow-lg)' }}>
            <div className="modal-header" style={{ paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', fontFamily: 'var(--font-display)' }}>Schedule Customer Follow-up</h3>
              <button className="modal-close-btn" style={{ fontSize: '20px', color: 'var(--text-muted)' }} onClick={() => setIsAddOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 20px' }}>
                
                {/* Select Customer */}
                <div>
                  <label className="ag-form-label" style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Client / Business File *</label>
                  <select
                    className="ag-select-futuristic"
                    style={{ height: '36px', fontSize: '12.5px', borderRadius: '8px' }}
                    value={newCustId}
                    onChange={e => setNewCustId(e.target.value)}
                    required
                  >
                    {(customers || []).map(c => (
                      <option key={c?.id} value={c?.id}>
                        {c?.customerName || 'Unknown'} ({c?.phone || 'No Phone'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Follow-up Type */}
                <div>
                  <label className="ag-form-label" style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Action Category</label>
                  <select
                    className="ag-select-futuristic"
                    style={{ height: '36px', fontSize: '12.5px', borderRadius: '8px' }}
                    value={newType}
                    onChange={e => setNewType(e.target.value)}
                  >
                    <option value="Follow-up Call">Follow-up Call</option>
                    <option value="Site Visit">Site Visit & Measurement</option>
                    <option value="Payment Collection">Payment Collection</option>
                    <option value="Design Review">Design Layout Review</option>
                    <option value="Delivery Coordinate">Delivery Coordinates</option>
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="ag-form-label" style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Due Date *</label>
                  <input
                    type="date"
                    className="ag-input-futuristic"
                    style={{ height: '36px', fontSize: '12.5px', borderRadius: '8px' }}
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    min={todayStr}
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="ag-form-label" style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reminder Note</label>
                  <textarea
                    className="ag-input-futuristic"
                    style={{ fontSize: '12.5px', borderRadius: '8px', padding: '8px 12px' }}
                    placeholder="e.g. Call to finalize marine plywood count..."
                    value={newNotes}
                    onChange={e => setNewNotes(e.target.value)}
                    rows={3}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: 'none', paddingTop: '8px' }}>
                <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px' }} onClick={() => setIsAddOpen(false)}>Cancel</button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent) 0%, #EA580C 100%)',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(249, 115, 22, 0.2)',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                >
                  Schedule Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- SNOOZE CONFIRMATION OVERLAY --- */}
      {isSnoozeOpen && activeRemId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '360px', width: '100%', borderRadius: '14px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Snooze Follow-Up</h3>
              <button className="modal-close-btn" onClick={() => { setIsSnoozeOpen(false); setActiveRemId(null); }}>&times;</button>
            </div>
            <form onSubmit={handleSnoozeConfirm}>
              <div className="modal-body" style={{ padding: '14px 20px' }}>
                <div>
                  <label className="ag-form-label" style={{ fontSize: '10.5px' }}>Select Snooze Target Date *</label>
                  <input
                    type="date"
                    className="ag-input-futuristic"
                    style={{ height: '36px', fontSize: '12.5px', borderRadius: '8px' }}
                    value={snoozeDate}
                    onChange={e => setSnoozeDate(e.target.value)}
                    min={todayStr}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: 'none', paddingTop: '4px' }}>
                <button type="button" className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '11.5px', borderRadius: '6px' }} onClick={() => { setIsSnoozeOpen(false); setActiveRemId(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '11.5px', borderRadius: '6px' }}>Confirm Snooze</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
