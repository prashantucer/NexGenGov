import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const DepartmentPortal = ({ incidents, onRefresh, onBackToHome, onAddNotification }) => {
  const [selectedDept, setSelectedDept] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  
  // Passcode states
  const [passcode, setPasscode] = useState('');
  const [loginError, setLoginError] = useState('');

  // Resolution proof states (maps taskId -> base64 string)
  const [proofs, setProofs] = useState({});
  const [showProofModal, setShowProofModal] = useState(null); // stores task object to show in modal

  const handleLogin = (e) => {
    e.preventDefault();
    if (!selectedDept) {
      alert('कृपया विभाग का चयन करें / Please select a department.');
      return;
    }
    
    const validPasscodes = {
      'Public Works Department': 'pwd2026',
      'Water Supply & Sewerage Department': 'water2026',
      'Municipal Sanitation Department': 'sanitation2026',
      'Electricity & Street Lighting Department': 'power2026',
      'Horticulture & Urban Parks Department': 'parks2026',
      'Traffic & Road Safety Department': 'traffic2026',
      'Public Health & Vector Control Department': 'health2026',
      'Disaster Management & Flood Control': 'disaster2026'
    };
    
    if (passcode === validPasscodes[selectedDept] || passcode === 'admin2026' || passcode === '1234') {
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError(`गलत पासकोड। डेमो पासकोड: ${validPasscodes[selectedDept] || 'admin2026'} / 1234`);
    }
  };


  const handleUpdateStatus = async (taskId, nextStatus, proofImg = null) => {
    setUpdatingTaskId(taskId);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: nextStatus,
          resolution_proof: proofImg 
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update task');
      }
      
      if (onAddNotification) {
        if (nextStatus === 'in_progress') {
          onAddNotification({
            type: 'SMS',
            recipient: 'Citizen',
            message: `Update: Work has officially started on your grievance (Task ID: ${taskId.slice(0, 8)}) by the assigned departmental crew.`
          });
        } else if (nextStatus === 'completed') {
          onAddNotification({
            type: 'SMS',
            recipient: 'Citizen',
            message: `Good News! Your grievance (Task ID: ${taskId.slice(0, 8)}) has been marked as RESOLVED by the department. Visual audit verification has been sent to NGIS Commissioner.`
          });
        }
      }
      
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error(error);
      alert('Error updating task. Make sure backend is running.');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleFileChange = (taskId, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofs(prev => ({
          ...prev,
          [taskId]: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const seedDemoProof = (taskId, type) => {
    // High-resolution clean repaired state presets for presentation ease
    let demoUrl = 'https://images.unsplash.com/photo-1594913785172-e6a82c650e93?auto=format&fit=crop&w=400&q=80'; // Clean new asphalt road
    if (type === 'pipeline') {
      demoUrl = 'https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?auto=format&fit=crop&w=400&q=80'; // Industrial machinery repairs
    }
    setProofs(prev => ({
      ...prev,
      [taskId]: demoUrl
    }));
  };

  // Filter tasks assigned to this department
  const getDeptTasks = () => {
    const deptTasks = [];
    incidents.forEach(inc => {
      inc.tasks.forEach(task => {
        if (task.department_name === selectedDept) {
          deptTasks.push({
            ...task,
            incident_desc: inc.description,
            incident_status: inc.status,
            latitude: inc.latitude,
            longitude: inc.longitude
          });
        }
      });
    });
    return deptTasks;
  };

  const deptTasks = isLoggedIn ? getDeptTasks() : [];
  const totalTasks = deptTasks.length;
  const activeTasks = deptTasks.filter(t => t.status === 'assigned' || t.status === 'in_progress').length;
  const completedTasks = deptTasks.filter(t => t.status === 'completed').length;
  const queuedTasks = deptTasks.filter(t => t.status === 'pending').length;

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
  const renderSLACounter = (task) => {
    if (task.status === 'completed' || task.status === 'pending') return null;
    
    const deadline = new Date(task.escalation_deadline);
    const now = new Date();
    const diffMs = deadline - now;
    const isOverdue = diffMs <= 0 || task.status === 'escalated';
    
    if (isOverdue) {
      return (
        <div style={{ marginTop: '5px' }}>
          <span style={{ 
            background: '#FEE2E2', 
            color: '#991B1B', 
            border: '1px solid #FCA5A5', 
            fontSize: '0.68rem', 
            padding: '2px 6px', 
            borderRadius: '3px',
            fontWeight: 700,
            display: 'inline-block' 
          }}>
            OVERDUE / समय सीमा समाप्त
          </span>
        </div>
      );
    }
    
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);
    
    let badgeColor = '#065F46';
    let bgColor = '#D1FAE5';
    let borderColor = '#A7F3D0';
    
    if (diffHrs < 12) {
      badgeColor = '#92400E';
      bgColor = '#FEF3C7';
      borderColor = '#FDE68A';
    }
    
    return (
      <div style={{ marginTop: '5px' }}>
        <span style={{ 
          background: bgColor, 
          color: badgeColor, 
          border: `1px solid ${borderColor}`, 
          fontSize: '0.68rem', 
          padding: '2px 6px', 
          borderRadius: '3px',
          fontWeight: 700,
          display: 'inline-block' 
        }}>
          SLA: {diffHrs}h {diffMins}m remaining
        </span>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Navigation Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button className="btn btn-outline" onClick={onBackToHome}>
          मुख्य पृष्ठ / Back to Portal Home
        </button>
        {isLoggedIn && (
          <button 
            className="btn btn-outline" 
            style={{ borderColor: '#DC2626', color: '#DC2626' }} 
            onClick={() => {
              setIsLoggedIn(false);
              setPasscode('');
              setLoginError('');
            }}
          >
            विभाग बदलें / Change Department
          </button>
        )}
      </div>

      {!isLoggedIn ? (
        <div className="gov-card saffron-accent" style={{ maxWidth: '500px', margin: '40px auto', padding: '40px 30px' }}>
          <div className="card-title" style={{ justifyContent: 'center' }}>
            <span>विभागीय लॉग-इन / DEPARTMENTAL SIGN-IN</span>
          </div>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">लॉग-इन करने के लिए विभाग चुनें / Select Department</label>
              <select 
                className="form-select"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                required
              >
                <option value="">-- विभाग चुनें / Select Department --</option>
                <option value="Public Works Department">Public Works Department (PWD - Roads/Bridges)</option>
                <option value="Water Supply & Sewerage Department">Water Supply & Sewerage Department (Jal Board)</option>
                <option value="Municipal Sanitation Department">Municipal Sanitation Department (Swachhata/Waste)</option>
                <option value="Electricity & Street Lighting Department">Electricity & Street Lighting Department</option>
                <option value="Horticulture & Urban Parks Department">Horticulture & Urban Parks Department</option>
                <option value="Traffic & Road Safety Department">Traffic & Road Safety Department</option>
                <option value="Public Health & Vector Control Department">Public Health & Vector Control Department</option>
                <option value="Disaster Management & Flood Control">Disaster Management & Flood Control</option>
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '15px' }}>
              <label className="form-label">पासकोड / Enter Department Passcode *</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="Enter passcode or use 1234"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                required
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                Quick Demo: Enter code <code>1234</code> or <code>admin2026</code> to log in to any department.
              </span>
            </div>
            {loginError && <div style={{ color: '#DC2626', fontSize: '0.78rem', marginTop: '10px', fontWeight: 600 }}>{loginError}</div>}


            <button type="submit" className="btn btn-saffron" style={{ width: '100%', marginTop: '20px' }}>
              लॉग-इन करें / Authenticate Portal
            </button>
          </form>
        </div>
      ) : (
        <div>
          {/* Department Header Info */}
          <div className="gov-card" style={{ background: 'var(--primary-navy)', color: '#FFF', padding: '20px 30px' }}>
            <h2 style={{ fontFamily: 'var(--font-title)', color: '#FF9933', fontSize: '1.6rem' }}>
              {selectedDept}
            </h2>
            <p style={{ opacity: 0.8, fontSize: '0.85rem', marginTop: '4px' }}>
              Official Departmental Work Order queue. Manage task execution and SLA completion workflows.
            </p>
          </div>

          {/* Department Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
            <div style={{ background: '#FFF', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '16px', borderTop: '4px solid #002B49' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Assigned Tasks</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '4px', color: '#002B49' }}>{totalTasks}</div>
            </div>
            <div style={{ background: '#FFF', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '16px', borderTop: '4px solid #FF9933' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Active Tasks</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '4px', color: '#FF9933' }}>{activeTasks}</div>
            </div>
            <div style={{ background: '#FFF', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '16px', borderTop: '4px solid #94A3B8' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Blocked / Queued</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '4px', color: '#94A3B8' }}>{queuedTasks}</div>
            </div>
            <div style={{ background: '#FFF', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '16px', borderTop: '4px solid #138808' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Completed Tasks</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '4px', color: '#138808' }}>{completedTasks}</div>
            </div>
          </div>

          {/* Department Tasks Table */}
          <div className="gov-card">
            <div className="card-title">
              <span>कार्य आदेश सूची / ASSIGNED WORK ORDERS</span>
              <button 
                onClick={onRefresh} 
                style={{ marginLeft: 'auto', padding: '4px 10px', background: '#F0F4F8', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
              >
                Refresh Queue
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: '2px solid rgba(0,0,0,0.1)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 700, width: '25%' }}>Task Title & Detail</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, width: '25%' }}>Incident Narrative</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, width: '15%' }}>Location</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, width: '15%' }}>Status</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, width: '20%', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {deptTasks.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No work orders assigned to this department.
                      </td>
                    </tr>
                  ) : (
                    deptTasks.map(task => {
                      const proofPreview = proofs[task.id] || null;
                      
                      return (
                        <tr key={task.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                          <td style={{ padding: '16px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--primary-navy)' }}>{task.title}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{task.description}</div>
                          </td>
                          <td style={{ padding: '16px', color: 'var(--text-main)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            "{task.incident_desc}"
                          </td>
                          <td style={{ padding: '16px', color: 'var(--text-muted)' }}>
                            {task.latitude.toFixed(4)}, {task.longitude.toFixed(4)}
                          </td>
                          <td style={{ padding: '16px' }}>
                            {task.status === 'completed' && (
                              <div>
                                <span className="badge badge-green">Completed</span>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                  Took: {calculateDuration(task.started_at, task.completed_at)}
                                </div>
                              </div>
                            )}
                            {task.status === 'in_progress' && (
                              <div>
                                <span className="badge" style={{ background: '#DBEAFE', color: '#1E40AF', border: '1px solid #BFDBFE' }}>
                                  In Progress
                                </span>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                  Started: {new Date(task.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            )}
                            {task.status === 'assigned' && (
                              <span className="badge badge-orange">Active</span>
                            )}
                            {task.status === 'escalated' && (
                              <span className="badge" style={{ background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5' }}>
                                Escalated
                              </span>
                            )}
                            {task.status === 'pending' && (
                              <span className="badge" style={{ background: '#E2E8F0', color: '#64748B', border: '1px solid #CBD5E1' }}>
                                Queued (Locked)
                              </span>
                            )}
                            {renderSLACounter(task)}
                          </td>
                          <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                            {/* ASSIGNED/ESCALATED STATE: Pick up task */}
                            {(task.status === 'assigned' || task.status === 'escalated') && (
                              <div style={{ textAlign: 'center' }}>
                                <button
                                  onClick={() => handleUpdateStatus(task.id, 'in_progress')}
                                  disabled={updatingTaskId !== null}
                                  className="btn btn-primary"
                                  style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '4px', width: '100%' }}
                                >
                                  {updatingTaskId === task.id ? 'Loading...' : 'Start Work / कार्य प्रारंभ करें'}
                                </button>
                              </div>
                            )}

                            {/* IN_PROGRESS STATE: Upload Proof & Complete */}
                            {task.status === 'in_progress' && (
                              <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.06)' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, display: 'block', marginBottom: '6px', color: 'var(--primary-navy)' }}>
                                  RESOLUTION PROOF (तस्वीर प्रमाण)
                                </label>
                                
                                <input 
                                  type="file" 
                                  accept="image/*"
                                  style={{ fontSize: '0.7rem', width: '100%', marginBottom: '6px' }}
                                  onChange={(e) => handleFileChange(task.id, e)}
                                />
                                
                                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                                  <button
                                    type="button"
                                    onClick={() => seedDemoProof(task.id, selectedDept.toLowerCase().includes('water') ? 'pipeline' : 'road')}
                                    style={{ fontSize: '0.65rem', background: '#F0F4F8', border: '1px solid #CBD5E1', padding: '3px 6px', borderRadius: '3px', cursor: 'pointer' }}
                                  >
                                    Demo Photo (ऑटो-फिल)
                                  </button>
                                </div>

                                {proofPreview && (
                                  <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                                    <img 
                                      src={proofPreview} 
                                      alt="Proof Preview" 
                                      style={{ width: '100%', maxHeight: '60px', objectFit: 'cover', borderRadius: '4px' }} 
                                    />
                                  </div>
                                )}

                                <button
                                  onClick={() => handleUpdateStatus(task.id, 'completed', proofPreview)}
                                  disabled={updatingTaskId !== null || !proofPreview}
                                  className="btn btn-green"
                                  style={{ padding: '6px 10px', fontSize: '0.7rem', borderRadius: '4px', width: '100%' }}
                                >
                                  {updatingTaskId === task.id ? 'Submitting...' : 'Resolve Task / कार्य समाप्त करें'}
                                </button>
                              </div>
                            )}

                            {/* BLOCKED/PENDING STATE */}
                            {task.status === 'pending' && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                                Blocked by pipeline repair
                              </div>
                            )}

                            {/* COMPLETED STATE: View Proof Photo */}
                            {task.status === 'completed' && (
                              <div style={{ textAlign: 'center' }}>
                                <span style={{ color: '#138808', fontWeight: 600, display: 'block', fontSize: '0.8rem' }}>✓ Work Logged</span>
                                {task.resolution_proof_url && (
                                  <button
                                    onClick={() => setShowProofModal(task)}
                                    style={{ marginTop: '6px', padding: '3px 8px', background: '#0F52BA', color: '#FFF', border: 'none', borderRadius: '3px', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 600 }}
                                  >
                                    View Proof / प्रमाण देखें
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Proof Viewer Overlay Modal */}
      {showProofModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="gov-card" style={{ maxWidth: '400px', width: '90%', padding: '20px', borderTop: '4px solid #138808' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--primary-navy)', marginBottom: '12px' }}>
              Resolution Evidence Proof
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Task: <strong>{showProofModal.title}</strong><br />
              Resolved by: <strong>{showProofModal.department_name}</strong>
            </p>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <img 
                src={showProofModal.resolution_proof_url} 
                alt="Evidence snapshot" 
                style={{ width: '100%', maxHeight: '250px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)' }} 
              />
            </div>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%' }}
              onClick={() => setShowProofModal(null)}
            >
              Close Overlay / बंद करें
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentPortal;
