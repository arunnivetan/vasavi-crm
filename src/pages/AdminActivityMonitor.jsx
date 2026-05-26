import React, { useState } from 'react';
import { useCRMDatabase } from '../context/CRMDatabaseContext';

export default function AdminActivityMonitor() {
  const {
    crmUsers,
    crmUserActivities,
    customers
  } = useCRMDatabase();

  // --- FILTER STATES ---
  const [filterUser, setFilterUser] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterCustomer, setFilterCustomer] = useState('All');
  const [filterDate, setFilterDate] = useState('');

  // --- GET UNIQUE ACTIVITY TYPES FOR FILTER DROPDOWN ---
  const uniqueTypes = Array.from(new Set(
    (crmUserActivities || []).map(act => act?.activityType).filter(Boolean)
  )).sort();

  // --- PROCESS AND FILTER DATA ---
  const filteredActivities = (crmUserActivities || []).filter(act => {
    if (!act) return false;

    // Filter by user (using userId mapping)
    if (filterUser !== 'All' && act.userId !== filterUser) return false;

    // Filter by activity type
    if (filterType !== 'All' && act.activityType !== filterType) return false;

    // Filter by customer
    if (filterCustomer !== 'All' && act.customerId !== filterCustomer) return false;

    // Filter by date (YYYY-MM-DD match against act.createdAt split('T')[0])
    if (filterDate && act.createdAt) {
      const actDate = act.createdAt.split('T')[0];
      if (actDate !== filterDate) return false;
    }

    return true;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Count events for summary indicators
  const loginCount = (crmUserActivities || []).filter(a => a?.activityType === 'Login').length;
  const deleteCount = (crmUserActivities || []).filter(a => a?.activityType?.toLowerCase().includes('delete') || a?.activityType?.toLowerCase().includes('remove')).length;
  const paymentCount = (crmUserActivities || []).filter(a => a?.activityType === 'Payment Updated').length;
  const exportCount = (crmUserActivities || []).filter(a => a?.activityType === 'PDF Exported' || a?.activityType === 'Bill Generated').length;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px', fontFamily: 'var(--font-body)' }}>
      
      {/* 1. Page Title */}
      <div style={{ marginBottom: '24px', marginTop: '10px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--text-white)', letterSpacing: '-0.5px' }}>
          CRM Security & Activity Monitor
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
          Immutable ledger of system sessions, actions, customer updates, and report exports
        </p>
      </div>

      {/* 2. Top Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }} className="metrics-grid">
        <div style={{ padding: '14px 18px', background: 'rgba(21, 31, 50, 0.4)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.02)' }}>
          <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>🔐 Total Logins</span>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-white)', marginTop: '6px', fontFamily: 'var(--font-display)' }}>
            {loginCount}
          </div>
        </div>
        <div style={{ padding: '14px 18px', background: 'rgba(21, 31, 50, 0.4)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.02)' }}>
          <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--status-red)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>🗑️ Deletions</span>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-white)', marginTop: '6px', fontFamily: 'var(--font-display)' }}>
            {deleteCount}
          </div>
        </div>
        <div style={{ padding: '14px 18px', background: 'rgba(21, 31, 50, 0.4)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.02)' }}>
          <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--status-green)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>💳 Collections</span>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-white)', marginTop: '6px', fontFamily: 'var(--font-display)' }}>
            {paymentCount}
          </div>
        </div>
        <div style={{ padding: '14px 18px', background: 'rgba(21, 31, 50, 0.4)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.02)' }}>
          <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--status-blue)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>📄 PDFs & Bills</span>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-white)', marginTop: '6px', fontFamily: 'var(--font-display)' }}>
            {exportCount}
          </div>
        </div>
      </div>

      {/* 3. Interactive Filter Bar */}
      <div style={{ background: 'rgba(21, 31, 50, 0.45)', border: '1px solid rgba(255,255,255,0.03)', padding: '16px 20px', borderRadius: '18px', marginBottom: '24px' }}>
        <h4 style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
          Filters Audit Query
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          
          {/* User selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>Representative Staff</label>
            <select
              className="ag-select-futuristic"
              style={{ height: '36px', borderRadius: '8px', fontSize: '12.5px', background: 'rgba(11,17,32,0.4)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff' }}
              value={filterUser}
              onChange={e => setFilterUser(e.target.value)}
            >
              <option value="All">All Representatives</option>
              {(crmUsers || []).map(u => (
                <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
              ))}
            </select>
          </div>

          {/* Activity Type Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>Activity Type</label>
            <select
              className="ag-select-futuristic"
              style={{ height: '36px', borderRadius: '8px', fontSize: '12.5px', background: 'rgba(11,17,32,0.4)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff' }}
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="All">All Action Categories</option>
              {uniqueTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Customer Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>Client Workspace</label>
            <select
              className="ag-select-futuristic"
              style={{ height: '36px', borderRadius: '8px', fontSize: '12.5px', background: 'rgba(11,17,32,0.4)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff' }}
              value={filterCustomer}
              onChange={e => setFilterCustomer(e.target.value)}
            >
              <option value="All">All Clients</option>
              {(customers || []).map(c => (
                <option key={c.id} value={c.id}>{c.customerName}</option>
              ))}
            </select>
          </div>

          {/* Date Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>Date Logged</label>
            <input
              type="date"
              className="ag-input-futuristic"
              style={{ height: '36px', borderRadius: '8px', fontSize: '12.5px', background: 'rgba(11,17,32,0.4)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', padding: '0 8px' }}
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
            />
          </div>

        </div>
        
        {/* Reset Filter indicator */}
        {(filterUser !== 'All' || filterType !== 'All' || filterCustomer !== 'All' || filterDate) && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button
              onClick={() => {
                setFilterUser('All');
                setFilterType('All');
                setFilterCustomer('All');
                setFilterDate('');
              }}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              Reset Filters ✕
            </button>
          </div>
        )}
      </div>

      {/* 4. Timeline list section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h4 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Ledger Query Results ({filteredActivities.length})
          </h4>
        </div>

        {filteredActivities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', borderRadius: '18px', background: 'rgba(21, 31, 50, 0.15)', border: '1px dashed rgba(255,255,255,0.03)' }}>
            <span style={{ fontSize: '32px' }}>🔍</span>
            <span style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '8px', display: 'block' }}>
              No audit activities matching query filters.
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredActivities.map((act, index) => {
              const user = (crmUsers || []).find(u => u.id === act.userId) || { fullName: 'Representative', activityColor: '#D4A64F' };
              const cust = (customers || []).find(c => c.id === act.customerId);
              
              return (
                <div
                  key={act.id || index}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    padding: '16px 20px',
                    background: 'rgba(21, 31, 50, 0.45)',
                    border: '1px solid rgba(255, 255, 255, 0.03)',
                    borderLeft: `4px solid ${user.activityColor}`,
                    borderRadius: '16px',
                    boxShadow: 'var(--shadow-sm)',
                    position: 'relative'
                  }}
                  className="ag-rem-item animate-slide-in"
                >
                  {/* User Initial Circle */}
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      backgroundColor: user.activityColor,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '800',
                      fontSize: '12.5px',
                      boxShadow: `0 0 10px ${user.activityColor}30`,
                      flexShrink: 0,
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    {user.fullName.substring(0, 2).toUpperCase()}
                  </div>

                  {/* Audit details content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '800', fontSize: '13.5px', color: '#fff' }}>
                          {user.fullName}
                        </span>
                        
                        <span style={{ fontSize: '8.5px', fontWeight: '800', color: user.activityColor, background: `${user.activityColor}12`, border: `1px solid ${user.activityColor}33`, padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {act.activityType}
                        </span>

                        {cust && (
                          <span style={{ fontSize: '9px', color: 'var(--accent)', background: 'rgba(212,166,79,0.06)', border: '1px solid rgba(212,166,79,0.15)', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
                            📁 {cust.customerName}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(act.createdAt).toLocaleDateString('en-IN')} {new Date(act.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--text-white)', marginTop: '6px', fontWeight: '400', lineHeight: '1.4' }}>
                      {act.activityDescription}
                    </p>

                    {(act.oldValue || act.newValue) && (
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '8px', marginTop: '8px', fontSize: '11px', flexWrap: 'wrap' }}>
                        {act.oldValue && (
                          <span>
                            Previous: <span style={{ color: 'var(--status-red)', fontWeight: '600' }}>{act.oldValue}</span>
                          </span>
                        )}
                        {act.oldValue && act.newValue && <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>}
                        {act.newValue && (
                          <span>
                            New: <span style={{ color: 'var(--status-green)', fontWeight: '600' }}>{act.newValue}</span>
                          </span>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '10px', color: 'var(--text-muted)' }}>
                      <span>🖥️ Device: {act.deviceInfo || 'N/A'}</span>
                      <span>🌐 IP: {act.ipAddress || '127.0.0.1'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
