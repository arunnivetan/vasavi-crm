import React, { useState } from 'react';
import { useCRMDatabase } from '../context/CRMDatabaseContext';

export default function Reminders({ onViewCustomer }) {
  const {
    customers,
    reminders,
    crmUsers,
    createReminder,
    snoozeReminder,
    completeReminder,
    deleteReminder,
    restoreReminder
  } = useCRMDatabase();

  const todayStr = new Date().toISOString().split('T')[0];

  // --- STATE STORES ---
  const [filterTab, setFilterTab] = useState('today'); // 'today', 'upcoming', 'completed'
  const [activeMenuId, setActiveMenuId] = useState(null); // Id of reminder showing popover action menu
  
  // Snooze overlay states
  const [isSnoozeOpen, setIsSnoozeOpen] = useState(false);
  const [activeRemId, setActiveRemId] = useState(null);
  const [snoozeDate, setSnoozeDate] = useState('');

  // Add Reminder states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCustId, setNewCustId] = useState('');
  const [newType, setNewType] = useState('Follow-up Call');
  const [newDate, setNewDate] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Delete confirmation modal states
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteRemId, setDeleteRemId] = useState(null);

  // --- DATA FILTERING ---
  const allReminders = reminders || [];

  // Active (Pending / Snoozed) reminders
  const activeReminders = allReminders.filter(
    r => r && r.status !== 'Completed' && r.status !== 'completed'
  );

  const todayReminders = activeReminders.filter(
    r => r && (r.reminderDate || '').split('T')[0] === todayStr
  );
  
  const upcomingReminders = activeReminders
    .filter(r => r && (r.reminderDate || '').split('T')[0] > todayStr)
    .sort((a, b) => new Date(a?.reminderDate || 0) - new Date(b?.reminderDate || 0));
  
  const overdueReminders = activeReminders
    .filter(r => r && (r.reminderDate || '').split('T')[0] < todayStr)
    .sort((a, b) => new Date(a?.reminderDate || 0) - new Date(b?.reminderDate || 0));
  
  const todayAndOverdueList = [...overdueReminders, ...todayReminders];

  const completedList = allReminders
    .filter(r => r && (r.status === 'Completed' || r.status === 'completed'))
    .sort((a, b) => new Date(b?.updatedAt || b?.createdAt || 0) - new Date(a?.updatedAt || a?.createdAt || 0));

  // --- HANDLERS ---
  const handleCircleClick = (e, remId) => {
    e.stopPropagation();
    // Toggle popover menu
    setActiveMenuId(activeMenuId === remId ? null : remId);
  };

  const handleSnoozeClick = (remId) => {
    setActiveRemId(remId);
    setSnoozeDate(todayStr);
    setIsSnoozeOpen(true);
    setActiveMenuId(null);
  };

  const handleSnoozeConfirm = (e) => {
    e.preventDefault();
    if (!snoozeDate || !activeRemId) return;
    snoozeReminder(activeRemId, snoozeDate);
    setSnoozeDate('');
    setActiveRemId(null);
    setIsSnoozeOpen(false);
  };

  const handleDeleteClick = (remId) => {
    setDeleteRemId(remId);
    setIsDeleteConfirmOpen(true);
    setActiveMenuId(null);
  };

  const handleDeleteConfirm = () => {
    if (!deleteRemId) return;
    deleteReminder(deleteRemId);
    setDeleteRemId(null);
    setIsDeleteConfirmOpen(false);
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

  // Close menus on clicking document
  React.useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', paddingBottom: '60px', fontFamily: 'var(--font-body)' }}>
      
      {/* 1. Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', marginTop: '10px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--text-white)', letterSpacing: '-0.5px' }}>
            Follow-Up Reminders
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Schedule client calls and pipeline notifications
          </p>
        </div>
        <button
          onClick={() => {
            if (customers.length > 0) setNewCustId(customers[0].id);
            setIsAddOpen(true);
          }}
          className="btn btn-primary"
          style={{
            border: 'none',
            fontWeight: '700',
            fontSize: '12.5px',
            padding: '8px 16px',
            borderRadius: '10px'
          }}
        >
          + Add Reminder
        </button>
      </div>

      {/* 2. Interactive Filter Tabs Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '32px' }}>
        {/* Card 1: Today & Overdue */}
        <div 
          onClick={() => setFilterTab('today')}
          style={{ 
            padding: '14px 18px', 
            background: filterTab === 'today' ? 'rgba(212, 166, 79, 0.08)' : 'rgba(21, 31, 50, 0.4)', 
            borderRadius: '16px', 
            border: filterTab === 'today' ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.02)', 
            boxShadow: filterTab === 'today' ? '0 0 15px rgba(212, 166, 79, 0.15)' : 'var(--shadow-sm)',
            cursor: 'pointer',
            transition: 'all 0.25s ease'
          }}
          className="metric-card-interactive"
        >
          <span style={{ fontSize: '10px', fontWeight: '700', color: filterTab === 'today' ? 'var(--accent)' : 'var(--status-yellow)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Today & Overdue</span>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-white)', marginTop: '6px', fontFamily: 'var(--font-display)' }}>
            {todayAndOverdueList.length}
          </div>
        </div>
        
        {/* Card 2: Upcoming */}
        <div 
          onClick={() => setFilterTab('upcoming')}
          style={{ 
            padding: '14px 18px', 
            background: filterTab === 'upcoming' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(21, 31, 50, 0.4)', 
            borderRadius: '16px', 
            border: filterTab === 'upcoming' ? '1px solid var(--status-blue)' : '1px solid rgba(255, 255, 255, 0.02)', 
            boxShadow: filterTab === 'upcoming' ? '0 0 15px rgba(59, 130, 246, 0.15)' : 'var(--shadow-sm)',
            cursor: 'pointer',
            transition: 'all 0.25s ease'
          }}
          className="metric-card-interactive"
        >
          <span style={{ fontSize: '10px', fontWeight: '700', color: filterTab === 'upcoming' ? 'var(--status-blue)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Upcoming Timeline</span>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-white)', marginTop: '6px', fontFamily: 'var(--font-display)' }}>
            {upcomingReminders.length}
          </div>
        </div>
        
        {/* Card 3: Completed */}
        <div 
          onClick={() => setFilterTab('completed')}
          style={{ 
            padding: '14px 18px', 
            background: filterTab === 'completed' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(21, 31, 50, 0.4)', 
            borderRadius: '16px', 
            border: filterTab === 'completed' ? '1px solid var(--status-green)' : '1px solid rgba(255, 255, 255, 0.02)', 
            boxShadow: filterTab === 'completed' ? '0 0 15px rgba(16, 185, 129, 0.15)' : 'var(--shadow-sm)',
            cursor: 'pointer',
            transition: 'all 0.25s ease'
          }}
          className="metric-card-interactive"
        >
          <span style={{ fontSize: '10px', fontWeight: '700', color: filterTab === 'completed' ? 'var(--status-green)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Completed Archive</span>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-white)', marginTop: '6px', fontFamily: 'var(--font-display)' }}>
            {completedList.length}
          </div>
        </div>
      </div>

      {/* 3. Tab Checklist Area */}
      <div>
        <h4 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
          {filterTab === 'today' ? 'Today & Overdue Reminders' : filterTab === 'upcoming' ? 'Future Reminders Timeline' : 'Completed Reminders Archive'}
        </h4>

        {/* Tab 1: Today & Overdue List */}
        {filterTab === 'today' && (
          todayAndOverdueList.length === 0 ? (
            <div className="no-cards-placeholder" style={{ padding: '60px 20px', borderRadius: '16px', background: 'rgba(21, 31, 50, 0.15)', border: '1px dashed rgba(255,255,255,0.03)' }}>
              <span style={{ fontSize: '32px' }}>🍃</span>
              <span style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '8px' }}>No pending checklist due today. You are all caught up!</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {todayAndOverdueList.map(rem => {
                const cust = (customers || []).find(c => c.id === rem.customerId) || { customerName: 'Unknown Client', phone: '', customerNo: 'N/A' };
                const isOverdue = (rem.reminderDate || '').split('T')[0] < todayStr;
                
                return (
                  <div
                    key={rem.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      background: 'rgba(21, 31, 50, 0.45)',
                      border: '1px solid rgba(255, 255, 255, 0.03)',
                      borderRadius: '14px',
                      boxShadow: 'var(--shadow-sm)',
                      position: 'relative'
                    }}
                    className="ag-rem-item animate-slide-in"
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, marginRight: '16px' }}>
                      {/* Checkbox Trigger Popover Menu */}
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={(e) => handleCircleClick(e, rem.id)}
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            border: '2px solid var(--border-color)',
                            background: activeMenuId === rem.id ? 'rgba(212, 166, 79, 0.2)' : 'transparent',
                            color: 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0
                          }}
                          className="ag-checkbox-round"
                          title="Click to Choose Action"
                        >
                          ●
                        </button>
                        
                        {activeMenuId === rem.id && (
                          <div className="rem-floating-menu" onClick={e => e.stopPropagation()}>
                            <button className="rem-floating-item complete" onClick={() => completeReminder(rem.id)}>
                              <span>✅</span> Mark Complete
                            </button>
                            <button className="rem-floating-item snooze" onClick={() => handleSnoozeClick(rem.id)}>
                              <span>⏰</span> Snooze Reminder
                            </button>
                            <button className="rem-floating-item delete" onClick={() => handleDeleteClick(rem.id)}>
                              <span>🗑️</span> Delete Reminder
                            </button>
                          </div>
                        )}
                      </div>
   
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span
                            onClick={() => onViewCustomer(cust.id)}
                            style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-white)', cursor: 'pointer' }}
                            className="hover-underline-span"
                          >
                            {cust.customerName}
                          </span>
                          
                          {/* Time Badges */}
                          {isOverdue ? (
                            <span style={{ fontSize: '8px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-red)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Overdue
                            </span>
                          ) : (
                            <span style={{ fontSize: '8px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--status-yellow)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Today
                            </span>
                          )}

                          <span style={{ fontSize: '8.5px', color: 'var(--accent)', background: 'rgba(212,166,79,0.06)', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                            {rem.reminderType}
                          </span>
                        </div>
                        
                        <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '4px', fontWeight: '400', lineHeight: '1.4' }}>
                          {rem.notes || 'No description notes provided.'}
                        </p>
                        
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                          Client Code: <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>{cust.customerNo || 'N/A'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Quick Call */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {cust.phone && (
                        <a
                          href={`tel:${cust.phone}`}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: '1px solid rgba(255, 255, 255, 0.04)',
                            background: 'rgba(255, 255, 255, 0.02)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            textDecoration: 'none'
                          }}
                          className="ag-icon-btn-minimal"
                          title="Call Customer"
                        >
                          📞
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Tab 2: Upcoming Reminders Timeline */}
        {filterTab === 'upcoming' && (
          upcomingReminders.length === 0 ? (
            <div className="no-cards-placeholder" style={{ padding: '60px 20px', borderRadius: '16px', background: 'rgba(21, 31, 50, 0.15)', border: '1px dashed rgba(255,255,255,0.03)' }}>
              <span style={{ fontSize: '32px' }}>📅</span>
              <span style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '8px' }}>No upcoming timeline reminders programmed.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {upcomingReminders.map(rem => {
                const cust = (customers || []).find(c => c.id === rem.customerId) || { customerName: 'Unknown Client', phone: '', customerNo: 'N/A' };
                return (
                  <div
                    key={rem.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      background: 'rgba(21, 31, 50, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.02)',
                      borderRadius: '14px',
                      position: 'relative'
                    }}
                    className="ag-rem-item animate-slide-in"
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, marginRight: '16px' }}>
                      {/* Circle Selector */}
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={(e) => handleCircleClick(e, rem.id)}
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            border: '2px solid var(--border-color)',
                            background: activeMenuId === rem.id ? 'rgba(212, 166, 79, 0.2)' : 'transparent',
                            color: 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0
                          }}
                          className="ag-checkbox-round"
                        >
                          ●
                        </button>
                        
                        {activeMenuId === rem.id && (
                          <div className="rem-floating-menu" onClick={e => e.stopPropagation()}>
                            <button className="rem-floating-item complete" onClick={() => completeReminder(rem.id)}>
                              <span>✅</span> Mark Complete
                            </button>
                            <button className="rem-floating-item snooze" onClick={() => handleSnoozeClick(rem.id)}>
                              <span>⏰</span> Snooze Reminder
                            </button>
                            <button className="rem-floating-item delete" onClick={() => handleDeleteClick(rem.id)}>
                              <span>🗑️</span> Delete Reminder
                            </button>
                          </div>
                        )}
                      </div>
   
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span
                            onClick={() => onViewCustomer(cust.id)}
                            style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-white)', cursor: 'pointer' }}
                            className="hover-underline-span"
                          >
                            {cust.customerName}
                          </span>
                          
                          <span style={{ fontSize: '8px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--status-blue)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Future
                          </span>

                          <span style={{ fontSize: '8.5px', color: 'var(--accent)', background: 'rgba(212,166,79,0.06)', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                            {rem.reminderType}
                          </span>
                        </div>
                        
                        <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '4px', fontWeight: '400', lineHeight: '1.4' }}>
                          {rem.notes || 'No description notes.'}
                        </p>
                        
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                          📅 Scheduled Target: <span style={{ color: 'var(--status-blue)', fontWeight: '700' }}>{(rem.reminderDate || '').split('T')[0]}</span>
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {cust.phone && (
                        <a
                          href={`tel:${cust.phone}`}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: '1px solid rgba(255, 255, 255, 0.04)',
                            background: 'rgba(255, 255, 255, 0.02)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            textDecoration: 'none'
                          }}
                          className="ag-icon-btn-minimal"
                        >
                          📞
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Tab 3: Completed Reminders Archive */}
        {filterTab === 'completed' && (
          completedList.length === 0 ? (
            <div className="no-cards-placeholder" style={{ padding: '60px 20px', borderRadius: '16px', background: 'rgba(21, 31, 50, 0.15)', border: '1px dashed rgba(255,255,255,0.03)' }}>
              <span style={{ fontSize: '32px' }}>✓</span>
              <span style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '8px' }}>No completed reminders in archives.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {completedList.map(rem => {
                const cust = (customers || []).find(c => c.id === rem.customerId) || { customerName: 'Unknown Client', phone: '', customerNo: 'N/A', assignedStaff: 'Staff' };
                const completedTime = rem.updatedAt || rem.createdAt || new Date().toISOString();
                
                return (
                  <div
                    key={rem.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      background: 'rgba(16, 185, 129, 0.03)',
                      border: '1px solid rgba(16, 185, 129, 0.1)',
                      borderRadius: '14px',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                    className="ag-rem-item animate-slide-in"
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, marginRight: '16px' }}>
                      {/* Check badge icon */}
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: '2px solid var(--status-green)',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: 'var(--status-green)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: '800',
                        flexShrink: 0
                      }}>
                        ✓
                      </div>
   
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span
                            onClick={() => onViewCustomer(cust.id)}
                            style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-white)', cursor: 'pointer' }}
                            className="hover-underline-span"
                          >
                            {cust.customerName}
                          </span>
                          
                          <span style={{ fontSize: '8px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--status-green)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Completed
                          </span>

                          <span style={{ fontSize: '8.5px', color: 'var(--accent)', background: 'rgba(212,166,79,0.06)', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                            {rem.reminderType}
                          </span>
                        </div>
                        
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '400', lineHeight: '1.4', textDecoration: 'line-through' }}>
                          {rem.notes || 'No description notes.'}
                        </p>
                        
                        <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          <span>
                            👤 Executive: <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>{cust.assignedStaff}</span>
                          </span>
                          <span>
                            ⏰ Completed: <span style={{ color: 'var(--status-green)', fontWeight: '600' }}>{new Date(completedTime).toLocaleDateString('en-IN')} {new Date(completedTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Restore & Delete Permanently */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        onClick={() => restoreReminder(rem.id)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px', fontSize: '10.5px', border: '1px solid rgba(255,255,255,0.06)' }}
                        title="Move back to Pending checklist"
                      >
                        Restore ↩️
                      </button>
                      <button
                        onClick={() => handleDeleteClick(rem.id)}
                        className="btn btn-danger btn-sm"
                        style={{ padding: '4px 8px', fontSize: '10.5px' }}
                        title="Delete Permanently"
                      >
                        Delete 🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* 4. Floating Fixed Add Button */}
      <button
        onClick={() => {
          if (customers.length > 0) setNewCustId(customers[0].id);
          setIsAddOpen(true);
        }}
        style={{
          position: 'fixed',
          bottom: '100px', // Raised slightly above bottom nav
          right: '30px',
          width: '46px',
          height: '46px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
          border: 'none',
          color: 'var(--text-white)',
          fontSize: '22px',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 18px rgba(212, 166, 79, 0.35), 0 0 8px rgba(212, 166, 79, 0.15)',
          zIndex: 99,
          transition: 'all 0.2s ease',
          padding: 0
        }}
        className="ag-floating-plus-btn"
        title="Schedule New Reminder"
      >
        +
      </button>

      {/* --- ADD REMINDER OVERLAY --- */}
      {isAddOpen && (
        <div className="modal-overlay drawer-overlay">
          <div className="modal-content bottom-sheet" style={{ maxWidth: '440px', width: '100%', borderRadius: '20px 20px 0 0', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: 'var(--shadow-lg)' }}>
            <div class="bottom-sheet-handle mobile-only"></div>
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
                    border: 'none',
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
        <div className="modal-overlay drawer-overlay">
          <div className="modal-content bottom-sheet" style={{ maxWidth: '360px', width: '100%', borderRadius: '20px 20px 0 0' }}>
            <div class="bottom-sheet-handle mobile-only"></div>
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

      {/* --- DELETE CONFIRMATION OVERLAY --- */}
      {isDeleteConfirmOpen && deleteRemId && (
        <div className="modal-overlay drawer-overlay" style={{ zIndex: 10000 }}>
          <div 
            className="modal-content" 
            style={{ 
              maxWidth: '360px', 
              width: '100%', 
              borderRadius: '20px', 
              border: '1px solid rgba(239, 68, 68, 0.25)', 
              boxShadow: '0 10px 30px rgba(239, 68, 68, 0.1)',
              background: '#0F1624',
              padding: '24px',
              textAlign: 'center',
              animation: 'popoverScale 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>Delete Reminder permanently?</h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.4' }}>
              This follow-up checklist card will be permanently deleted from Supabase forever.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '12.5px' }}
                onClick={() => { setIsDeleteConfirmOpen(false); setDeleteRemId(null); }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                style={{ 
                  padding: '8px 18px', 
                  borderRadius: '10px', 
                  fontSize: '12.5px', 
                  fontWeight: '700',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.35)',
                  animation: 'pulseGlow 1.5s infinite'
                }}
                onClick={handleDeleteConfirm}
              >
                Delete 🗑️
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
