import React, { useState } from 'react';
import { useCRMDatabase } from '../context/CRMDatabaseContext';
import svpLogo from '../assets/svp-logo.png';

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
  const [addStageColor, setAddStageColor] = useState('#D4A64F');

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
      setAddStageColor('#D4A64F');
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
      {/* Premium Pipeline Header */}
      <div className="mobile-app-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '16px', paddingBottom: '0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={svpLogo} alt="Logo" style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#fff', padding: '2px' }} />
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: '0', color: 'var(--text-white)' }}>Sri Vasavi Plywoods</h2>
              <p style={{ fontSize: '11px', margin: 0, color: 'var(--text-muted)' }}>Pipeline & Deals</p>
            </div>
          </div>
          <button className="action-btn-circle" title="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </button>
        </div>
        
        {/* Horizontal Scrollable Stage Tabs */}
        <div className="pipeline-stage-tabs" style={{ display: 'flex', overflowX: 'auto', gap: '12px', width: '100%', paddingBottom: '12px', paddingLeft: '4px', scrollSnapType: 'x mandatory' }}>
          {stages.sort((a, b) => a.stageOrder - b.stageOrder).map(stg => (
            <div key={stg.stageName} style={{ scrollSnapAlign: 'start', whiteSpace: 'nowrap', padding: '6px 14px', borderRadius: '20px', backgroundColor: 'rgba(255,255,255,0.05)', fontSize: '13px', fontWeight: '600', color: 'var(--text-white)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: stg.stageColor, marginRight: '6px' }}></span>
              {stg.stageName}
            </div>
          ))}
          <button style={{ padding: '6px 14px', borderRadius: '20px', backgroundColor: 'transparent', border: '1px dashed rgba(255,255,255,0.3)', color: 'var(--text-white)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', scrollSnapAlign: 'start' }} onClick={() => setIsSettingsOpen(true)}>
            + Manage
          </button>
        </div>
      </div>

      {/* HORIZONTAL SCROLL KANBAN PIPELINE */}
      <div class="pipeline-scroll-container">
        {[...stages]
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
                    stageCustomers.map(c => {
                      const priorityColor = c.priority === 'High' ? '#ef4444' : c.priority === 'Medium' ? '#f59e0b' : '#10b981';
                      return (
                      <div className="premium-pipeline-card" key={c.id}>
                        {/* Name and Priority */}
                        <div className="card-header-row" onClick={() => onViewCustomer(c.id)}>
                          <span className="card-title">
                            {c.customerName}
                          </span>
                          <span className="badge" style={{ backgroundColor: `${priorityColor}15`, color: priorityColor }}>
                            {c.priority}
                          </span>
                        </div>

                        {/* Requirements snippet */}
                        <div className="card-req-row" style={{ marginTop: '8px' }} onClick={() => onViewCustomer(c.id)}>
                          {c.requirement || 'No requirements specified.'}
                        </div>
                        
                        <hr className="card-divider" />

                        {/* Footer billing & Quick move button */}
                        <div className="card-footer-row" style={{ marginTop: '0' }}>
                          <div style={{ flex: 1 }} onClick={() => onViewCustomer(c.id)}>
                            <span className="card-amount" style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-white)' }}>₹{c.amount.toLocaleString('en-IN')}</span>
                          </div>

                          <div className="footer-actions">
                            <button
                              className="action-circle"
                              title="Call"
                              onClick={() => window.location.href = `tel:${c.phone}`}
                            >
                              📞
                            </button>
                            <button
                              className="action-circle"
                              title="Move Stage"
                              onClick={() => openMoveModal(c.id, c.stage)}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 18 15 12 9 6"></polyline>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );})
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* --- PIPELINE POPUPS & MODALS --- */}

      {/* MODAL 1: MOVE CARD STAGE */}
      {isMoveModalOpen && selectedCustId && (
        <div class="modal-overlay drawer-overlay">
          <div class="modal-content bottom-sheet" style={{ borderRadius: '20px 20px 0 0' }}>
            <div class="bottom-sheet-handle mobile-only"></div>
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
        <div className="modal-overlay drawer-overlay">
          <div className="modal-content bottom-sheet" style={{ maxWidth: '550px', borderRadius: '24px 24px 0 0', backgroundColor: '#1e2433' }}>
            <div className="bottom-sheet-handle mobile-only"></div>
            <div className="modal-header" style={{ padding: '24px 24px 12px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Manage Pipeline Stages</h3>
              <button className="modal-close-btn" onClick={() => setIsSettingsOpen(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ padding: '16px 24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[...stages]
                  .sort((a, b) => a.stageOrder - b.stageOrder)
                  .map((s, idx) => (
                    <div key={s.stageName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexGrow: 1 }}>
                        <span className="stage-color-dot" style={{ backgroundColor: s.stageColor, width: '16px', height: '16px' }}></span>
                        {editingStage === s.stageName ? (
                          <form onSubmit={handleRenameStageSubmit} style={{ display: 'flex', gap: '6px', width: '100%' }}>
                            <input
                              type="text"
                              className="form-input"
                              style={{ padding: '4px 8px', fontSize: '14px', borderRadius: '6px' }}
                              value={newStageName}
                              onChange={e => setNewStageName(e.target.value)}
                              autoFocus
                              required
                            />
                            <button type="submit" className="btn btn-primary btn-sm">Save</button>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingStage(null)}>x</button>
                          </form>
                        ) : (
                          <span style={{ fontSize: '15px', fontWeight: '600', color: '#fff' }}>{s.stageName}</span>
                        )}
                      </div>

                      {editingStage !== s.stageName && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            className="action-btn-circle"
                            style={{ background: 'transparent', color: 'var(--text-muted)' }}
                            onClick={() => {
                              setEditingStage(s.stageName);
                              setNewStageName(s.stageName);
                            }}
                          >
                            ✎
                          </button>
                          {stages.length > 1 && (
                            <button
                              className="action-btn-circle"
                              style={{ background: 'transparent', color: 'var(--text-muted)' }}
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete stage "${s.stageName}"?`)) {
                                  deleteStage(s.stageName);
                                }
                              }}
                            >
                              🗑
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>

              {/* CREATE STAGE */}
              <div style={{ marginTop: '24px' }}>
                <button
                  className="btn"
                  style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px dashed rgba(255,255,255,0.1)', color: 'var(--text-muted)', display: 'flex', justifyContent: 'center', gap: '8px', borderRadius: '12px' }}
                  onClick={() => {
                    const name = prompt("Enter new stage name:");
                    if (name) addStage(name, '#3b82f6');
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add New Stage
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
