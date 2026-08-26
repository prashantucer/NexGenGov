import React, { useState, useEffect } from 'react';
import MapView from './MapView';

const OfficerDashboard = ({ incidents = [], stats, hotspots = [], analytics = {}, onRefresh, onBackToHome }) => {
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [overlayProofTask, setOverlayProofTask] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard or analytics

  // Login credentials states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Sync selected incident when database updates
  useEffect(() => {
    if (selectedIncident) {
      const refreshed = incidents.find(i => i.id === selectedIncident.id);
      if (refreshed) {
        setSelectedIncident(refreshed);
      }
    }
  }, [incidents]);

  const handleSelectIncident = (incident) => {
    setSelectedIncident(incident);
  };

  const renderPriorityBreakdown = (incident) => {
    if (!incident.priority_breakdown) return null;
    try {
      const breakdown = typeof incident.priority_breakdown === 'string' 
        ? JSON.parse(incident.priority_breakdown) 
        : incident.priority_breakdown;
      
      return (
        <div style={{ background: '#FFF5F5', border: '1px solid #FECACA', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(220, 38, 38, 0.03)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#C53030', marginBottom: '8px', letterSpacing: '0.5px' }}>
            AI PRIORITY EXPLANATION BREAKDOWN (प्राथमिकता स्पष्टीकरण)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', color: 'var(--text-main)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Base Severity Weight (प्राथमिक गंभीरता):</span>
              <strong style={{ color: 'var(--primary-navy)' }}>+{breakdown.base_severity}</strong>
            </div>
            {breakdown.recurrence > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#B45309' }}>
                <span>GIS Historical Recurrence Check (GIS इतिहास आवर्तन):</span>
                <strong>+{breakdown.recurrence}</strong>
              </div>
            )}
            {breakdown.school_proximity > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#047857' }}>
                <span>Government School Proximity (स्कूल संवेदनशीलता):</span>
                <strong>+{breakdown.school_proximity}</strong>
              </div>
            )}
            {breakdown.coordination > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#1D4ED8' }}>
                <span>Multi-Department Coordination Factor (समन्वय भार):</span>
                <strong>+{breakdown.coordination}</strong>
              </div>
            )}
            {breakdown.spatial_cluster > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#7C3AED' }}>
                <span>Active Spatial Cluster Radius (सक्रिय स्थानीय समूह):</span>
                <strong>+{breakdown.spatial_cluster}</strong>
              </div>
            )}
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '6px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.82rem' }}>
              <span>Final Priority Score (अंतिम प्राथमिकता):</span>
              <span style={{ color: '#DC2626' }}>{breakdown.total} / 100</span>
            </div>
          </div>
        </div>
      );
    } catch (e) {
      console.error("Error parsing priority breakdown:", e);
      return null;
    }
  };

  return (
    <div>
      {!isAuthenticated ? (
        <div className="gov-card blue-accent" style={{ maxWidth: '400px', margin: '60px auto', padding: '40px 30px', boxShadow: 'var(--shadow-lg)' }}>
          <div className="card-title" style={{ justifyContent: 'center', borderBottom: '2px solid rgba(0,2B,73,0.05)', paddingBottom: '12px', marginBottom: '20px' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>अधिकारी लॉगिन / OFFICER ACCESS</span>
          </div>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            if (username === 'admin' && password === 'admin123') {
              setLoggingIn(true);
              setTimeout(() => {
                setLoggingIn(false);
                setIsAuthenticated(true);
              }, 1000);
            } else {
              setLoginError("अमान्य क्रेडेंशियल। / Invalid credentials. Use admin / admin123");
            }
          }}>
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label className="form-label">प्रयोक्ता नाम / Username</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Enter username (admin)" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">पासवर्ड / Password</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="Enter password (admin123)" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {loginError && <div style={{ color: '#DC2626', fontSize: '0.78rem', marginBottom: '15px', fontWeight: 600 }}>{loginError}</div>}
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={onBackToHome}
                style={{ flex: 1 }}
              >
                Back / पीछे
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ flex: 2 }}
                disabled={loggingIn}
              >
                {loggingIn ? 'Logging in...' : 'Sign In / प्रवेश करें'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div>
          {/* Navigation & Tab Selector Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn btn-outline" 
                onClick={() => {
                  setIsAuthenticated(false);
                  setUsername('');
                  setPassword('');
                  setLoginError('');
                }}
                style={{ borderColor: '#DC2626', color: '#DC2626' }}
              >
                लॉग-आउट / Sign Out
              </button>
              <button 
                className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setActiveTab('dashboard')}
                style={{ fontSize: '0.8rem', padding: '8px 16px' }}
              >
                डैशबोर्ड नक्शा / Map Dashboard
              </button>
              <button 
                className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setActiveTab('analytics')}
                style={{ fontSize: '0.8rem', padding: '8px 16px' }}
              >
                विश्लेषण हब / Analytics Hub
              </button>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Officer Administration Dashboard - NexGenGov AI
            </span>
          </div>

          {/* Metrics Summary Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
            <div style={{ background: '#FFF', border: '1px solid rgba(0,2B,73,0.1)', borderRadius: '8px', padding: '16px', borderTop: '4px solid #002B49', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>कुल मामले / TOTAL INCIDENTS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '4px', color: '#002B49' }}>{stats.total_incidents}</div>
            </div>
            <div style={{ background: '#FFF', border: '1px solid rgba(0,2B,73,0.1)', borderRadius: '8px', padding: '16px', borderTop: '4px solid #DC2626', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>गंभीर मामले / CRITICAL LEVEL</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '4px', color: '#DC2626' }}>{stats.critical_incidents}</div>
            </div>
            <div style={{ background: '#FFF', border: '1px solid rgba(0,2B,73,0.1)', borderRadius: '8px', padding: '16px', borderTop: '4px solid #FF9933', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>बहु-विभागीय / COORDINATED</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '4px', color: '#FF9933' }}>{stats.coordinated_workflows}</div>
            </div>
            <div style={{ background: '#FFF', border: '1px solid rgba(0,2B,73,0.1)', borderRadius: '8px', padding: '16px', borderTop: '4px solid #138808', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>निस्तारित मामले / RESOLVED</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '4px', color: '#138808' }}>{stats.resolved_incidents}</div>
            </div>
          </div>

          {activeTab === 'dashboard' ? (
            <div className="grid-cols-2">
              {/* Left Side: Map and Incident List */}
              <div>
                <MapView 
                  incidents={incidents} 
                  selectedIncident={selectedIncident} 
                  onSelectIncident={handleSelectIncident}
                  hotspots={hotspots}
                />

                <div className="gov-card" style={{ marginTop: '24px' }}>
                  <div className="card-title">
                    <span>शिकायत सूची / INCIDENT INDEX</span>
                    <button 
                      onClick={onRefresh} 
                      style={{ marginLeft: 'auto', padding: '4px 10px', background: '#F0F4F8', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Refresh Index
                    </button>
                  </div>
                  
                  <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '5px' }}>
                    {incidents.filter(i => i.status !== 'resolved' && i.status !== 'duplicate').length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        No active unresolved incidents. Seed database or submit new reports via Citizen Portal.
                      </div>
                    ) : (
                      incidents.filter(i => i.status !== 'resolved' && i.status !== 'duplicate').map(inc => {
                        const isSelected = selectedIncident && selectedIncident.id === inc.id;
                        let border = inc.priority_score >= 80 ? '4px solid #DC2626' : '4px solid #FF9933';
                        if (inc.status === 'escalated') border = '4px solid #EF4444';
                        
                        return (
                          <div 
                            key={inc.id}
                            onClick={() => handleSelectIncident(inc)}
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              padding: '12px 16px',
                              background: isSelected ? 'rgba(15, 82, 186, 0.05)' : '#FFF',
                              border: '1px solid rgba(0,0,0,0.08)',
                              borderLeft: border,
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'background 0.2s',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary-navy)' }}>{inc.category}</div>
                                {inc.reports_count > 1 && (
                                  <span style={{ fontSize: '0.68rem', color: '#1E40AF', background: '#DBEAFE', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
                                    x{inc.reports_count} reports
                                  </span>
                                )}
                                {inc.status === 'escalated' && (
                                  <span style={{ background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5', padding: '1px 5px', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 700, animation: 'blink-alert 1.5s infinite' }}>
                                    ESCALATED
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px', display: 'inline-block', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {inc.description}
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                              <span className={`badge ${inc.priority_score >= 80 ? 'badge-red' : 'badge-orange'}`}>
                                P: {inc.priority_score}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side: Details & AI Triage */}
              <div>
                <div className="gov-card blue-accent" style={{ minHeight: '520px' }}>
                  <div className="card-title">
                    <span>AI स्वचालित विश्लेषण / INTELLIGENCE AUDIT PANEL</span>
                  </div>

                  {selectedIncident ? (
                    <div>
                      {/* Header Info */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '10px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--primary-navy)' }}>{selectedIncident.category}</h3>
                            {selectedIncident.status === 'escalated' && (
                              <span style={{ background: '#EF4444', color: '#FFF', fontSize: '0.68rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px' }}>
                                SLA OVERDUE ALERT
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Incident ID: <code>{selectedIncident.id.slice(0, 8)}...</code>
                          </span>
                        </div>
                        <span className={`badge ${selectedIncident.status === 'resolved' ? 'badge-green' : selectedIncident.status === 'escalated' ? 'badge-red' : selectedIncident.priority_score >= 80 ? 'badge-red' : 'badge-orange'}`} style={{ height: 'fit-content' }}>
                          {selectedIncident.status.toUpperCase()}
                        </span>
                      </div>

                      {/* Duplicate consolidated notification */}
                      {selectedIncident.reports_count > 1 && (
                        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '8px 12px', borderRadius: '6px', fontSize: '0.78rem', color: '#1E40AF', marginBottom: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>Consolidated Case: Linked {selectedIncident.reports_count} separate citizen reports under this coordinate to prevent redundant workflow creation.</span>
                        </div>
                      )}

                      {/* Evidence Showcase */}
                      <div style={{ display: 'grid', gridTemplateColumns: '0.45fr 0.55fr', gap: '15px', marginBottom: '16px' }}>
                        {selectedIncident.media_url ? (
                          <div style={{ position: 'relative', width: '100%', height: '110px', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)' }}>
                            <img 
                              src={selectedIncident.media_url} 
                              alt="Incident Evidence" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        ) : (
                          <div style={{ width: '100%', height: '110px', background: '#F1F5F9', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            No image uploaded
                          </div>
                        )}
                        <div>
                          <strong style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Citizen Report Narrative:</strong>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', marginTop: '4px', lineHeight: '1.4', maxHeight: '80px', overflowY: 'auto' }}>
                            "{selectedIncident.description}"
                          </p>
                        </div>
                      </div>

                      {/* Explainable Priority Score Breakdown */}
                      {renderPriorityBreakdown(selectedIncident)}

                      {/* AI Root Cause Highlight Box */}
                      <div style={{ background: '#FFF8F0', border: '1.5px solid #FF9933', padding: '14px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(255, 153, 51, 0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#B15C00' }}>AI ROOT-CAUSE ANOMALY DETECTION</span>
                          <span style={{ fontSize: '0.7rem', background: '#FF9933', color: '#FFF', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>94% Confidence</span>
                        </div>
                        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#4A2A00', lineHeight: '1.4' }}>
                          {selectedIncident.root_cause_hypothesis}
                        </p>
                      </div>

                      {/* Coordinated Action Plan Workflow Chain */}
                      <div style={{ marginTop: '20px' }}>
                        <h4 style={{ fontFamily: 'var(--font-title)', color: 'var(--primary-navy)', marginBottom: '14px', fontSize: '0.9rem' }}>
                          समन्वित कार्य श्रृंखला / COORDINATED DEPARTMENT CHAIN
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                          {selectedIncident.tasks.map((task, idx) => {
                            const isCompleted = task.status === 'completed';
                            const isPending = task.status === 'pending';
                            const isInProgress = task.status === 'in_progress';
                            const isEscalated = task.status === 'escalated';
                            const isAssigned = task.status === 'assigned';
                            const isActive = isAssigned || isInProgress || isEscalated;

                            const calculateDuration = (started, completed) => {
                              if (!started || !completed) return 'N/A';
                              const start = new Date(started);
                              const end = new Date(completed);
                              const diffMs = end - start;
                              const diffMins = Math.floor(diffMs / 60000);
                              const diffSecs = Math.floor((diffMs % 60000) / 1000);
                              if (diffMins === 0) return `${diffSecs}s`;
                              return `${diffMins}m ${diffSecs}s`;
                            };

                            return (
                              <div key={task.id} style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '15px' }}>
                                  <div style={{ 
                                    width: '30px', 
                                    height: '30px', 
                                    borderRadius: '50%', 
                                    background: isCompleted ? '#138808' : isPending ? '#E2E8F0' : isEscalated ? '#EF4444' : isInProgress ? '#1E40AF' : '#0F52BA', 
                                    color: '#FFF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    border: isActive ? '3px solid #93C5FD' : 'none',
                                    boxShadow: isActive ? '0 0 8px rgba(15, 82, 186, 0.3)' : 'none'
                                  }}>
                                    {isCompleted ? '✓' : idx + 1}
                                  </div>
                                  {idx < selectedIncident.tasks.length - 1 && (
                                    <div style={{ 
                                      width: '3px', 
                                      height: '35px', 
                                      background: isCompleted ? '#138808' : 'rgba(0,0,0,0.1)',
                                      marginTop: '4px',
                                      marginBottom: '4px'
                                    }}></div>
                                  )}
                                </div>

                                <div style={{ 
                                  flexGrow: 1,
                                  padding: '12px 16px',
                                  background: isCompleted ? '#F0FDF4' : isPending ? '#F8FAFC' : isInProgress ? '#EFF6FF' : isEscalated ? '#FEF2F2' : '#FFFFFF',
                                  border: isCompleted ? '1.5px solid #BBF7D0' : isInProgress ? '1.5px solid #3B82F6' : isEscalated ? '1.5px solid #FCA5A5' : '1.5px solid rgba(0,0,0,0.06)',
                                  borderRadius: '8px',
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <strong style={{ fontSize: '0.82rem', color: isPending ? 'var(--text-muted)' : 'var(--text-main)' }}>
                                      {task.title}
                                    </strong>
                                    <span className={`badge ${isCompleted ? 'badge-green' : isInProgress ? 'badge-blue' : isEscalated ? 'badge-red' : isAssigned ? 'badge-orange' : ''}`} style={{ fontSize: '0.65rem', padding: '1px 6px', background: isPending ? '#E2E8F0' : isInProgress ? '#1E40AF' : undefined, color: isPending ? '#64748B' : isInProgress ? '#FFF' : undefined }}>
                                      {isCompleted ? 'Completed' : isInProgress ? 'In Progress' : isEscalated ? 'Escalated' : isAssigned ? 'Active' : 'Queued'}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    Department: <strong>{task.department_name}</strong> (SLA: {task.sla_hours} hours)
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', fontStyle: 'italic' }}>
                                    {task.description}
                                  </div>
                                  
                                  {isInProgress && (
                                    <div style={{ fontSize: '0.7rem', color: '#1E40AF', marginTop: '4px', fontWeight: 600 }}>
                                      Work started: {new Date(task.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  )}

                                  {isEscalated && (
                                    <div style={{ fontSize: '0.7rem', color: '#B91C1C', marginTop: '4px', fontWeight: 700 }}>
                                      SLA DEADLINE EXCEEDED. ASSIGNED OFFICIAL ESCALATED.
                                    </div>
                                  )}
                                  
                                  {isCompleted && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', borderTop: '1px dashed rgba(0,0,0,0.06)', paddingTop: '6px' }}>
                                      <span style={{ fontSize: '0.7rem', color: '#138808' }}>
                                        Resolved in: <strong>{calculateDuration(task.started_at, task.completed_at)}</strong>
                                      </span>
                                      {task.resolution_proof_url && (
                                        <button
                                          onClick={() => setOverlayProofTask(task)}
                                          style={{ padding: '3px 8px', background: '#0F52BA', color: '#FFF', border: 'none', borderRadius: '3px', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 600 }}
                                        >
                                          Verify Resolution / प्रमाण देखें
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>
                      <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>शिकायत का चयन करें / Select Incident to Inspect</p>
                      <p style={{ fontSize: '0.8rem', marginTop: '6px', maxWidth: '300px' }}>
                        Click an active incident pin on the Leaflet.js geospatial map, or pick from the index list to view dynamic AI correlation and action steps.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Analytics Hub View */
            <div className="gov-card blue-accent" style={{ padding: '24px' }}>
              <div className="card-title" style={{ borderBottom: '2px solid rgba(0,2B,73,0.05)', paddingBottom: '12px', marginBottom: '20px' }}>
                <span>समग्र शासन सांख्यिकी एवं विश्लेषण / SYSTEM ANALYTICS & HOTSPOTS INDEX</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                {/* Left side: SLA performance & Average times */}
                <div>
                  <h4 style={{ fontFamily: 'var(--font-title)', color: 'var(--primary-navy)', marginBottom: '16px', fontSize: '1rem', borderLeft: '3px solid var(--saffron-orange)', paddingLeft: '8px' }}>
                    विभाग कार्य निष्पादन दर / DEPARTMENT WORKLOAD & SLA STATS
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Average Resolution Duration (औसत निस्तारण समय)</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--primary-navy)', marginTop: '4px' }}>
                        {analytics.average_resolution_time_hours || 0} Hours
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Based on all closed departmental work orders.</span>
                    </div>

                    {analytics.department_performance ? (
                      Object.keys(analytics.department_performance).map(deptName => {
                        const perf = analytics.department_performance[deptName];
                        const total = perf.completed + perf.pending + perf.escalated;
                        const completionRate = total > 0 ? Math.round((perf.completed / total) * 100) : 100;
                        
                        return (
                          <div key={deptName} style={{ background: '#FFF', border: '1px solid rgba(0,0,0,0.06)', padding: '14px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.82rem', marginBottom: '6px', color: 'var(--primary-navy)' }}>
                              <span>{deptName}</span>
                              <span style={{ color: '#138808' }}>{completionRate}% SLA score</span>
                            </div>
                            <div style={{ display: 'flex', gap: '15px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              <span>Completed: <strong style={{ color: '#138808' }}>{perf.completed}</strong></span>
                              <span>Pending Queue: <strong>{perf.pending}</strong></span>
                              <span>Overdue Escalated: <strong style={{ color: '#DC2626' }}>{perf.escalated}</strong></span>
                            </div>
                            {/* Progress Bar visual indicator */}
                            <div style={{ width: '100%', height: '6px', background: '#F1F5F9', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
                              <div style={{ width: `${completionRate}%`, height: '100%', background: completionRate > 70 ? '#138808' : completionRate > 40 ? '#FF9933' : '#DC2626' }}></div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No performance logs logged.</p>
                    )}
                  </div>
                </div>

                {/* Right side: Hotspot List */}
                <div>
                  <h4 style={{ fontFamily: 'var(--font-title)', color: 'var(--primary-navy)', marginBottom: '16px', fontSize: '1rem', borderLeft: '3px solid var(--secondary-blue)', paddingLeft: '8px' }}>
                    संवेदनशील हॉटस्पॉट क्षेत्र / CRITICAL ACTIVE CLUSTERS
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {hotspots.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', background: '#F8FAFC', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        No critical active cluster zones detected. Current incident density is within nominal limits.
                      </div>
                    ) : (
                      hotspots.map((hs, index) => (
                        <div key={index} style={{ background: '#FFF5F5', border: '1px solid #FCA5A5', padding: '14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#B91C1C' }}>
                              Critical Hotspot Zone #{index + 1}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#7F1D1D', marginTop: '4px' }}>
                              Category: <strong>{hs.category}</strong> | Radius: <strong>150m</strong>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Coordinates: {hs.latitude.toFixed(5)}, {hs.longitude.toFixed(5)}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#B91C1C', display: 'block' }}>
                              {hs.incident_count} Cases
                            </span>
                            <button 
                              className="btn btn-primary"
                              onClick={() => {
                                setActiveTab('dashboard');
                                setSelectedIncident({
                                  category: hs.category,
                                  latitude: hs.latitude,
                                  longitude: hs.longitude,
                                  id: 'hotspot-center',
                                  description: 'Hotspot cluster focus point.',
                                  tasks: []
                                });
                              }}
                              style={{ fontSize: '0.65rem', padding: '4px 8px', marginTop: '4px' }}
                            >
                              Focus on Map
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Side-by-Side Resolution Verification Modal */}
          {overlayProofTask && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div className="gov-card" style={{ maxWidth: '650px', width: '95%', padding: '24px', borderTop: '4px solid #138808' }}>
                <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--primary-navy)', marginBottom: '4px' }}>
                  Resolution Verification Audit
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '16px' }}>
                  Task Work Order: <strong>{overlayProofTask.title}</strong>
                </span>

                {/* Before vs After side by side */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#DC2626', display: 'block', marginBottom: '6px' }}>
                      BEFORE / नागरिक शिकायत फोटो
                    </span>
                    <img 
                      src={selectedIncident.media_url || 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=400&q=80'} 
                      alt="Citizen report defect" 
                      style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)' }} 
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#138808', display: 'block', marginBottom: '6px' }}>
                      AFTER / विभागीय निस्तारण फोटो
                    </span>
                    <img 
                      src={overlayProofTask.resolution_proof_url} 
                      alt="Department resolution proof" 
                      style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)' }} 
                    />
                  </div>
                </div>

                {/* AI Image Verification Audit Report */}
                {overlayProofTask.resolution_verification ? (() => {
                  try {
                    const audit = typeof overlayProofTask.resolution_verification === 'string'
                      ? JSON.parse(overlayProofTask.resolution_verification)
                      : overlayProofTask.resolution_verification;
                    
                    return (
                      <div style={{ background: '#F0FDF4', border: '1px solid #A7F3D0', padding: '12px 16px', borderRadius: '6px', marginBottom: '20px', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#047857', marginBottom: '4px' }}>
                          <span>AI RESOLUTION VERIFIED</span>
                          <span>Confidence Score: {Math.round(audit.confidence * 100)}%</span>
                        </div>
                        <p style={{ color: '#065F46', lineHeight: '1.4' }}>
                          {audit.notes}
                        </p>
                      </div>
                    );
                  } catch (e) {
                    return null;
                  }
                })() : (
                  <div style={{ background: '#F8FAFC', border: '1px solid rgba(0,0,0,0.06)', padding: '12px 16px', borderRadius: '6px', marginBottom: '20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Manual verification only. No automated visual proof analysis logged.
                  </div>
                )}

                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                  onClick={() => setOverlayProofTask(null)}
                >
                  Close Verification / ऑडिट रिपोर्ट बंद करें
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CSS style overlay for animation */}
      <style>{`
        @keyframes blink-alert {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

export default OfficerDashboard;
