import React, { useState, useEffect } from 'react';
import './App.css';
import CitizenPortal from './components/CitizenPortal';
import OfficerDashboard from './components/OfficerDashboard';
import DepartmentPortal from './components/DepartmentPortal';
import { API_BASE_URL } from './config';

function App() {
  const [view, setView] = useState('hero'); // hero, citizen, officer
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState({
    total_incidents: 0,
    critical_incidents: 0,
    coordinated_workflows: 0,
    resolved_incidents: 0
  });
  const [hotspots, setHotspots] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [theme, setTheme] = useState('light');
  const [fontSizeModifier, setFontSizeModifier] = useState(0); // -2, 0, +2 for accessibility

  // Notification / simulated alert logs states
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      timestamp: '11:32:04 PM',
      type: 'SMS',
      recipient: 'Citizen (9876543210)',
      message: 'OTP code 1234 generated for NGIS Grievance filing access.'
    },
    {
      id: 2,
      timestamp: '11:32:45 PM',
      type: 'WhatsApp',
      recipient: 'PWD Head',
      message: 'ACTION REQUIRED: New high-priority Road Damage incident reported at coordinates (28.6139, 77.2090). SLA: 48h.'
    }
  ]);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [unreadCount, setUnreadCount] = useState(2);

  const addNotification = (notif) => {
    const newNotif = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      ...notif
    };
    setNotifications(prev => [newNotif, ...prev]);
    setUnreadCount(prev => prev + 1);
  };

  // PWA Install prompt hooks
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard`);
      if (response.ok) {
        const data = await response.json();
        setIncidents(data.incidents);
        setStats({
          total_incidents: data.total_incidents,
          critical_incidents: data.critical_incidents,
          coordinated_workflows: data.coordinated_workflows,
          resolved_incidents: data.resolved_incidents
        });
        setHotspots(data.hotspots || []);
        setAnalytics(data.analytics || {});
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const handleFontChange = (modifier) => {
    setFontSizeModifier(modifier);
    document.documentElement.style.fontSize = `${16 + modifier}px`;
  };

  return (
    <div className="App">
      {/* 1. Tricolor Header Stripe */}
      <div className="tricolor-stripe"></div>

      {/* 2. Accessibility Bar */}
      <div className="accessibility-bar">
        <div>
          <span>भारत सरकार / Government of India</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div className="acc-buttons">
            <button onClick={() => handleFontChange(-2)}>A-</button>
            <button onClick={() => handleFontChange(0)} style={{ fontWeight: 'bold' }}>A</button>
            <button onClick={() => handleFontChange(2)}>A+</button>
          </div>
          <button 
            onClick={toggleTheme} 
            style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>
          <span style={{ borderRight: '1px solid rgba(255,255,255,0.3)', paddingRight: '10px' }}>Bilingual: EN / हिंदी</span>
          <button 
            onClick={async () => {
              if (window.confirm("डेटाबेस को रीसेट करें? / Reset database to default seed data?")) {
                try {
                  const res = await fetch(`${API_BASE_URL}/api/reset`, { method: 'POST' });
                  if (res.ok) {
                    alert("डेटाबेस सफलतापूर्वक रीसेट हो गया है! / Database reset successfully!");
                    window.location.reload();
                  }
                } catch (e) {
                  alert("Error resetting database.");
                }
              }
            }} 
            style={{ background: 'rgba(239, 68, 68, 0.35)', border: '1px solid #FCA5A5', color: '#FFF', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '3px', fontWeight: 'bold' }}
          >
            Reset DB / रीसेट
          </button>
          {showInstallBtn && deferredPrompt && (
            <button 
              onClick={async () => {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to install prompt: ${outcome}`);
                setDeferredPrompt(null);
                setShowInstallBtn(false);
              }} 
              style={{ background: 'rgba(15, 82, 186, 0.85)', border: '1px solid #93C5FD', color: '#FFF', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '3px', fontWeight: 'bold' }}
            >
              Install App / ऐप इंस्टॉल
            </button>
          )}
          <button 
            onClick={() => {
              setShowNotifDrawer(true);
              setUnreadCount(0);
            }} 
            style={{ position: 'relative', background: 'rgba(255, 255, 255, 0.15)', border: '1px solid rgba(255, 255, 255, 0.3)', color: '#FFF', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '3px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}
          >
            Alert Feed / सूचना पट्टी
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#DC2626', color: '#FFF', fontSize: '0.58rem', padding: '1px 5px', borderRadius: '10px', fontWeight: 'bold' }}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 3. Main Government Header */}
      <header className="main-header" style={{ padding: '12px 40px' }}>
        <div className="header-brand">
          {/* Ashoka Chakra Emblem SVG */}
          <svg className="chakra-logo" width="54" height="54" viewBox="0 0 100 100" style={{ marginRight: '10px', transition: 'transform 0.8s ease-in-out' }}>
            <circle cx="50" cy="50" r="48" fill="none" stroke="#FF9933" strokeWidth="2.5" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="#138808" strokeWidth="2.5" />
            <circle cx="50" cy="50" r="42" fill="#FFFFFF" />
            {/* Inner Chakra ring */}
            <circle cx="50" cy="50" r="18" fill="none" stroke="#000080" strokeWidth="2" />
            <circle cx="50" cy="50" r="2.5" fill="#000080" />
            {/* spokes */}
            {[...Array(24)].map((_, i) => (
              <line 
                key={i}
                x1="50" 
                y1="50" 
                x2={50 + 18 * Math.cos((i * 15 * Math.PI) / 180)} 
                y2={50 + 18 * Math.sin((i * 15 * Math.PI) / 180)} 
                stroke="#000080" 
                strokeWidth="1"
              />
            ))}
          </svg>
          <div className="brand-text">
            <h1 style={{ fontSize: '1.25rem', color: 'var(--primary-navy)', fontWeight: 800 }}>
              स्वायत्त लोक शिकायत निवारण एवं निगरानी प्रणाली (NGIS)
            </h1>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--secondary-blue)', marginTop: '2px' }}>
              NexGenGov - Autonomous Governance Intelligence Platform
            </h1>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 600 }}>
              National Governance Intelligence System (NGIS) | भारत सरकार / Govt of India
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div className="digital-india-logo" style={{ borderRight: '1px solid rgba(0,0,0,0.1)', paddingRight: '15px' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F52BA' }}>Digital India</span>
            <span style={{ fontSize: '0.6rem', color: '#138808', letterSpacing: '0.5px' }}>Power To Empower</span>
          </div>
          <div style={{ fontSize: '0.68rem', textAlign: 'right', color: 'var(--text-muted)' }}>
            <strong>Helpline / सहायता:</strong><br />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#DC2626' }}>1800-123-4567</span>
          </div>
        </div>
      </header>

      {/* 4. Horizontal Menu Navigation (CPGRAMS Style) */}
      <div className="main-navbar">
        <button className={`nav-link-btn ${view === 'hero' ? 'active' : ''}`} onClick={() => setView('hero')}>
          Home / मुख्य पृष्ठ
        </button>
        <button className={`nav-link-btn ${view === 'citizen' ? 'active' : ''}`} onClick={() => setView('citizen')}>
          Lodge Grievance / शिकायत दर्ज करें
        </button>
        <button className={`nav-link-btn ${view === 'officer' ? 'active' : ''}`} onClick={() => setView('officer')}>
          Officer Admin / प्रशासनिक पोर्टल
        </button>
        <button className={`nav-link-btn ${view === 'department' ? 'active' : ''}`} onClick={() => setView('department')}>
          Department Portal / विभागीय पोर्टल
        </button>
        <button className="nav-link-btn" onClick={() => alert("Helpline Toll Free: 1800-123-4567. Address: Autonomous Governance Intelligence Division (NGIS Headquarters), New Delhi.")}>
          Contact Us / संपर्क करें
        </button>
      </div>

      {/* News Alert Marquee Stripe */}
      <div style={{ background: '#F1F5F9', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', height: '36px', alignItems: 'center', padding: '0 40px' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#FFF', background: '#DC2626', padding: '3px 8px', borderRadius: '3px', marginRight: '15px' }}>
          UPDATES / समाचार
        </span>
        <div className="alert-ticker" style={{ width: '85%', background: 'transparent', border: 'none', padding: 0 }}>
          <div className="ticker-text" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
            NGIS ALERT: Active coordinated municipal workflow successfully resolved 14 active utility hotspots at School crossroad. SLA score is 96.5% standard compliance.
          </div>
        </div>
      </div>

      {/* 5. Main View Area */}
      <main className="page-container" style={{ paddingTop: '20px' }}>
        {view === 'hero' && (
          <div className="hero-container" style={{ maxWidth: '1280px', textAlign: 'left', padding: '10px 0' }}>
            {/* Top Grid: Description & Quick Links */}
            <div style={{ display: 'grid', gridTemplateColumns: '0.7fr 0.3fr', gap: '30px', marginBottom: '35px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-title)', color: 'var(--primary-navy)', fontSize: '2rem', fontWeight: 800 }}>
                  स्वायत्त लोक शिकायत बुद्धिमत्ता प्रणाली
                </h2>
                <h2 style={{ fontFamily: 'var(--font-title)', color: 'var(--secondary-blue)', fontSize: '1.6rem', fontWeight: 700, marginTop: '2px' }}>
                  Autonomous Grievance Triage & Resolution Platform
                </h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '12px', lineHeight: '1.6', opacity: 0.9 }}>
                  CPGRAMS NGIS carries automated artificial intelligence models directly to municipal and administrative grievances. 
                  Once a citizen uploads an incident details via Hindi/English speech text or photo defect captures:
                </p>
                <ul style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px', paddingLeft: '20px', lineHeight: '1.5' }}>
                  <li><strong>Visual Scanner</strong>: Identifies defect classes (potholes, garbage) and overlays computer vision boxes.</li>
                  <li><strong>Similarity Search</strong>: Automatically clubs multiple citizen complaints within 50 meters to prevent duplicate pipelines.</li>
                  <li><strong>Triage & Assign</strong>: Computes explainable priority weights and generates a sequential, coordinated workflow chain.</li>
                </ul>
              </div>

              {/* Sidebar Contact and Download Info */}
              <div className="gov-card blue-accent" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--primary-navy)', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '6px' }}>
                  MOBILE GRIEVANCE APP
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <div style={{ width: '45px', height: '45px', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.6rem', borderRadius: '4px', border: '1px dashed #94A3B8' }}>QR CODE</div>
                  <div>
                    <strong>Scan to Download App</strong><br />
                    Available on Google Play & App Store
                  </div>
                </div>
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '10px', fontSize: '0.75rem' }}>
                  <strong>Admin Helpdesk Email:</strong><br />
                  <a href="mailto:support-ngis@gov.in" style={{ color: 'var(--secondary-blue)', textDecoration: 'none' }}>support-ngis@gov.in</a>
                </div>
              </div>
            </div>

            {/* Portal Entry Cards Grid */}
            <div className="hero-cards-grid" style={{ marginBottom: '40px' }}>
              <div 
                className="portal-entry-card citizen-style"
                onClick={() => setView('citizen')}
                style={{ padding: '30px 20px', minHeight: '260px' }}
              >
                <div className="portal-name">नागरिक शिकायत / Lodge Grievance</div>
                <p className="portal-desc" style={{ fontSize: '0.78rem', margin: '12px 0', minHeight: '65px' }}>
                  Lodge new municipal complaints using voice dictation (Hindi + English) or photo uploads. Maps coordinates automatically.
                </p>
                <button className="btn btn-saffron" style={{ width: '90%', marginTop: 'auto' }}>
                  Enter Citizen Portal / प्रवेश करें
                </button>
              </div>

              <div 
                className="portal-entry-card officer-style"
                onClick={() => setView('officer')}
                style={{ padding: '30px 20px', minHeight: '260px' }}
              >
                <div className="portal-name">अधिकारी लॉग-इन / Admin Dashboard</div>
                <p className="portal-desc" style={{ fontSize: '0.78rem', margin: '12px 0', minHeight: '65px' }}>
                  Inspect active hotspots, review explainable priority breakdowns, verify before/after photos, and check performance analytics.
                </p>
                <button className="btn btn-primary" style={{ width: '90%', marginTop: 'auto' }}>
                  Officer Sign In / प्रवेश करें
                </button>
              </div>

              <div 
                className="portal-entry-card department-style"
                onClick={() => setView('department')}
                style={{ padding: '30px 20px', minHeight: '260px' }}
              >
                <div className="portal-name">विभागीय लॉग-इन / Department Login</div>
                <p className="portal-desc" style={{ fontSize: '0.78rem', margin: '12px 0', minHeight: '65px' }}>
                  Access assigned tasks for PWD, Water supply, and Sanitation. Log work progress status and upload resolution verification proofs.
                </p>
                <button className="btn btn-green" style={{ width: '90%', marginTop: 'auto' }}>
                  Department Login / प्रवेश करें
                </button>
              </div>
            </div>

            {/* Live National Registry Statistics Row */}
            <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--primary-navy)', marginBottom: '15px', fontSize: '1.05rem', textAlign: 'left', borderBottom: '1.5px solid rgba(0,0,0,0.06)', paddingBottom: '8px' }}>
              सक्रिय राष्ट्रीय शासन सांख्यिकी / SYSTEM LIVE REGISTRY METRICS
            </h3>
            <div className="hero-stats-row" style={{ marginBottom: '40px' }}>
              <div className="hero-stat-box" style={{ padding: '20px 15px' }}>
                <div className="hero-stat-num">{stats.total_incidents}</div>
                <div className="hero-stat-label">Total Grievances Received</div>
              </div>
              <div className="hero-stat-box" style={{ padding: '20px 15px' }}>
                <div className="hero-stat-num" style={{ color: '#DC2626' }}>{stats.critical_incidents}</div>
                <div className="hero-stat-label">Critical Red-Zone Incidents</div>
              </div>
              <div className="hero-stat-box" style={{ padding: '20px 15px' }}>
                <div className="hero-stat-num" style={{ color: '#FF9933' }}>{stats.coordinated_workflows}</div>
                <div className="hero-stat-label">Coordinated Task Flows</div>
              </div>
              <div className="hero-stat-box" style={{ padding: '20px 15px' }}>
                <div className="hero-stat-num" style={{ color: '#138808' }}>{stats.resolved_incidents}</div>
                <div className="hero-stat-label">Grievances Successfully Disposed</div>
              </div>
            </div>

            {/* CPGRAMS Redressal Flow Map (Roadmap flowchart) */}
            <div className="roadmap-container">
              <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--primary-navy)', fontSize: '1.1rem', fontWeight: 800, borderBottom: '1.5px solid rgba(0,0,0,0.06)', paddingBottom: '8px' }}>
                शिकायत निवारण प्रक्रिया प्रवाह / GRIEVANCE REDRESSAL PROCESS ROADMAP
              </h3>
              <div className="roadmap-grid">
                <div className="roadmap-step">
                  <div className="roadmap-icon">1</div>
                  <div className="roadmap-title">शिकायत / Lodge</div>
                  <div className="roadmap-desc">Voice (STT) or Image defect input.</div>
                </div>
                <div className="roadmap-step">
                  <div className="roadmap-icon">2</div>
                  <div className="roadmap-title">स्कैनिंग / CV Scan</div>
                  <div className="roadmap-desc">AI draws bounding box defect overlays.</div>
                </div>
                <div className="roadmap-step">
                  <div className="roadmap-icon">3</div>
                  <div className="roadmap-title">वर्गीकरण / Triage</div>
                  <div className="roadmap-desc">Priority score breakdown weights calculated.</div>
                </div>
                <div className="roadmap-step">
                  <div className="roadmap-icon">4</div>
                  <div className="roadmap-title">समन्वय / Coordinated</div>
                  <div className="roadmap-desc">Root-cause tasks mapped across PWD/Water.</div>
                </div>
                <div className="roadmap-step">
                  <div className="roadmap-icon">5</div>
                  <div className="roadmap-title">कार्य / Resolution</div>
                  <div className="roadmap-desc">Departments resolve task under SLA clock.</div>
                </div>
                <div className="roadmap-step">
                  <div className="roadmap-icon">6</div>
                  <div className="roadmap-title">ऑडिट / Visual Audit</div>
                  <div className="roadmap-desc">AI compares Before/After proof images.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'citizen' && (
          <CitizenPortal 
            incidents={incidents}
            onSubmitSuccess={fetchDashboardData} 
            onBackToHome={() => setView('hero')} 
            onAddNotification={addNotification}
          />
        )}

        {view === 'officer' && (
          <OfficerDashboard 
            incidents={incidents} 
            stats={stats} 
            hotspots={hotspots}
            analytics={analytics}
            onRefresh={fetchDashboardData} 
            onBackToHome={() => setView('hero')} 
            onAddNotification={addNotification}
          />
        )}

        {view === 'department' && (
          <DepartmentPortal 
            incidents={incidents} 
            onRefresh={fetchDashboardData} 
            onBackToHome={() => setView('hero')} 
            onAddNotification={addNotification}
          />
        )}
      </main>

      {/* 5B. Alert Feed / Simulated SMS side drawer */}
      {showNotifDrawer && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: '380px', height: '100%', background: '#FFF', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)', zIndex: 2000, display: 'flex', flexDirection: 'column', animation: 'slide-in 0.25s ease-out', color: '#1E293B' }}>
          <div style={{ background: 'var(--primary-navy)', color: '#FFF', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-title)', fontSize: '1.1rem', fontWeight: 800 }}>सिम्युलेटेड अलर्ट्स / Simulated Alert Feed</h3>
            <button 
              onClick={() => setShowNotifDrawer(false)}
              style={{ background: 'none', border: 'none', color: '#FFF', fontSize: '1.5rem', cursor: 'pointer', fontWeight: 'bold' }}
            >
              &times;
            </button>
          </div>
          
          <div style={{ flexGrow: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#F8FAFC' }}>
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No alerts generated yet. Trigger alerts by generating OTPs, filing complaints, or updating work orders.
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} style={{ background: '#FFF', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px', padding: '12px', boxShadow: 'var(--shadow-sm)', borderLeft: n.type === 'WhatsApp' ? '4px solid #25D366' : '4px solid #3B82F6', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '5px' }}>
                    <span style={{ fontWeight: 700, color: n.type === 'WhatsApp' ? '#16A34A' : '#2563EB' }}>
                      {n.type.toUpperCase()} ➔ {n.recipient}
                    </span>
                    <span>{n.timestamp}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.4', fontWeight: 500 }}>
                    {n.message}
                  </p>
                </div>
              ))
            )}
          </div>
          
          <div style={{ padding: '15px', borderTop: '1px solid rgba(0,0,0,0.06)', background: '#F1F5F9', textAlign: 'center' }}>
            <button 
              className="btn btn-outline" 
              style={{ width: '100%', fontSize: '0.8rem', borderColor: 'var(--primary-navy)', color: 'var(--primary-navy)' }}
              onClick={() => setNotifications([])}
            >
              क्लियर फ़ीड / Clear Logs
            </button>
          </div>
        </div>
      )}

      {/* Side-drawer animation styles */}
      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>

      {/* 6. NIC/Digital India Footer */}
      <footer className="gov-footer">
        <div className="footer-content">
          <div className="footer-links">
            <a href="#about">About System</a>
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Use</a>
            <a href="#help">Help / FAQ</a>
          </div>
          <p className="nic-tag">
            Designed, developed and hosted by <strong>National Informatics Centre (NIC)</strong>.<br />
            Content Owned and Managed by Ministry of Personnel, Public Grievances & Pensions.
          </p>
          <p style={{ opacity: 0.5, fontSize: '0.7rem' }}>
            © {new Date().getFullYear()} NexGenGov. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
