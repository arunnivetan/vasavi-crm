import React, { useState } from 'react';
import { CRMDatabaseProvider, useCRMDatabase } from './context/CRMDatabaseContext';
import Dashboard from './pages/Dashboard';
import Pipeline from './pages/Pipeline';
import Reminders from './pages/Reminders';
import CustomerDetail from './pages/CustomerDetail';

function AppContent() {
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'pipeline', 'reminders', 'customer-detail'
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If already in standalone display mode, hide install prompt
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBanner(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the native install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to PWA install: ${outcome}`);
    // We've used the prompt, reset state
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleCloseBanner = () => {
    setShowInstallBanner(false);
  };

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
              <circle cx="50" cy="50" r="48" fill="#0B1120" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="#D4A64F" strokeWidth="1.8" />
              <path id="top-text-path" d="M 12 50 A 38 38 0 0 1 88 50" fill="none" />
              <path id="bottom-text-path" d="M 88 50 A 38 38 0 0 1 12 50" fill="none" />
              <text fill="#F8FAFC" fontSize="5" fontFamily="'Inter', sans-serif" fontWeight="700" letterSpacing="1">
                <textPath href="#top-text-path" startOffset="50%" textAnchor="middle">
                  SRI VASAVI PLYWOOD
                </textPath>
              </text>
              <text fill="#94A3B8" fontSize="5.5" fontFamily="'Inter', sans-serif" fontWeight="600" letterSpacing="1">
                <textPath href="#bottom-text-path" startOffset="50%" text-anchor="middle">
                  SINCE 1997
                </textPath>
              </text>
              <text x="50" y="58" fill="#D4A64F" fontSize="22" fontFamily="'Sora', 'Georgia', serif" fontWeight="800" text-anchor="middle">
                SVP
              </text>
              <path d="M 32 75 Q 50 82 68 75 M 36 78 Q 50 85 64 78" fill="none" stroke="#D4A64F" strokeWidth="0.8" opacity="0.6" />
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

      {/* Glassmorphic PWA Install Banner */}
      {showInstallBanner && (
        <div className="pwa-install-banner animate-slide-in">
          <div className="pwa-install-icon">
            <svg viewBox="0 0 100 100" width="32" height="32">
              <circle cx="50" cy="50" r="48" fill="#0B1120" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="#D4A64F" strokeWidth="1.8" />
              <text x="50" y="58" fill="#D4A64F" fontSize="26" fontFamily="'Sora', sans-serif" fontWeight="900" textAnchor="middle">SVP</text>
            </svg>
          </div>
          <div className="pwa-install-text">
            <h4>Install Sri Vasavi CRM</h4>
            <p>Add to home screen for native experience & offline access</p>
          </div>
          <div className="pwa-install-actions">
            <button className="pwa-install-btn" onClick={handleInstallClick}>Install</button>
            <button className="pwa-close-btn" onClick={handleCloseBanner}>✕</button>
          </div>
        </div>
      )}
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
