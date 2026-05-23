import React, { useState } from 'react';
import { useCRMDatabase } from '../context/CRMDatabaseContext';

export default function Pipeline({ onViewCustomer }) {
  const {
    customers,
    stages,
    staffList,
    activeStaff,
    updateCustomerStage,
    addStage,
    renameStage,
    deleteStage,
    reorderStages
  } = useCRMDatabase();

  const todayStr = new Date().toISOString().split('T')[0];

  // --- TRANSITION STATES ---
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [selectedCustId, setSelectedCustId] = useState(null);
  const [targetStageName, setTargetStageName] = useState('');
  const [stageMoveStaff, setStageMoveStaff] = useState(activeStaff);

  // --- STAGES CONFIG STATES ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingStage, setEditingStage] = useState(null); // Stage being renamed
  const [newStageName, setNewStageName] = useState('');
  
  // Create stage states
  const [addStageName, setAddStageName] = useState('');
  const [addStageColor, setAddStageColor] = useState('#F97316');

  // --- PIEPLINE INTERACTIONS ---
  const openMoveModal = (customerId, currentStage) => {
    setSelectedCustId(customerId);
    setTargetStageName(currentStage);
    setStageMoveStaff(activeStaff);
    setIsMoveModalOpen(true);
  };

  const handleStageMoveConfirm = (e) => {
    e.preventDefault();
    if (!selectedCustId || !targetStageName) return;
    updateCustomerStage(selectedCustId, targetStageName, stageMoveStaff);
    setIsMoveModalOpen(false);
    setSelectedCustId(null);
  };

  const handleAddStageSubmit = (e) => {
    e.preventDefault();
    if (!addStageName.trim()) return;
    const success = addStage(addStageName.trim(), addStageColor);
    if (success) {
      setAddStageName('');
      setAddStageColor('#F97316');
    } else {
      alert('A stage with this name already exists.');
    }
  };

  const handleRenameStageSubmit = (e) => {
    e.preventDefault();
    if (!newStageName.trim() || !editingStage) return;
    renameStage(editingStage, newStageName.trim());
    setNewStageName('');
    setEditingStage(null);
  };

  // Reorder stages: move index up or down
  const handleMoveStageOrder = (index, direction) => {
    const newStages = [...stages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newStages.length) return;

    // Swap elements
    const temp = newStages[index];
    newStages[index] = newStages[targetIndex];
    newStages[targetIndex] = temp;

    reorderStages(newStages);
  };

  return (
    <div>
      {/* Header section */}
      <div class="page-header">
        <div class="page-title-group">
          <h2>Sales Pipeline</h2>
          <p>{customers.length} Active Deals across {stages.length} Sales Stages</p>
        </div>
        <div>
          <button class="btn btn-secondary" onClick={() => setIsSettingsOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Customize Pipeline Stages
          </button>
        </div>
      </div>

      {/* HORIZONTAL SCROLL KANBAN PIPELINE */}
      <div class="pipeline-scroll-container">
        {stages
          .sort((a, b) => a.stageOrder - b.stageOrder)
          .map(stg => {
            const stageCustomers = customers.filter(c => c.stage === stg.stageName);
            
            return (
              <div class="pipeline-column" key={stg.stageName}>
                {/* Column header */}
                <div class="pipeline-column-header">
                  <div class="pipeline-stage-info">
                    <span class="stage-color-dot" style={{ backgroundColor: stg.stageColor }}></span>
                    <span class="pipeline-stage-name">{stg.stageName}</span>
                  </div>
                  <span class="pipeline-card-count">{stageCustomers.length}</span>
                </div>

                {/* Cards List wrapper */}
                <div class="pipeline-cards-wrapper">
                  {stageCustomers.length === 0 ? (
                    <div class="no-cards-placeholder">
                      No deals in this stage
                    </div>
                  ) : (
                    stageCustomers.map(c => (
                      <div class="kanban-card" key={c.id}>
                        {/* Name and Priority */}
                        <div class="kanban-card-title-row">
                          <span
                            class="kanban-card-name"
                            onClick={() => onViewCustomer(c.id)}
                            style={{ cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            {c.customerName}
                          </span>
                          <span class={`badge badge-priority-${c.priority.toLowerCase()}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                            {c.priority}
                          </span>
                        </div>

                        {/* Phone */}
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          📞 {c.phone || 'No phone'}
                        </div>

                        {/* Requirements snippet */}
                        <div class="kanban-card-req">
                          {c.requirement || 'No requirements specified.'}
                        </div>

                        {/* Representative staff / Followup */}
                        <div class="kanban-card-meta">
                          <span class="kanban-card-staff">
                            👤 {c.assignedStaff || 'Unassigned'}
                          </span>
                          {c.followupDate && (
                            <span class={`kanban-card-date ${c.followupDate < todayStr ? 'overdue' : ''}`}>
                              📅 {c.followupDate}
                            </span>
                          )}
                        </div>

                        {/* Footer billing & Quick move button */}
                        <div class="kanban-card-footer">
                          <div>
                            <span class="kanban-card-amount">₹{c.amount.toLocaleString('en-IN')}</span>
                            <div style={{ fontSize: '9.5px', marginTop: '1px' }}>
                              <span class={`badge-payment-${c.paymentStatus.toLowerCase()}`} style={{ padding: '0px 4px', borderRadius: '3px', fontSize: '9px', fontWeight: 'bold' }}>
                                {c.paymentStatus}
                              </span>
                            </div>
                          </div>

                          <button
                            class="kanban-card-move-btn"
                            onClick={() => openMoveModal(c.id, c.stage)}
                          >
                            Move Stage &rsaquo;
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* --- PIPELINE POPUPS & MODALS --- */}

      {/* MODAL 1: MOVE CARD STAGE */}
      {isMoveModalOpen && selectedCustId && (
        <div class="modal-overlay">
          <div class="modal-content">
            <div class="modal-header">
              <h3>Move Deal Pipeline Stage</h3>
              <button class="modal-close-btn" onClick={() => { setIsMoveModalOpen(false); setSelectedCustId(null); }}>&times;</button>
            </div>
            <form onSubmit={handleStageMoveConfirm}>
              <div class="modal-body">
                <div class="form-grid">
                  <p style={{ gridColumn: '1 / -1', fontSize: '13.5px' }}>
                    Transitioning: <strong>{customers.find(x => x.id === selectedCustId)?.customerName}</strong>
                  </p>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>
                      Choose Destination Stage
                    </label>
                    <select
                      class="form-input"
                      value={targetStageName}
                      onChange={e => setTargetStageName(e.target.value)}
                    >
                      {stages.map(s => (
                        <option key={s.stageName} value={s.stageName}>{s.stageName}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>
                      Staff Updating Stage *
                    </label>
                    <select
                      class="form-input"
                      value={stageMoveStaff}
                      onChange={e => setStageMoveStaff(e.target.value)}
                    >
                      {staffList.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onClick={() => { setIsMoveModalOpen(false); setSelectedCustId(null); }}>Cancel</button>
                <button type="submit" class="btn btn-primary">Update Stage</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PIPELINE STAGES SETTINGS (MANAGE COLUMNS) */}
      {isSettingsOpen && (
        <div class="modal-overlay">
          <div class="modal-content" style={{ maxWidth: '550px' }}>
            <div class="modal-header">
              <h3>Pipeline Stage Manager</h3>
              <button class="modal-close-btn" onClick={() => setIsSettingsOpen(false)}>&times;</button>
            </div>
            <div class="modal-body">
              {/* STAGES LIST - ACTIONS */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Active Columns Layout</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px' }}>
                  {stages
                    .sort((a, b) => a.stageOrder - b.stageOrder)
                    .map((s, idx) => (
                      <div key={s.stageName} style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', padding: '6px 10px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 1 }}>
                          <span class="stage-color-dot" style={{ backgroundColor: s.stageColor }}></span>
                          {editingStage === s.stageName ? (
                            <form onSubmit={handleRenameStageSubmit} style={{ display: 'flex', gap: '4px', width: '100%' }}>
                              <input
                                type="text"
                                class="form-input"
                                style={{ padding: '2px 6px', fontSize: '12px' }}
                                value={newStageName}
                                onChange={e => setNewStageName(e.target.value)}
                                autoFocus
                                required
                              />
                              <button type="submit" class="btn btn-primary btn-sm">Save</button>
                              <button type="button" class="btn btn-secondary btn-sm" onClick={() => setEditingStage(null)}>x</button>
                            </form>
                          ) : (
                            <span style={{ fontSize: '13px', fontWeight: '600' }}>{s.stageName}</span>
                          )}
                        </div>

                        {editingStage !== s.stageName && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                            {/* Move Up */}
                            <button
                              class="action-btn-circle"
                              style={{ width: '22px', height: '22px', fontSize: '10px' }}
                              disabled={idx === 0}
                              onClick={() => handleMoveStageOrder(idx, 'up')}
                            >
                              ↑
                            </button>
                            {/* Move Down */}
                            <button
                              class="action-btn-circle"
                              style={{ width: '22px', height: '22px', fontSize: '10px' }}
                              disabled={idx === stages.length - 1}
                              onClick={() => handleMoveStageOrder(idx, 'down')}
                            >
                              ↓
                            </button>
                            {/* Rename */}
                            <button
                              class="action-btn-circle"
                              style={{ width: '22px', height: '22px', fontSize: '10px' }}
                              onClick={() => {
                                setEditingStage(s.stageName);
                                setNewStageName(s.stageName);
                              }}
                            >
                              ✎
                            </button>
                            {/* Delete (if multiple stages exist) */}
                            {stages.length > 1 && (
                              <button
                                class="action-btn-circle"
                                style={{ width: '22px', height: '22px', fontSize: '10px', color: 'var(--status-red)' }}
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete stage "${s.stageName}"? Customers in this stage will be re-assigned to first stage.`)) {
                                    deleteStage(s.stageName);
                                  }
                                }}
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* CREATE STAGE SECTION */}
              <div style={{ paddingTop: '15px', borderTop: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>Create Custom Stage</h4>
                <form onSubmit={handleAddStageSubmit}>
                  <div class="form-grid two-col">
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Stage Name</label>
                      <input
                        type="text"
                        class="form-input"
                        placeholder="e.g. In Production"
                        value={addStageName}
                        onChange={e => setAddStageName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Column Dot Color</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="color"
                          class="form-input"
                          style={{ padding: '0', height: '36px', width: '50px', cursor: 'pointer' }}
                          value={addStageColor}
                          onChange={e => setAddStageColor(e.target.value)}
                        />
                        <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>{addStageColor}</span>
                      </div>
                    </div>
                    <div class="form-group-full" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                      <button type="submit" class="btn btn-primary btn-sm">Add Stage</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" onClick={() => setIsSettingsOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
