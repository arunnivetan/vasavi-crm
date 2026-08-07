import React, { useState } from 'react';
import { CRMDatabaseProvider, useCRMDatabase } from './context/CRMDatabaseContext';
import Dashboard from './pages/Dashboard';
import Pipeline from './pages/Pipeline';
import Reminders from './pages/Reminders';
import CustomerDetail from './pages/CustomerDetail';
import LoginModal from './components/LoginModal';
import AdminActivityMonitor from './pages/AdminActivityMonitor';

function AppContent() {
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'pipeline', 'reminders', 'customer-detail', 'activities'
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

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

  const { currentUser, switchUser } = useCRMDatabase();

  const handleViewCustomer = (customerId) => {
    setSelectedCustomerId(customerId);
    setCurrentView('customer-detail');
  };

  const handleBackToDashboard = () => {
    setSelectedCustomerId(null);
    setCurrentView('dashboard');
  };

  // Safe fallback if currentUser is still loading
  const activeUser = currentUser || {
    userCode: 'arun',
    fullName: 'R S ARUN NIVETAN',
    role: 'Admin',
    activityColor: '#3B82F6'
  };

  const predefinedProfiles = [
    { code: 'arun', name: 'R S ARUN NIVETAN', role: 'Admin', color: '#3B82F6' },
    { code: 'suresh', name: 'R SURESH BABU', role: 'Admin', color: '#D4A64F' },
    { code: 'saranya', name: 'S SARANYA', role: 'Staff', color: '#A855F7' },
    { code: 'pratiksha', name: 'R S PRATIKSHA', role: 'Staff', color: '#10B981' }
  ];

  return (
    <div className="app-container">
      {/* GLOBAL BRAND HEADER & STAFF PROFILE CARD */}
      <header className="header-bar">
        <div className="brand-section">
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
                <textPath href="#bottom-text-path" startOffset="50%" textAnchor="middle">
                  SINCE 1997
                </textPath>
              </text>
              <text x="50" y="58" fill="#D4A64F" fontSize="22" fontFamily="'Sora', 'Georgia', serif" fontWeight="800" textAnchor="middle">
                SVP
              </text>
              <path d="M 32 75 Q 50 82 68 75 M 36 78 Q 50 85 64 78" fill="none" stroke="#D4A64F" strokeWidth="0.8" opacity="0.6" />
            </svg>
          </div>
          <div>
            <h1 className="brand-name" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-white)' }}>SRI VASAVI PLYWOODS</h1>
            <span style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              GLASSWARES & HARDWARES
            </span>
          </div>
        </div>

        {/* Executive Staff Profile Swapper */}
        <div className="user-avatar-selector" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowProfileDropdown(!showProfileDropdown)}>
          <div 
            className="staff-avatar" 
            title={`Active Profile: ${activeUser.fullName}`}
            style={{ 
              background: activeUser.activityColor || 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
              border: `2px solid ${activeUser.activityColor || 'var(--border-hover)'}`
            }}
          >
            {activeUser.fullName.substring(0, 2).toUpperCase()}
          </div>
          <span style={{ fontSize: '13px', color: 'var(--text-white)', fontWeight: '600' }} className="mobile-hidden">
            {activeUser.fullName.split(' ')[activeUser.fullName.split(' ').length - 1]}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>▼</span>

          {showProfileDropdown && (
            <div 
              style={{
                position: 'absolute',
                top: '42px',
                right: '0',
                background: '#111827',
                border: '1px solid rgba(212, 166, 79, 0.3)',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                padding: '12px',
                width: '210px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Switch Active Staff Profile
              </div>

              {predefinedProfiles.map(p => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => {
                    switchUser(p);
                    setShowProfileDropdown(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: activeUser.userCode === p.code ? 'rgba(212, 166, 79, 0.15)' : 'rgba(255,255,255,0.03)',
                    border: activeUser.userCode === p.code ? '1px solid rgba(212, 166, 79, 0.4)' : '1px solid transparent',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: activeUser.userCode === p.code ? '700' : '500',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: p.color }}></span>
                  <span style={{ flex: 1 }}>{p.name}</span>
                  {activeUser.userCode === p.code && <span style={{ color: '#D4A64F', fontWeight: '800' }}>✓</span>}
                </button>
              ))}
            </div>
          )}
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
        
        {currentView === 'activities' && (
          <AdminActivityMonitor />
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
          Home
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
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          Pipeline
        </button>

        {/* Reminders Tab */}
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

        {/* Audit Monitor Tab */}
        <button
          class={`nav-item ${currentView === 'activities' ? 'active' : ''}`}
          onClick={() => {
            setSelectedCustomerId(null);
            setCurrentView('activities');
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
          Audit Monitor
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
