import React, { useState } from 'react';
import { useCRMDatabase } from '../context/CRMDatabaseContext';
import svpLogo from '../assets/svp-logo.png';

export default function LoginModal() {
  const { crmUsers, loginUser, registerOthersUser } = useCRMDatabase();
  
  const [selectedUserCode, setSelectedUserCode] = useState('');
  const [isOthers, setIsOthers] = useState(false);
  const [othersName, setOthersName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [shake, setShake] = useState(false);

  const predefinedProfiles = [
    { code: 'suresh', name: 'R SURESH BABU', color: '#D4A64F' },
    { code: 'arun', name: 'R S ARUN NIVETAN', color: '#3B82F6' },
    { code: 'saranya', name: 'S SARANYA', color: '#A855F7' },
    { code: 'pratiksha', name: 'R S PRATIKSHA', color: '#10B981' }
  ];

  const handleProfileSelect = (code) => {
    setErrorMsg('');
    if (code === 'others') {
      setIsOthers(true);
      setSelectedUserCode('others');
    } else {
      setIsOthers(false);
      setSelectedUserCode(code);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserCode) {
      setErrorMsg('Please select a profile first.');
      triggerShake();
      return;
    }
    if (isOthers && !othersName.trim()) {
      setErrorMsg('Please enter your name.');
      triggerShake();
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      triggerShake();
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    
    try {
      if (isOthers) {
        // Register the new user permanently & log in
        await registerOthersUser(othersName);
      } else {
        // Log in predefined profile
        await loginUser(selectedUserCode, password);
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Login failed. Please try again.');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-login-overlay">
      <div className={`glass-login-box ${shake ? 'shake-anim' : ''}`}>
        <div className="glass-login-glow"></div>
        
        {/* Brand Credentials */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img 
            src={svpLogo} 
            alt="Sri Vasavi Logo" 
            style={{ width: '80px', height: '80px', objectFit: 'contain', margin: '0 auto 12px auto', display: 'block' }} 
          />
          <h2 style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-display)', color: '#fff', letterSpacing: '-0.5px', marginTop: '12px' }}>
            Sri Vasavi CRM
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
            Enterprise Management Desk
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Step 1: Select Profile */}
          <div>
            <label className="ag-form-label" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px', display: 'block', color: 'var(--text-muted)' }}>
              Select Profile
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predefinedProfiles.map(p => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => handleProfileSelect(p.code)}
                  className={`glass-profile-btn ${selectedUserCode === p.code ? 'selected' : ''}`}
                  style={{
                    '--profile-color': p.color
                  }}
                >
                  <span className="profile-dot" style={{ backgroundColor: p.color }}></span>
                  <span className="profile-name">{p.name}</span>
                  {selectedUserCode === p.code && <span className="profile-check">✓</span>}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleProfileSelect('others')}
                className={`glass-profile-btn ${selectedUserCode === 'others' ? 'selected' : ''}`}
                style={{
                  '--profile-color': '#EC4899'
                }}
              >
                <span className="profile-dot" style={{ backgroundColor: '#EC4899' }}></span>
                <span className="profile-name">OTHERS / NEW STAFF</span>
                {selectedUserCode === 'others' && <span className="profile-check">✓</span>}
              </button>
            </div>
          </div>

          {/* OTHERS Flow: Custom Name input */}
          {isOthers && (
            <div className="fade-in-element">
              <label className="ag-form-label" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>
                Enter Your Full Name
              </label>
              <input
                type="text"
                className="ag-input-futuristic"
                placeholder="Ravi Shankar, etc."
                value={othersName}
                onChange={e => setOthersName(e.target.value)}
                style={{ height: '38px', borderRadius: '8px', fontSize: '13px', border: '1px solid rgba(255,255,255,0.08)' }}
                required
              />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                This creates a permanent profile linked to your logs.
              </span>
            </div>
          )}

          {/* Password Field */}
          <div>
            <label className="ag-form-label" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'block' }}>
              Security Key
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="ag-input-futuristic"
                placeholder="Enter password..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ height: '38px', borderRadius: '8px', fontSize: '13px', paddingRight: '40px', border: '1px solid rgba(255,255,255,0.08)' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            <span style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.4)', marginTop: '5px', display: 'block' }}>
              Default Security Key: <strong style={{ color: '#D4A64F' }}>suresh</strong>
            </span>
          </div>

          {/* Errors overlay */}
          {errorMsg && (
            <div className="glass-login-error" style={{ fontSize: '11.5px', color: '#ff6b6b', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '8px 12px', borderRadius: '8px', textAlign: 'center', fontWeight: '500' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{
              height: '40px',
              borderRadius: '8px',
              fontWeight: '700',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '13px',
              boxShadow: 'var(--shadow-md)',
              border: 'none',
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)'
            }}
          >
            {isLoading ? (
              <span className="glass-spinner"></span>
            ) : (
              <>🔓 Authenticate Session</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
