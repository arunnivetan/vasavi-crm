import React, { useState } from 'react';
import { CRMDatabaseProvider, useCRMDatabase } from './context/CRMDatabaseContext';
import Dashboard from './pages/Dashboard';
import Pipeline from './pages/Pipeline';
import Reminders from './pages/Reminders';
import CustomerDetail from './pages/CustomerDetail';

function AppContent() {
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'pipeline', 'reminders', 'customer-detail'
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  const { activeStaff, setActiveStaff, staffList } = useCRMDatabase();

  const handleViewCustomer = (customerId) => {
    setSelectedCustomerId(customerId);
    setCurrentView('customer-detail');
  };

  const handleBackToDashboard = () => {
    setSelectedCustomerId(null);
    setCurrentView('dashboard');
  };

  return (
    <div class="app-container">
      {/* GLOBAL BRAND HEADER & STAFF ASSIGNMENT BAR */}
      <header class="header-bar">
        <div class="brand-section">
          <div className="brand-logo" style={{ width: '44px', height: '44px', flexShrink: 0, background: 'none', boxShadow: 'none' }}>
            <svg viewBox="0 0 100 100" width="100%" height="100%">
              <circle cx="50" cy="50" r="48" fill="#0B0F19" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="#F97316" strokeWidth="1.8" />
              <path id="top-text-path" d="M 12 50 A 38 38 0 0 1 88 50" fill="none" />
              <path id="bottom-text-path" d="M 88 50 A 38 38 0 0 1 12 50" fill="none" />
              <text fill="#ffffff" fontSize="5" fontFamily="'Inter', sans-serif" fontWeight="700" letterSpacing="1">
                <textPath href="#top-text-path" startOffset="50%" textAnchor="middle">
                  SRI VASAVI PLYWOOD
                </textPath>
              </text>
              <text fill="#94A3B8" fontSize="5.5" fontFamily="'Inter', sans-serif" fontWeight="600" letterSpacing="1">
                <textPath href="#bottom-text-path" startOffset="50%" text-anchor="middle">
                  SINCE 1997
                </textPath>
              </text>
              <text x="50" y="58" fill="#F97316" fontSize="22" fontFamily="'Outfit', 'Georgia', serif" fontWeight="800" text-anchor="middle">
                SVP
              </text>
              <path d="M 32 75 Q 50 82 68 75 M 36 78 Q 50 85 64 78" fill="none" stroke="#F97316" strokeWidth="0.8" opacity="0.6" />
            </svg>
          </div>
          <div>
            <h1 class="brand-name" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-white)' }}>SRI VASAVI PLYWOODS</h1>
            <span style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              GLASSWARES & HARDWARES
            </span>
          </div>
        </div>

        {/* Executive Staff Profile Swapper */}
        <div class="user-avatar-selector">
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>Active Representative:</span>
          <select
            class="staff-dropdown-select"
            value={activeStaff}
            onChange={e => setActiveStaff(e.target.value)}
          >
            {staffList.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div class="staff-avatar" title={`Logged in as ${activeStaff}`}>
            {activeStaff.substring(0, 2).toUpperCase()}
          </div>
        </div>
      </header>

      {/* CORE PAGES ROUTER VIEW CONTAINER */}
      <main style={{ minHeight: 'calc(100vh - 220px)' }}>
        {currentView === 'dashboard' && (
          <Dashboard onViewCustomer={handleViewCustomer} />
        )}
        
        {currentView === 'pipeline' && (
          <Pipeline onViewCustomer={handleViewCustomer} />
        )}
        
        {currentView === 'reminders' && (
          <Reminders onViewCustomer={handleViewCustomer} />
        )}
        
        {currentView === 'customer-detail' && selectedCustomerId && (
          <CustomerDetail
            customerId={selectedCustomerId}
            onBack={handleBackToDashboard}
          />
        )}
      </main>

      {/* STICKY GLASSMORPHIC BOTTOM NAVIGATION BAR */}
      <nav class="bottom-nav">
        {/* Dashboard Tab */}
        <button
          class={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => {
            setSelectedCustomerId(null);
            setCurrentView('dashboard');
          }}
        >
          <svg viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          Dashboard
        </button>

        {/* Pipeline Tab */}
        <button
          class={`nav-item ${currentView === 'pipeline' ? 'active' : ''}`}
          onClick={() => {
            setSelectedCustomerId(null);
            setCurrentView('pipeline');
          }}
        >
          <svg viewBox="0 0 24 24">
            <line x1="12" y1="20" x2="12" y2="10"></line>
            <line x1="18" y1="20" x2="18" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="16"></line>
          </svg>
          Pipeline
        </button>

        {/* Reminders / Activity Tab */}
        <button
          class={`nav-item ${currentView === 'reminders' ? 'active' : ''}`}
          onClick={() => {
            setSelectedCustomerId(null);
            setCurrentView('reminders');
          }}
        >
          <svg viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          Reminders
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <CRMDatabaseProvider>
      <AppContent />
    </CRMDatabaseProvider>
  );
}
